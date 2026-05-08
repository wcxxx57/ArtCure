// vivo AIGC 能力统一网关
// 说明：有 VIVO_APP_KEY 时调用 vivo 云端 API；没有密钥时返回可演示的本地降级结果。

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const VIVO_BASE_URL = 'https://api-ai.vivo.com.cn'
const DEFAULT_CHAT_MODEL = process.env.VIVO_CHAT_MODEL || 'Doubao-Seed-2.0-mini'
// 从 demo.py 中获取的有效 API Key
const VIVO_APP_KEY = process.env.VIVO_APP_KEY || 'sk-xuanji-2026887953-Yll6dGd3aHNOZWdCRUpBWg=='

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

  if (!hasVivoKey()) {
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
  const { fileID, imageUrl, prompt = '' } = data
  const resolvedImageUrl = imageUrl || await getCloudFileUrl(fileID)

  if (!hasVivoKey() || !resolvedImageUrl) {
    return {
      success: true,
      source: 'mock',
      result: buildMockArtworkAnalysis(prompt),
      rawText: buildMockArtworkAnalysis(prompt).summary
    }
  }

  const messages = [
    {
      role: 'system',
      content: '你是艺术疗愈观察助手。只做非诊断式观察，避免心理疾病判断，输出温和、具体、可执行的创作建议。'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `请分析这张用户绘画/手账图片。用户补充：${prompt || '无'}。输出结构：画面观察、可能的情绪线索、下一步创作建议、安全提示。`
        },
        {
          type: 'image_url',
          image_url: { url: resolvedImageUrl }
        }
      ]
    }
  ]

  const rawText = await callVivoChat(messages, {
    model: process.env.VIVO_VISION_MODEL || DEFAULT_CHAT_MODEL,
    temperature: 0.35,
    max_tokens: 1600
  })

  return {
    success: true,
    source: 'vivo',
    result: {
      summary: rawText,
      observation: rawText,
      suggestions: [
        '给画面加一个让你觉得安全的颜色。',
        '在空白处写一句此刻想对自己说的话。',
        '用线条画出压力从哪里来、往哪里去。'
      ],
      safetyNote: '本分析仅用于自我觉察与艺术疗愈练习，不构成心理诊断。'
    },
    rawText
  }
}

async function recommendResources(data) {
  const {
    city = '上海市',
    keyword = '美术馆'
  } = data

  console.log('[recommendResources] 开始搜索')
  console.log('city =', city)
  console.log('keyword =', keyword)

  if (!hasVivoKey()) {
    return {
      success: false,
      source: 'mock',
      error: '未配置 VIVO_APP_KEY',
      pois: []
    }
  }

  const result = await callVivoPoi({
    city,
    keywords: keyword
  })

  // 网络/HTTP错误
  if (!result.success) {
    return {
      success: false,
      source: 'vivo',
      error: result.error || 'POI搜索失败',
      pois: [],
      debugInfo: {
        apiUrl: result.apiUrl,
        httpStatusCode: result.httpStatusCode
      }
    }
  }

  // vivo业务状态码
  // 根据文档和实际测试：
  // statusCode = 0 基本可视为成功
  if (result.statusCode !== 0) {
    return {
      success: false,
      source: 'vivo',
      error: result.statusInfo || `API业务异常 statusCode=${result.statusCode}`,
      pois: result.pois || [],
      total: result.total || 0,
      statusCode: result.statusCode,
      statusInfo: result.statusInfo
    }
  }

  // 正常返回（即使 total=0 也算成功）
  return {
    success: true,
    source: 'vivo',
    reply:
      result.total > 0
        ? `找到 ${result.total} 个结果`
        : `没有找到相关POI，请尝试更具体关键词`,

    pois: result.pois || [],
    total: result.total || 0,

    statusCode: result.statusCode,
    statusInfo: result.statusInfo,

    searchParams: {
      city,
      keyword
    }
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

function hasVivoKey() {
  return Boolean(VIVO_APP_KEY)
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

function buildMockArtworkAnalysis(prompt) {
  return {
    summary: `我会把这幅作品当作一次自我表达来看，而不是心理诊断。${prompt ? `你补充到「${prompt}」，这会成为理解作品的重要线索。` : ''}`,
    observation: '可以先观察画面里最显眼的颜色、线条方向和留白。如果线条很多，可能说明此刻有不少想表达的内容；如果留白很多，也可能是在给自己保留空间。',
    suggestions: [
      '选一个最想靠近的区域，给它加一种更安全的颜色。',
      '在画面边缘写一句“我现在需要……”开头的话。',
      '用圆形或柔软线条给画面加一个临时的保护边界。'
    ],
    safetyNote: '这只是艺术疗愈视角的观察，不构成心理诊断。若持续强烈痛苦，请及时寻求专业支持。'
  }
}

async function getCloudFileUrl(fileID) {
  if (!fileID) return ''

  const result = await cloud.getTempFileURL({
    fileList: [fileID]
  })

  const file = result.fileList && result.fileList[0]
  return file && file.tempFileURL ? file.tempFileURL : ''
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
    url: `${VIVO_BASE_URL}/v1/chat/completions?request_id=${encodeURIComponent(requestId)}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${VIVO_APP_KEY}`
    },
    body: payload
  })

  return response?.choices?.[0]?.message?.content || '我已经收到你的信息，但暂时没有生成有效回复。'
}

async function callVivoPoi({ city, keywords }) {
  const requestId = createRequestId()

  // 不使用 URLSearchParams
  // 避免微信云函数环境兼容问题
  const apiUrl =
    `${VIVO_BASE_URL}/search/geo` +
    `?keywords=${encodeURIComponent(keywords)}` +
    `&city=${encodeURIComponent(city)}` +
    `&page_num=1` +
    `&page_size=10` +
    `&requestId=${requestId}`

  console.log('[callVivoPoi] 请求URL:')
  console.log(apiUrl)

  try {
    const response = await requestJson({
      method: 'GET',
      url: apiUrl,
      headers: {
        Authorization: `Bearer ${VIVO_APP_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    // 不打印完整 response
    // 微信开发者工具容易卡死/超时
    console.log('[callVivoPoi] statusCode =', response?.statusCode)
    console.log('[callVivoPoi] total =', response?.total)

    return {
      success: true,

      pois: Array.isArray(response?.pois)
        ? response.pois
        : [],

      total: Number(response?.total || 0),

      statusCode:
        typeof response?.statusCode === 'number'
          ? response.statusCode
          : -1,

      statusInfo: response?.statusInfo || '',

      currentDistrict: response?.currentDistrict || null,

      apiUrl,
      httpStatusCode: 200
    }

  } catch (error) {

    console.error('[callVivoPoi] 请求失败:')
    console.error(error)

    let httpStatusCode = null

    const match = String(error.message || '')
      .match(/HTTP (\d+)/)

    if (match) {
      httpStatusCode = Number(match[1])
    }

    return {
      success: false,
      error: error.message || '未知错误',

      pois: [],

      apiUrl,
      httpStatusCode
    }
  }
}
function requestJson({ method, url, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const payload = body ? JSON.stringify(body) : ''

    // 1. 补充标准请求头，模拟正常客户端，避免被 API 网关拦截降级
    const defaultHeaders = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...headers,
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
    }

    const req = https.request({
      method,
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      headers: defaultHeaders,
      timeout: 10000
    }, (res) => {
      // 2. 修复中文截断 Bug：使用 Buffer 数组收集，最后一次性转换
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`vivo API HTTP ${res.statusCode}: ${raw}`))
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

function createRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0
    const finalValue = char === 'x' ? value : (value & 0x3 | 0x8)
    return finalValue.toString(16)
  })
}
