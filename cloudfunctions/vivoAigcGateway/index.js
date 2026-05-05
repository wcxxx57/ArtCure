// vivo AIGC 能力统一网关
// 说明：优先读取云函数环境变量；本地/上传演示可使用同目录 config.local.js。

const cloud = require('wx-server-sdk')
const https = require('https')
const localConfig = loadLocalConfig()

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const JIUWEN_BASE_URL = (getConfigValue('JIUWEN_BASE_URL') || 'https://jiuwen.vivo.com.cn/v1').replace(/\/$/, '')
const JIUWEN_CHAT_MESSAGES_PATH = getConfigValue('JIUWEN_CHAT_MESSAGES_PATH') || '/chat-messages'
const JIUWEN_MEDIA_UPLOAD_PATH = getConfigValue('JIUWEN_MEDIA_UPLOAD_PATH') || '/files/media-upload'
const VIVO_POI_BASE_URL = 'https://api-ai.vivo.com.cn'
const DEFAULT_CHAT_MODEL = getConfigValue('JIUWEN_MODEL') || getConfigValue('VIVO_CHAT_MODEL') || 'Volc-DeepSeek-V3.2'
const DEFAULT_VISION_MODEL = getConfigValue('JIUWEN_VISION_MODEL') || getConfigValue('JIUWEN_MODEL') || getConfigValue('VIVO_VISION_MODEL') || DEFAULT_CHAT_MODEL

exports.main = async (event = {}, context) => {
  const { action, data = {} } = event

  try {
    switch (action) {
      case 'chat.complete':
        return await completeChat(data)
      case 'artwork.analyze':
        return await analyzeArtwork(data)
      case 'resource.recommend':
        return await recommendResources(data)
      case 'voice.asrShort':
        return mockVoiceTranscription(data)
      case 'voice.tts':
        return mockTts(data)
      default:
        return {
          success: false,
          code: 'UNKNOWN_ACTION',
          message: `未知操作: ${action}`
        }
    }
  } catch (error) {
    console.error('[vivoAigcGateway] error:', error)
    return {
      success: false,
      code: 'GATEWAY_ERROR',
      message: error.message || 'vivo AIGC 网关调用失败'
    }
  }
}

async function completeChat(data) {
  const { scene = 'companion', messages = [], prompt = '' } = data

  if (!hasJiuwenKey()) {
    return {
      success: true,
      source: 'mock',
      reply: buildMockChatReply(scene, prompt || lastUserMessage(messages)),
      audioText: buildGuideText(scene, prompt || lastUserMessage(messages))
    }
  }

  const systemPrompt = buildSystemPrompt(scene)
  const vivoMessages = [
    { role: 'system', content: systemPrompt },
    ...normalizeMessages(messages, prompt)
  ]

  const reply = await callVivoChat(vivoMessages, {
    temperature: 0.6,
    max_tokens: 1200
  })

  return {
    success: true,
    source: 'vivo',
    reply,
    audioText: buildGuideText(scene, reply)
  }
}

async function analyzeArtwork(data) {
  const { fileID, imageUrl, prompt = '', sourceType = 'canvas' } = data

  console.log('[artwork.analyze] start', {
    hasFileID: Boolean(fileID),
    hasImageUrl: Boolean(imageUrl),
    sourceType,
    promptLength: String(prompt || '').length
  })

  if (!hasJiuwenKey()) {
    throw new Error('缺少 JIUWEN_API_KEY：请在 vivoAigcGateway/config.local.js 或微信云函数环境变量中配置九问 API Key')
  }

  const resolvedImageUrl = imageUrl || await uploadCloudFileToJiuwen(fileID)
  console.log('[artwork.analyze] image ready for chat-messages', {
    imageUrl: maskUrl(resolvedImageUrl)
  })

  if (!resolvedImageUrl) {
    throw new Error(`没有可分析的图片：fileID=${fileID || '空'}，imageUrl=${imageUrl ? '已传入' : '空'}`)
  }

  const rawText = await callJiuwenChatMessages({
    imageUrl: resolvedImageUrl,
    prompt,
    sourceType
  })
  const result = normalizeArtworkResult(rawText)
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error(`九问返回内容无法解析为两个元素数组：${rawText || '空响应'}`)
  }

  console.log('[artwork.analyze] success', {
    source: 'jiuwen',
    rawTextLength: String(rawText || '').length,
    resultCount: result.length
  })

  return {
    success: true,
    source: 'jiuwen',
    result,
    rawText
  }
}

async function recommendResources(data) {
  const { city = '上海市', keyword = '艺术疗愈' } = data

  if (!hasVivoPoiKey()) {
    return {
      success: true,
      source: 'mock',
      reply: `我会先按「${city}、${keyword}、适合线下体验」来筛选。建议优先看距离可接受、价格透明、能明确说明疗愈方式的资源。`,
      pois: []
    }
  }

  const pois = await callVivoPoi({ city, keywords: keyword })

  return {
    success: true,
    source: 'vivo',
    reply: `已结合 vivo POI 搜索「${city} ${keyword}」得到 ${pois.length} 个地点线索，可继续和本地疗愈资源库匹配。`,
    pois
  }
}

function mockVoiceTranscription(data) {
  return {
    success: true,
    source: 'mock',
    text: data.fallbackText || '我刚录了一段心情语音，想先被听见，也想做一个简单的艺术疗愈练习。'
  }
}

function mockTts(data) {
  return {
    success: true,
    source: 'mock',
    audioUrl: '',
    text: data.text || '先慢慢吸气，再把今天的压力随着呼气放下来。'
  }
}

function hasJiuwenKey() {
  return Boolean(getJiuwenApiKey())
}

function hasVivoPoiKey() {
  return Boolean(getConfigValue('VIVO_APP_KEY'))
}

function getJiuwenApiKey() {
  return getConfigValue('JIUWEN_API_KEY') || getConfigValue('VIVO_APP_KEY') || ''
}

function getConfigValue(key) {
  return process.env[key] || localConfig[key] || ''
}

function loadLocalConfig() {
  try {
    return require('./config.local.js')
  } catch (error) {
    return {}
  }
}

function buildSystemPrompt(scene) {
  const shared = '你是“艺哟”，一个温暖、谨慎的艺术疗愈 AI 助手。你不能做心理诊断，不替代专业咨询。遇到严重危机内容时，提醒用户联系可信任的人或专业帮助。'

  const scenePrompts = {
    voice_companion: `${shared} 当前场景是语音陪伴：请先共情，再帮助用户做心情记录、情绪宣泄和一个 3 分钟以内的自主艺术疗愈动作。`,
    artwork_analysis: `${shared} 当前场景是绘画分析：请从画面观察和创作引导出发，避免武断解释。`,
    resource_location: `${shared} 当前场景是位置资源推荐：请根据地点、预算、疗愈方式给出具体选择建议。`
  }

  return scenePrompts[scene] || shared
}

function normalizeMessages(messages, prompt) {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages
      .filter(item => item && item.content)
      .map(item => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.content)
      }))
  }

  return [{ role: 'user', content: prompt || '我想做一次艺术疗愈练习。' }]
}

function lastUserMessage(messages) {
  if (!Array.isArray(messages)) return ''
  const reversed = [...messages].reverse()
  const item = reversed.find(msg => msg && msg.role !== 'assistant' && msg.content)
  return item ? item.content : ''
}

function buildMockChatReply(scene, userText) {
  if (scene === 'voice_companion') {
    return `我听见你了。你刚刚表达的重点是「${userText || '想被陪伴一下'}」。先不用急着把情绪讲清楚，我们可以把它当作一团颜色：闭上眼睛想 5 秒，它更像深蓝、灰色，还是一团很亮的红色？\n\n现在做一个很轻的练习：拿一张纸，画三条线。第一条代表现在的压力，第二条代表你希望拥有的边界，第三条代表今天可以给自己的一个小小出口。画完后，只需要给这三条线取一个名字。`
  }

  return '我会先陪你把感受放慢一点，再给你一个可以马上开始的艺术疗愈动作。'
}

function buildGuideText(scene, seed) {
  if (scene !== 'voice_companion') {
    return seed || ''
  }

  return '把注意力放到呼吸上。吸气时，想象你在纸上留下一点颜色；呼气时，把不需要立刻解决的事情先放到画面之外。现在给自己三分钟，只负责画，不负责解释。'
}

function normalizeArtworkResult(rawText) {
  const parsed = parseArtworkJson(rawText)
  if (parsed.length >= 2) {
    return parsed.slice(0, 2)
  }

  return []
}

function parseArtworkJson(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return []

  const candidates = [
    text,
    text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
    extractJsonArray(text)
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => {
            if (typeof item === 'string') return item.trim()
            if (item && typeof item === 'object') {
              return String(item.text || item.mood_observation || item.practice_suggestions || '').trim()
            }
            return ''
          })
          .filter(Boolean)
      }
    } catch (error) {
      // Try the next candidate.
    }
  }

  const quotedItems = extractQuotedArrayItems(text)
  if (quotedItems.length >= 2) {
    return quotedItems
  }

  return []
}

function extractJsonArray(text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return ''
  return text.slice(start, end + 1)
}

function extractQuotedArrayItems(text) {
  const arrayText = extractJsonArray(text)
  if (!arrayText) return []

  const items = []
  const pattern = /(['"])((?:\\.|(?!\1)[\s\S])*)\1/g
  let match
  while ((match = pattern.exec(arrayText)) !== null) {
    const value = match[2]
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .trim()
    if (value) items.push(value)
  }
  return items
}

async function uploadCloudFileToJiuwen(fileID) {
  console.log('[artwork.analyze] preparing media upload', {
    fileID
  })

  const file = await getCloudFileBuffer(fileID)
  console.log('[artwork.analyze] cloud file downloaded', {
    fileID,
    filename: file.filename,
    contentType: file.contentType,
    size: file.buffer.length
  })

  const uploadRes = await uploadJiuwenMedia(file)
  const mediaUrl = uploadRes.work_url || uploadRes.idc_url || uploadRes.url

  console.log('[artwork.analyze] jiuwen media-upload response', {
    success: uploadRes.success,
    contentType: uploadRes.content_type,
    hasWorkUrl: Boolean(uploadRes.work_url),
    hasIdcUrl: Boolean(uploadRes.idc_url),
    workUrl: maskUrl(uploadRes.work_url),
    idcUrl: maskUrl(uploadRes.idc_url),
    selectedUrl: maskUrl(mediaUrl)
  })

  if (!uploadRes.success || !mediaUrl) {
    throw new Error(`九问媒体上传失败：${JSON.stringify(uploadRes).slice(0, 1000)}`)
  }

  return mediaUrl
}

async function getCloudFileBuffer(fileID) {
  if (!fileID) return ''

  const result = await cloud.downloadFile({ fileID })
  const buffer = result.fileContent
  if (!buffer || !buffer.length) {
    throw new Error(`云存储图片下载失败：fileID=${fileID}`)
  }

  const contentType = detectImageMime(buffer)
  return {
    buffer,
    contentType,
    filename: `artwork.${contentType.split('/')[1] || 'jpg'}`
  }
}

function detectImageMime(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp'
  }
  return 'image/jpeg'
}

async function uploadJiuwenMedia(file) {
  return await requestMultipart({
    method: 'POST',
    url: `${JIUWEN_BASE_URL}${JIUWEN_MEDIA_UPLOAD_PATH}`,
    headers: {
      Authorization: `Bearer ${getJiuwenApiKey()}`
    },
    fields: {
      user: 'wechat-miniprogram-user'
    },
    file: {
      fieldName: 'file',
      filename: file.filename,
      contentType: file.contentType,
      buffer: file.buffer
    }
  })
}

async function callJiuwenChatMessages({ imageUrl, prompt, sourceType }) {
  const query = [
    '请分析这张用户绘画/手账/涂鸦图片。',
    `输入来源：${sourceType === 'upload' ? '用户上传图片' : '用户在线画板创作'}。`,
    `用户补充：${prompt || '无'}。`,
    '请只返回一个两个元素的数组，不要 Markdown，不要解释。',
    '第一个元素是一段 mood_observation：描述你观察到的颜色、线条、构图、元素和整体氛围。',
    '第二个元素是一段 practice_suggestions：给出一个 5 分钟以内、具体可执行的感官锚定或艺术疗愈练习。',
    '输出示例：["我观察到……", "你可以……"]'
  ].join('\n')

  console.log('[artwork.analyze] call chat-messages', {
    imageUrl: maskUrl(imageUrl),
    queryLength: query.length,
    sourceType
  })

  const response = await requestJson({
    method: 'POST',
    url: `${JIUWEN_BASE_URL}${JIUWEN_CHAT_MESSAGES_PATH}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${getJiuwenApiKey()}`
    },
    body: {
      inputs: {},
      query,
      user: 'wechat-miniprogram-user',
      response_mode: 'blocking',
      upload_mediums: [
        {
          url: imageUrl,
          type: 'image'
        }
      ]
    }
  })

  const answer = extractJiuwenAnswer(response)
  console.log('[artwork.analyze] chat-messages response', {
    responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
    hasAnswer: Boolean(answer),
    answerLength: String(answer || '').length
  })

  if (!answer) {
    throw new Error(`九问 chat-messages 返回中没有 answer 字段：${JSON.stringify(response).slice(0, 1000)}`)
  }
  return answer
}

function extractJiuwenAnswer(response) {
  return response?.answer ||
    response?.data?.answer ||
    response?.data?.outputs?.answer ||
    response?.data?.outputs?.text ||
    response?.outputs?.answer ||
    response?.outputs?.text ||
    ''
}

function maskUrl(url) {
  if (!url) return ''
  const text = String(url)
  if (text.length <= 120) return text
  return `${text.slice(0, 80)}...${text.slice(-32)}`
}

async function callVivoChat(messages, options = {}) {
  const requestId = createRequestId()
  const model = options.model || DEFAULT_CHAT_MODEL
  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.max_tokens || 1200,
    stream: false
  }

  const response = await requestJson({
    method: 'POST',
    url: `${JIUWEN_BASE_URL}/chat/completions?request_id=${encodeURIComponent(requestId)}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${getJiuwenApiKey()}`
    },
    body: payload
  })

  return response?.choices?.[0]?.message?.content || '我已经收到你的信息，但暂时没有生成有效回复。'
}

async function callVivoPoi({ city, keywords }) {
  const requestId = createRequestId()
  const query = new URLSearchParams({
    city,
    keywords,
    page_num: '1',
    page_size: '10',
    requestId
  })

  const response = await requestJson({
    method: 'GET',
    url: `${VIVO_POI_BASE_URL}/search/geo?${query.toString()}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VIVO_APP_KEY}`
    }
  })

  return Array.isArray(response?.pois) ? response.pois : []
}

function requestJson({ method, url, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const payload = body ? JSON.stringify(body) : ''

    const req = https.request({
      method,
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      headers: {
        ...headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      timeout: 30000
    }, (res) => {
      let raw = ''
      res.on('data', chunk => {
        raw += chunk
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`))
          return
        }

        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch (error) {
          reject(new Error(`vivo API JSON 解析失败: ${error.message}`))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('vivo API 请求超时'))
    })

    if (payload) {
      req.write(payload)
    }
    req.end()
  })
}

function requestMultipart({ method, url, headers = {}, fields = {}, file }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const boundary = `----ArtCure${Date.now()}${Math.random().toString(16).slice(2)}`
    const parts = []

    Object.keys(fields).forEach(key => {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
        `${fields[key]}\r\n`
      ))
    })

    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`
    ))
    parts.push(file.buffer)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const payload = Buffer.concat(parts)
    const req = https.request({
      method,
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
      },
      timeout: 30000
    }, (res) => {
      let raw = ''
      res.on('data', chunk => {
        raw += chunk
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`))
          return
        }

        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch (error) {
          reject(new Error(`multipart 响应 JSON 解析失败: ${error.message}; raw=${raw.slice(0, 1000)}`))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('multipart 请求超时'))
    })

    req.write(payload)
    req.end()
  })
}

function createRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0
    const finalValue = char === 'x' ? value : (value & 0x3 | 0x8)
    return finalValue.toString(16)
  })
}
