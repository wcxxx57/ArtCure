// vivo AIGC 能力统一网关
// 说明：优先读取云函数环境变量；本地/上传演示可使用同目录 config.local.js；语音识别调用 vivo ASR。

const cloud = require('wx-server-sdk')
const https = require('https')
const WebSocket = require('ws')
const crypto = require('crypto')
const artTherapyKnowledge = require('./artTherapyKnowledge')
const localConfig = loadLocalConfig()

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const JIUWEN_BASE_URL = (getConfigValue('JIUWEN_BASE_URL') || 'https://jiuwen.vivo.com.cn/v1').replace(/\/$/, '')
const JIUWEN_CHAT_MESSAGES_PATH = getConfigValue('JIUWEN_CHAT_MESSAGES_PATH') || '/chat-messages'
const JIUWEN_MEDIA_UPLOAD_PATH = getConfigValue('JIUWEN_MEDIA_UPLOAD_PATH') || '/files/media-upload'
const VIVO_BASE_URL = (getConfigValue('VIVO_API_URL') || getConfigValue('VIVO_API_BASE') || 'https://api-ai.vivo.com.cn').replace(/\/$/, '')
const VIVO_POI_BASE_URL = getConfigValue('VIVO_POI_BASE_URL') || VIVO_BASE_URL
const VIVO_WS_HOST = getConfigValue('VIVO_WS_HOST') || 'api-ai.vivo.com.cn'
const DEFAULT_CHAT_MODEL = getConfigValue('VIVO_CHAT_MODEL') || getConfigValue('JIUWEN_MODEL') || 'Volc-DeepSeek-V3.2'
const DEFAULT_VISION_MODEL = getConfigValue('VIVO_VISION_MODEL') || DEFAULT_CHAT_MODEL
const DEFAULT_EMBEDDING_MODEL = getConfigValue('VIVO_EMBEDDING_MODEL') || 'bge-base-zh-v1.5'
const DEFAULT_RERANK_MODEL = getConfigValue('VIVO_RERANK_MODEL') || 'bge-reranker-large'
const ASR_CHUNK_SIZE = 1280
const ASR_CHUNK_INTERVAL_MS = 40
const POI_PAGE_SIZE = 15
const POI_MAX_PAGES = 3
const POI_QUERY_VARIANT_LIMIT = 9
const POI_TARGET_RESULT_COUNT = 36
const POI_EXPANDED_QUERY_PAGE_LIMIT = 1

const POI_KEYWORD_EXPANSIONS = [
  {
    triggers: ['艺术疗愈', '疗愈', '表达性艺术'],
    terms: ['艺术疗愈', '绘画疗愈', '表达性艺术', '艺术工作室', '画室', '手作体验', '陶艺', '心理咨询', '疗愈空间']
  },
  {
    triggers: ['绘画', '画画', '流体画', '曼陀罗'],
    terms: ['绘画疗愈', '绘画工作室', '画室', '艺术工作室', '流体画', '曼陀罗绘画', '美术馆']
  },
  {
    triggers: ['颂钵', '音疗', '音乐疗愈', '声音浴'],
    terms: ['颂钵音疗', '声音疗愈', '声音浴', '冥想', '瑜伽', '疗愈空间']
  },
  {
    triggers: ['冥想', '正念'],
    terms: ['冥想', '正念', '正念冥想', '瑜伽', '心理咨询', '疗愈空间']
  },
  {
    triggers: ['舞动', '舞蹈'],
    terms: ['舞动疗愈', '舞蹈工作室', '形体工作室', '瑜伽', '身心疗愈']
  },
  {
    triggers: ['心理', '咨询', '情绪'],
    terms: ['心理咨询', '心理咨询中心', '心理疗愈', '情绪疏导', '疗愈空间']
  },
  {
    triggers: ['200', '预算', '便宜', '性价比'],
    terms: ['绘画疗愈', '冥想', '瑜伽', '陶艺', '手作体验', '心理咨询']
  }
]

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
        return await transcribeShortVoice(data)
      case 'text.embedding':
        return await embedTexts(data)
      case 'text.rerank':
        return await rerankTexts(data)
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
    const normalized = normalizeGatewayError(error)
    return {
      success: false,
      code: normalized.code,
      message: normalized.message
    }
  }
}

async function completeChat(data) {
  const {
    scene = 'voice_companion',
    messages = [],
    prompt = '',
    mode = 'therapist',
    inputType = 'text',
    intent = ''
  } = data

  if (!hasVivoKey()) {
    if (isGuideIntent(scene, intent)) {
      const fallbackReply = buildGuideFallbackReply({
        scene,
        intent,
        userQuery: prompt || lastUserMessage(messages),
        turnIndex: Number(data.turnIndex || 0)
      })

      return {
        success: true,
        source: 'local-guide-fallback',
        reply: fallbackReply,
        audioText: extractGuideText(fallbackReply, scene, intent),
        sources: [],
        retrieval: {
          ranker: 'none',
          query: prompt || lastUserMessage(messages)
        }
      }
    }

    return {
      success: false,
      code: 'VIVO_KEY_MISSING',
      message: '未配置 VIVO_APP_KEY，无法调用蓝心大模型'
    }
  }

  const userQuery = prompt || lastUserMessage(messages)
  const normalizedMessages = normalizeMessages(messages, userQuery)
  const rag = await retrieveArtTherapyContext(userQuery, normalizedMessages, {
    scene,
    mode,
    intent,
    inputType
  })

  const systemPrompt = buildSystemPrompt(scene, {
    mode,
    intent,
    inputType,
    ragContext: rag.context
  })
  const vivoMessages = [
    { role: 'system', content: systemPrompt },
    ...normalizedMessages
  ]

  let reply = ''
  let source = 'vivo'
  const generation = getChatGenerationConfig(scene, mode, intent)

  try {
    reply = await callVivoChat(vivoMessages, {
      temperature: generation.temperature,
      max_tokens: generation.maxTokens
    })
  } catch (error) {
    console.warn('[completeChat] remote generation failed, using local reply:', error.message)
    source = isGuideIntent(scene, intent) ? 'local-guide-fallback' : 'local-chat-fallback'
    reply = isGuideIntent(scene, intent)
      ? buildGuideFallbackReply({
        scene,
        intent,
        userQuery,
        turnIndex: Number(data.turnIndex || 0),
        ragContext: rag.context
      })
      : buildMockChatReply(scene, userQuery, { mode })
  }

  return {
    success: true,
    source,
    reply,
    audioText: extractGuideText(reply, scene, intent),
    sources: rag.sources,
    retrieval: {
      ranker: rag.ranker,
      query: rag.query
    }
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
    throw createGatewayError(
      'JIUWEN_KEY_MISSING',
      '缺少 JIUWEN_API_KEY：请在 vivoAigcGateway/config.local.js 或微信云函数环境变量中配置九问 API Key'
    )
  }

  if (!imageUrl && !fileID) {
    throw new Error('没有可分析的图片：缺少 fileID 或 imageUrl')
  }

  const resolvedImageUrl = imageUrl || await uploadCloudFileToJiuwen(fileID)
  console.log('[artwork.analyze] image ready for jiuwen', {
    imageUrl: maskUrl(resolvedImageUrl)
  })

  if (!resolvedImageUrl) {
    throw new Error(`没有可分析的图片：fileID=${fileID || '空'}，imageUrl=${imageUrl ? '已传入' : '空'}`)
  }

  const rawText = await callJiuwenArtworkVision({
    imageUrl: resolvedImageUrl,
    prompt,
    sourceType
  })
  const result = normalizeArtworkResult(rawText)
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error(`九问图片分析返回内容无法解析为两个元素数组：${rawText || '空响应'}`)
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
  const {
    city = '上海市',
    keyword = '美术馆'
  } = data

  console.log('[recommendResources] 开始搜索')
  console.log('city =', city)
  console.log('keyword =', keyword)

  if (!hasVivoPoiKey()) {
    return {
      success: false,
      source: 'mock',
      error: '未配置 VIVO_APP_KEY',
      pois: []
    }
  }

  const result = await callVivoPoiExpanded({
    city,
    keyword
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
        httpStatusCode: result.httpStatusCode,
        keywords: result.keywords
      }
    }
  }

  const filteredPois = dedupePois(filterPoisByCity(result.pois || [], city))
  const hasPois = filteredPois.length > 0

  // vivo POI 文档示例会在返回有效 pois 时同时给出 statusCode=4/statusInfo="cookie is null"。
  // 因此不能只按 statusCode 判失败；有同城 pois 就按可用结果处理。
  if (result.statusCode !== 0 && !hasPois && !isIgnorablePoiStatus(result)) {
    return {
      success: false,
      source: 'vivo',
      error: result.statusInfo || `API业务异常 statusCode=${result.statusCode}`,
      pois: [],
      total: 0,
      statusCode: result.statusCode,
      statusInfo: result.statusInfo
    }
  }

  // 正常返回（即使 total=0 也算成功）
  return {
    success: true,
    source: 'vivo',
    reply:
      hasPois
        ? `按「${result.keywords.join(' / ')}」扩展搜索，找到 ${result.total || filteredPois.length} 个结果，已展示 ${filteredPois.length} 个地点线索`
        : `按「${result.keywords.join(' / ')}」搜索后仍没有找到相关POI，请尝试更具体关键词`,

    pois: filteredPois,
    total: result.total || filteredPois.length,
    displayTotal: filteredPois.length,
    fetchedTotal: result.fetchedTotal || filteredPois.length,
    pagesFetched: result.pagesFetched || 0,

    statusCode: result.statusCode,
    statusInfo: result.statusInfo,

    searchParams: {
      city,
      keyword,
      expandedKeywords: result.keywords,
      expandedKeywordsText: result.keywords.join(' / ')
    }
  }
}

async function transcribeShortVoice(data = {}) {
  if (!hasVivoKey()) {
    return {
      success: false,
      code: 'VIVO_KEY_MISSING',
      message: '未配置 VIVO_APP_KEY，无法调用 vivo 实时短语音识别'
    }
  }

  const audioType = data.audioType || data.format || 'pcm'
  if (String(audioType).toLowerCase() !== 'pcm') {
    return {
      success: false,
      code: 'ASR_AUDIO_FORMAT_UNSUPPORTED',
      message: 'vivo 实时短语音识别要求 16k/16bit 单声道 PCM 音频'
    }
  }

  const audioBuffer = await resolveAudioBuffer(data)
  if (!audioBuffer || audioBuffer.length === 0) {
    return {
      success: false,
      code: 'ASR_AUDIO_EMPTY',
      message: '未获取到可识别的语音数据'
    }
  }

  const requestId = createRequestId()
  const userId = normalizeAsrUserId(data.userId || data.openid || 'artcure_user')
  const result = await callVivoShortAsr(audioBuffer, {
    requestId,
    userId,
    packageName: data.packageName || getConfigValue('VIVO_ASR_PACKAGE') || 'artcure.miniprogram'
  })

  return {
    success: true,
    source: 'vivo',
    requestId,
    sid: result.sid,
    text: result.text,
    raw: result.raw
  }
}

async function resolveAudioBuffer(data) {
  if (data.fileID) {
    const downloadRes = await cloud.downloadFile({
      fileID: data.fileID
    })
    return downloadRes.fileContent
  }

  if (data.audioBase64) {
    return Buffer.from(data.audioBase64, 'base64')
  }

  throw new Error('voice.asrShort 需要 fileID 或 audioBase64')
}

function callVivoShortAsr(audioBuffer, options) {
  return new Promise((resolve, reject) => {
    const { requestId, userId, packageName } = options
    const query = new URLSearchParams({
      client_version: '1.0.0',
      product: 'artcure',
      package: packageName,
      sdk_version: 'unknown',
      user_id: userId,
      android_version: 'unknown',
      system_time: String(Date.now()),
      net_type: '1',
      user_info: '1',
      engineid: getConfigValue('VIVO_ASR_ENGINE_ID') || 'shortasrinput',
      requestId
    })

    const ws = new WebSocket(`ws://${VIVO_WS_HOST}/asr/v2?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`
      }
    })

    let finished = false
    let sid = ''
    let finalText = ''
    let appendedText = ''
    let lastResult = null
    const timer = setTimeout(() => {
      finish(new Error('vivo 实时短语音识别超时'))
    }, Number(getConfigValue('VIVO_ASR_TIMEOUT_MS') || 70000))

    function finish(error, payload) {
      if (finished) return
      finished = true
      clearTimeout(timer)

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(Buffer.from('--close--'))
        ws.close()
      }

      if (error) {
        reject(error)
        return
      }

      resolve(payload)
    }

    ws.on('open', async () => {
      try {
        ws.send(JSON.stringify({
          type: 'started',
          request_id: requestId.replace(/-/g, ''),
          asr_info: {
            front_vad_time: 6000,
            end_vad_time: 2000,
            audio_type: 'pcm',
            chinese2digital: 1,
            punctuation: 2
          },
          business_info: JSON.stringify({
            scenes_pkg: packageName,
            scene: 'artcure_voice_healing'
          })
        }))

        await sendPcmFrames(ws, audioBuffer)
      } catch (error) {
        finish(error)
      }
    })

    ws.on('message', raw => {
      let message
      try {
        message = JSON.parse(raw.toString())
      } catch (error) {
        finish(new Error(`vivo ASR 返回非 JSON 数据: ${raw.toString()}`))
        return
      }

      if (message.sid) sid = message.sid

      if (message.action === 'error') {
        finish(new Error(`vivo ASR ${message.code}: ${message.desc || '识别失败'}`))
        return
      }

      if (message.action === 'result' && message.type === 'asr') {
        if (message.code && message.code !== 0) {
          finish(new Error(`vivo ASR ${message.code}: ${message.desc || '识别失败'}`))
          return
        }

        lastResult = message
        const text = message.data && message.data.text ? message.data.text.trim() : ''
        if (text) {
          if (message.data && message.data.reformation === 0) {
            appendedText += text
            finalText = appendedText
          } else {
            finalText = text
          }
        }

        if ((message.data && message.data.is_last) || message.is_finish) {
          finish(null, {
            sid,
            text: finalText,
            raw: lastResult
          })
        }
      }
    })

    ws.on('error', error => {
      finish(error)
    })

    ws.on('close', () => {
      if (!finished && finalText) {
        finish(null, {
          sid,
          text: finalText,
          raw: lastResult
        })
      } else if (!finished) {
        finish(new Error('vivo ASR 连接已关闭，但没有返回识别文本'))
      }
    })
  })
}

async function sendPcmFrames(ws, audioBuffer) {
  for (let offset = 0; offset < audioBuffer.length; offset += ASR_CHUNK_SIZE) {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error('vivo ASR 连接已断开')
    }

    const chunk = audioBuffer.subarray(offset, Math.min(offset + ASR_CHUNK_SIZE, audioBuffer.length))
    ws.send(chunk)
    await sleep(ASR_CHUNK_INTERVAL_MS)
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(Buffer.from('--end--'))
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeAsrUserId(value) {
  return crypto.createHash('md5').update(String(value)).digest('hex')
}

async function embedTexts(data = {}) {
  if (!hasVivoKey()) {
    return {
      success: false,
      code: 'VIVO_KEY_MISSING',
      message: '未配置 VIVO_APP_KEY，无法调用 vivo 文本向量接口'
    }
  }

  const sentences = normalizeTextArray(data.sentences || data.texts || data.text)
  if (sentences.length === 0) {
    return {
      success: false,
      code: 'TEXT_EMPTY',
      message: 'text.embedding 需要提供 text、texts 或 sentences'
    }
  }

  const requestId = createRequestId()
  const response = await requestJson({
    method: 'POST',
    url: `${VIVO_BASE_URL}/embedding-model-api/predict/batch?requestId=${encodeURIComponent(requestId)}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`
    },
    body: {
      model_name: data.modelName || data.model_name || DEFAULT_EMBEDDING_MODEL,
      sentences: sentences.map(text => compactText(text, 500))
    }
  })

  return {
    success: true,
    source: 'vivo',
    requestId,
    modelName: data.modelName || data.model_name || DEFAULT_EMBEDDING_MODEL,
    embeddings: response.data || []
  }
}

async function rerankTexts(data = {}) {
  if (!hasVivoKey()) {
    return {
      success: false,
      code: 'VIVO_KEY_MISSING',
      message: '未配置 VIVO_APP_KEY，无法调用 vivo 文本相似度接口'
    }
  }

  const query = String(data.query || '').trim()
  const sentences = normalizeTextArray(data.sentences || data.texts)

  if (!query || sentences.length === 0) {
    return {
      success: false,
      code: 'RERANK_INPUT_INVALID',
      message: 'text.rerank 需要提供 query 和 sentences'
    }
  }

  const compactQuery = compactText(query, 220)
  const sentenceMaxLen = Math.max(80, 500 - compactQuery.length - 20)
  const requestId = createRequestId()
  const response = await requestJson({
    method: 'POST',
    url: `${VIVO_BASE_URL}/rerank?requestId=${encodeURIComponent(requestId)}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`
    },
    body: {
      model_name: data.modelName || data.model_name || DEFAULT_RERANK_MODEL,
      query: compactQuery,
      sentences: sentences.map(text => compactText(text, sentenceMaxLen))
    }
  })

  const scores = Array.isArray(response.data) ? response.data : []

  return {
    success: true,
    source: 'vivo',
    requestId,
    modelName: data.modelName || data.model_name || DEFAULT_RERANK_MODEL,
    scores,
    results: sentences.map((text, index) => ({
      text,
      score: scores[index]
    })).sort((a, b) => Number(b.score) - Number(a.score))
  }
}

function normalizeTextArray(value) {
  const list = Array.isArray(value) ? value : [value]
  return list
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function compactText(text, maxLen) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
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
  return Boolean(getConfigValue('VIVO_APP_KEY'))
}

function hasJiuwenKey() {
  return Boolean(getJiuwenApiKey())
}

function hasVivoPoiKey() {
  return hasVivoKey()
}

function getJiuwenApiKey() {
  return getConfigValue('JIUWEN_API_KEY') || ''
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

function createGatewayError(code, message, extra = {}) {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extra)
  return error
}

function normalizeGatewayError(error) {
  const message = String((error && error.message) || '')
  const code = error && error.code

  if (code) {
    return {
      code,
      message: message || 'vivo AIGC 网关调用失败'
    }
  }

  if ((error && error.httpStatusCode === 401) || /HTTP\s*401|unauthorized/i.test(message)) {
    return {
      code: 'AI_AUTH_UNAUTHORIZED',
      message: 'AI 服务鉴权失败：请检查 vivoAigcGateway 云函数环境变量 JIUWEN_API_KEY 或 VIVO_APP_KEY 是否有效，并重新上传部署云函数。'
    }
  }

  if (/VIVO_APP_KEY/.test(message)) {
    return {
      code: 'VIVO_KEY_MISSING',
      message
    }
  }

  return {
    code: 'GATEWAY_ERROR',
    message: message || 'vivo AIGC 网关调用失败'
  }
}

function buildSystemPrompt(scene, meta = {}) {
  if (isShortCompanionMode(scene, meta.mode, meta.intent)) {
    const optionalKnowledge = meta.ragContext
      ? `【可选参考】\n${meta.ragContext}\n只有当用户明确询问艺术疗愈、情绪支持或练习建议时，才自然借用这些内容；普通闲聊不要主动展开。\n`
      : '【可选参考】\n本轮没有必须引用的知识。普通闲聊时不要主动引入艺术疗愈知识。\n'

    return [
      '你是“艺呦”，手机里的日常陪伴 AI 朋友，像微信里一个自然、松弛、有分寸的朋友。',
      '你可以陪用户闲聊、接话、轻轻关心，但不能做心理诊断，不能替代心理咨询或医疗服务。',
      '如果用户表达自伤、伤害他人、强烈绝望或现实危险，请温和提醒其立刻联系身边可信任的人、当地紧急服务或专业心理危机援助。',
      optionalKnowledge,
      '【当前任务】用户选择的是“日常陪伴 · 轻松聊天”，不是树洞模式，也不是疗愈师模式。',
      '【回复要求】',
      '1. 默认像好友聊天一样短：1-3 句，20-80 字；用户只是闲聊时不要超过 120 字。',
      '2. 先自然接话，不要复述大段用户原话，不要分析“情绪线索”。',
      '3. 不主动输出艺术疗愈练习、步骤、标题、清单或长建议。',
      '4. 每次最多问 1 个轻松追问；能一句话回应就一句话。',
      '5. 用户明显求安慰或建议时，再给一句简短陪伴或一个很小的建议。',
      '6. 表情最多 1 个，少用波浪线，不要过度卖萌。'
    ].join('\n')
  }

  if (isTreeHoleMode(scene, meta.mode, meta.intent)) {
    const optionalKnowledge = meta.ragContext
      ? `【可选参考】\n${meta.ragContext}\n只有当用户明确请求方法或练习时，才简短借用这些内容。\n`
      : '【可选参考】\n本轮没有必须引用的知识。以倾听和情绪承接为主。\n'

    return [
      '你是“艺呦”的树洞模式，一个温暖、稳定、不评判的倾听者。',
      '你的回复用于情绪承接和自我觉察，不能做心理诊断，不能替代心理咨询或医疗服务。',
      '如果用户表达自伤、伤害他人、强烈绝望或现实危险，请温和提醒其立刻联系身边可信任的人、当地紧急服务或专业心理危机援助。',
      optionalKnowledge,
      '【当前任务】用户选择的是“树洞模式 · 倾听你的心声”，需要被听见、被接住，而不是被立刻指导。',
      '【回复要求】',
      '1. 先用 1 句自然地接住用户感受，可以说“我听到了”“这听起来不容易”。',
      '2. 不要长篇分析，不要诊断，不要把普通表达上升成心理问题。',
      '3. 默认不输出艺术疗愈练习；只有用户明确要建议/方法时，才给 1 个很小、低压力的动作。',
      '4. 每次最多问 1 个问题，问题要轻，不要追问隐私。',
      '5. 常规回复控制在 80-180 字；复杂情绪也尽量不超过 260 字。',
      '6. 语气安静、真诚、像陪用户坐一会儿，不要过度卖萌。'
    ].join('\n')
  }

  if (isTherapistChatMode(scene, meta.mode, meta.intent)) {
    const knowledge = meta.ragContext
      ? `【艺术疗愈知识库参考】\n${meta.ragContext}\n`
      : '【艺术疗愈知识库参考】\n本轮没有检索到足够相关片段，请只基于通用低风险艺术疗愈原则回答。\n'

    return [
      '你是“艺呦疗愈师”，一个专业边界清晰、表达温和的艺术疗愈 AI 顾问。',
      '你的回复用于自我觉察、情绪支持和低风险艺术疗愈练习，不能做心理诊断，不能替代心理咨询或医疗服务。',
      '如果用户表达自伤、伤害他人、强烈绝望或现实危险，请温和提醒其立刻联系身边可信任的人、当地紧急服务或专业心理危机援助。',
      '不要编造知识来源，不要声称你已经进行医学评估。',
      knowledge,
      '【当前任务】用户选择的是“疗愈师模式 · 专业陪伴”，需要更专业、可执行、有边界的艺术疗愈建议。',
      '【回复要求】',
      '1. 先用 1 句简短共情，再进入专业建议。',
      '2. 可以结合绘画、色彩、线条、身体地图、曼陀罗、感官锚定等方法，但只给适合当下的 1 个核心练习。',
      '3. 说明练习目的和做法，步骤要清楚，避免玄学化和过度解释作品含义。',
      '4. 用户问概念时先解释概念；用户问“怎么办”时给可执行练习；用户闲聊时不要硬讲专业课。',
      '5. 常规回复控制在 220-520 字；必要时可用简短条目，但不要堆很多建议。',
      '6. 结尾给 1 个轻的观察问题或下一步选择。'
    ].join('\n')
  }

  const shared = [
    '你是“艺哟”，一个温暖、谨慎、专业边界清晰的艺术疗愈 AI 助手。',
    '你的回复用于自我觉察、情绪支持和低风险艺术疗愈练习，不能做心理诊断，不能替代心理咨询或医疗服务。',
    '如果用户表达自伤、伤害他人、强烈绝望或现实危险，请温和提醒其立刻联系身边可信任的人、当地紧急服务或专业心理危机援助。',
    '不要编造知识来源，不要声称你已经进行医学评估。'
  ].join('\n')

  const knowledge = meta.ragContext
    ? `\n【RAG 检索到的艺术疗愈知识】\n${meta.ragContext}\n`
    : '\n【RAG 检索到的艺术疗愈知识】\n本轮没有检索到足够相关片段，请只基于通用低风险艺术疗愈原则回答。\n'

  const scenePrompts = {
    voice_companion: [
      shared,
      knowledge,
      '【当前任务】用户通过短语音或文字表达心情。请先回应其感受，再结合知识库给出一个当下能做的沉浸式艺术疗愈动作。',
      '【回复要求】',
      '1. 用第二人称，像在手机 AI 助手里轻声陪伴用户。',
      '2. 先用 1-2 句共情，不急着说教。',
      '3. 提炼一个可能的情绪线索，但用“听起来/也许/像是”表达，不下判断。',
      '4. 给出 1 个 3 分钟以内的绘画、色彩、线条、身体地图、曼陀罗或感官锚定练习。',
      '5. 结尾给一个很轻的反思问题。',
      '6. 控制在 260-520 字，语气温暖、具体、可立即执行。'
    ].join('\n'),
    three_minute_guide: [
      shared,
      knowledge,
      '【当前任务】生成一段可以直接朗读的“三分钟艺术疗愈引导”。用户可能会边听边画。',
      '【回复要求】',
      '1. 只输出引导词本身，不要写“以下是”“步骤说明”“免责声明标题”。',
      '2. 用慢节奏、沉浸式、具象的语言，适合手机端语音播报。',
      '3. 结构包含：安顿呼吸、选择颜色/线条、持续创作、停下观察、给作品命名。',
      '4. 每一步都要简单，不要求画得好，不解释作品含义。',
      '5. 避免过度心理分析，避免制造压力。',
      '6. 控制在 500-800 字。'
    ].join('\n'),
    immersive_guide: [
      shared,
      knowledge,
      '【当前任务】你正在进行一个“听与说”的沉浸式艺术疗愈引导。用户每次会用短语音回应你。',
      '【交互规则】',
      '1. 先用一句话接住用户刚刚说的话，不要诊断，不要解释过度。',
      '2. 然后给出下一小步可以边听边做的艺术疗愈动作，例如选色、画线、点色块、身体地图或给画面命名。',
      '3. 每次只推进一个动作，并在结尾邀请用户用一句短语音回应。',
      '4. 语言要像手机 AI 助手在轻声带练，适合语音播报。',
      '5. 控制在 120-220 字。'
    ].join('\n'),
    artwork_analysis: [
      shared,
      knowledge,
      '当前场景是绘画分析：请从画面观察和创作引导出发，避免武断解释。'
    ].join('\n'),
    resource_location: [
      shared,
      knowledge,
      '当前场景是位置资源推荐：请根据地点、预算、疗愈方式给出具体选择建议。'
    ].join('\n')
  }

  return scenePrompts[scene] || scenePrompts.voice_companion
}

function isGuideIntent(scene, intent) {
  return scene === 'three_minute_guide' ||
    scene === 'immersive_guide' ||
    intent === 'three_minute_guide' ||
    intent === 'immersive_guide_turn'
}

function isShortCompanionMode(scene, mode, intent) {
  return mode === 'companion' && !isGuideIntent(scene, intent)
}

function isTreeHoleMode(scene, mode, intent) {
  return mode === 'comfort' && !isGuideIntent(scene, intent)
}

function isTherapistChatMode(scene, mode, intent) {
  return mode === 'therapist' && !isGuideIntent(scene, intent)
}

function getChatGenerationConfig(scene, mode, intent) {
  if (isGuideIntent(scene, intent)) {
    return { temperature: 0.72, maxTokens: 1500 }
  }
  if (isShortCompanionMode(scene, mode, intent)) {
    return { temperature: 0.78, maxTokens: 260 }
  }
  if (isTreeHoleMode(scene, mode, intent)) {
    return { temperature: 0.66, maxTokens: 560 }
  }
  if (isTherapistChatMode(scene, mode, intent)) {
    return { temperature: 0.58, maxTokens: 1000 }
  }
  return { temperature: 0.62, maxTokens: 1200 }
}

function normalizeMessages(messages, prompt) {
  const promptText = String(prompt || '').trim()

  if (Array.isArray(messages) && messages.length > 0) {
    const normalized = messages
      .filter(item => item && item.content)
      .map(item => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: String(item.content)
      }))

    if (promptText) {
      const last = normalized[normalized.length - 1]
      if (!last || last.role !== 'user' || last.content !== promptText) {
        normalized.push({ role: 'user', content: promptText })
      }
    }

    return normalized
  }

  return [{ role: 'user', content: promptText || '我想做一次艺术疗愈练习。' }]
}

async function retrieveArtTherapyContext(prompt, messages, meta = {}) {
  const query = buildRetrievalQuery(prompt, messages, meta)
  const localRanked = rankKnowledgeLocally(query, meta).slice(0, 8)

  let ranked = localRanked
  let ranker = 'local-keyword'

  if (hasVivoKey() && localRanked.length > 1) {
    try {
      const reranked = await rerankKnowledgeChunks(query, localRanked)
      if (reranked.length) {
        ranked = reranked
        ranker = 'vivo-rerank'
      }
    } catch (error) {
      console.warn('[RAG] vivo rerank failed, using local ranking:', error.message)
    }
  }

  const topK = meta.intent === 'three_minute_guide' || meta.scene === 'three_minute_guide' ? 5 : 4
  const selected = ranked.slice(0, topK)

  return {
    query,
    ranker,
    context: formatKnowledgeContext(selected),
    sources: selected.map(item => ({
      id: item.id,
      title: item.title,
      score: typeof item.score === 'number' ? Number(item.score.toFixed(4)) : item.score
    }))
  }
}

function buildRetrievalQuery(prompt, messages, meta = {}) {
  const history = Array.isArray(messages)
    ? messages
      .filter(item => item && item.content)
      .slice(-5)
      .map(item => item.content)
      .join(' ')
    : ''

  const sceneTerms = [
    meta.scene === 'three_minute_guide' || meta.intent === 'three_minute_guide' ? '三分钟 语音引导 边听边画 沉浸式' : '',
    meta.inputType === 'voice' ? '短语音 心情 倾听 共情' : '',
    meta.mode === 'therapist' ? '专业 艺术疗愈 方法' : ''
  ].filter(Boolean).join(' ')

  return compactText(`${sceneTerms} ${history} ${prompt || ''}`, 500)
}

function rankKnowledgeLocally(query, meta = {}) {
  const normalizedQuery = normalizeSearchText(query)
  const queryBigrams = buildBigrams(normalizedQuery)

  const ranked = artTherapyKnowledge.map(chunk => {
    const score = scoreKnowledgeChunk(chunk, normalizedQuery, queryBigrams, meta)
    return { ...chunk, score }
  }).sort((a, b) => b.score - a.score)

  const positive = ranked.filter(item => item.score > 0)
  if (positive.length) return positive

  const defaults = ['empathy-listening', 'expressive-art', 'self-care-senses', 'safety-boundary']
  return ranked
    .filter(item => defaults.includes(item.id))
    .sort((a, b) => defaults.indexOf(a.id) - defaults.indexOf(b.id))
}

function scoreKnowledgeChunk(chunk, normalizedQuery, queryBigrams, meta = {}) {
  const keywordScore = (chunk.keywords || []).reduce((score, keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword)
    if (!normalizedKeyword) return score
    if (normalizedQuery.includes(normalizedKeyword)) return score + 12
    if (normalizedKeyword.includes(normalizedQuery) && normalizedQuery.length >= 2) return score + 6
    return score
  }, 0)

  const chunkText = normalizeSearchText(`${chunk.title} ${chunk.keywords.join(' ')} ${chunk.content}`)
  const overlapScore = queryBigrams.reduce((score, bigram) => {
    return chunkText.includes(bigram) ? score + 1 : score
  }, 0)

  const intentScore =
    meta.intent === 'three_minute_guide' || meta.scene === 'three_minute_guide'
      ? (chunk.id === 'three-minute-guide' ? 24 : 0)
      : 0

  const voiceScore = meta.inputType === 'voice' && chunk.id === 'empathy-listening' ? 8 : 0
  const safetyScore = hasCrisisSignal(normalizedQuery) && chunk.id === 'safety-boundary' ? 30 : 0

  return keywordScore + overlapScore + intentScore + voiceScore + safetyScore
}

async function rerankKnowledgeChunks(query, chunks) {
  const compactQuery = compactText(query, 220)
  const sentenceMaxLen = Math.max(80, 500 - compactQuery.length - 20)
  const requestId = createRequestId()
  const response = await requestJson({
    method: 'POST',
    url: `${VIVO_BASE_URL}/rerank?requestId=${encodeURIComponent(requestId)}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`
    },
    body: {
      model_name: DEFAULT_RERANK_MODEL,
      query: compactQuery,
      sentences: chunks.map(chunk => compactText(`${chunk.title}。${chunk.content}`, sentenceMaxLen))
    },
    timeout: 12000
  })

  const scores = Array.isArray(response.data) ? response.data : []
  if (scores.length !== chunks.length) return []

  return chunks
    .map((chunk, index) => ({
      ...chunk,
      score: Number(scores[index])
    }))
    .sort((a, b) => b.score - a.score)
}

function formatKnowledgeContext(chunks) {
  return chunks.map((chunk, index) => {
    return `【片段${index + 1}：${chunk.title}】\n${chunk.content}`
  }).join('\n\n')
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、；：,.!?;:"'“”‘’（）()\[\]{}<>《》【】]/g, '')
}

function buildBigrams(text) {
  const value = String(text || '')
  const result = []
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2))
  }
  return Array.from(new Set(result)).slice(0, 80)
}

function hasCrisisSignal(text) {
  return ['自杀', '自残', '伤害自己', '不想活', '活不下去', '结束生命', '伤害别人'].some(keyword => text.includes(keyword))
}

function extractGuideText(reply, scene, intent) {
  if (scene !== 'three_minute_guide' && intent !== 'three_minute_guide') {
    return ''
  }

  return String(reply || '')
    .replace(/[#*_`>~-]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1800)
}

function lastUserMessage(messages) {
  if (!Array.isArray(messages)) return ''
  const reversed = [...messages].reverse()
  const item = reversed.find(msg => msg && msg.role !== 'assistant' && msg.content)
  return item ? item.content : ''
}

function buildMockChatReply(scene, userText, meta = {}) {
  if (isShortCompanionMode(scene, meta.mode, meta.intent)) {
    const text = String(userText || '').trim()
    if (/难过|不开心|低落|烦|焦虑|压力|累|崩溃|委屈/.test(text)) {
      return '听起来今天有点不容易。先别急着把自己调整好，我陪你缓一会儿。'
    }
    if (/吃|美食|奶茶|咖啡|晚饭|午饭|夜宵/.test(text)) {
      return '这个话题我爱听。你现在更想吃热乎的，还是来点甜的？'
    }
    if (/剧|电影|歌|游戏|周末|计划/.test(text)) {
      return '听起来可以展开聊聊。你最近最上头的是哪一个？'
    }
    return '我在呢。你刚说这个还挺想听后续的，后来呢？'
  }

  if (isTreeHoleMode(scene, meta.mode, meta.intent)) {
    const text = String(userText || '').trim()
    if (hasCrisisSignal(text)) {
      return '我听到了，这已经不是需要一个人硬扛的时刻。请先联系身边可信任的人，或立刻拨打当地紧急电话/心理危机援助热线，让真实的人陪在你身边。'
    }
    if (/焦虑|压力|累|疲惫|崩溃|烦/.test(text)) {
      return '我听到了，像是你已经绷了挺久。先不用急着解释原因，给自己一点点停下来的空间也可以。你愿意先说说，现在最压着你的那一小块是什么吗？'
    }
    if (/难过|低落|委屈|不开心|想哭/.test(text)) {
      return '这听起来挺难受的。你不用马上变好，也不用把话说得很完整，我会在这里陪你慢慢捋。此刻最想被接住的是哪一句话？'
    }
    return '我听到了。你可以不用整理得很清楚，先把最想说的那一小段放在这里就好，我会陪你慢慢听。'
  }

  if (isTherapistChatMode(scene, meta.mode, meta.intent)) {
    const text = String(userText || '').trim()
    if (hasCrisisSignal(text)) {
      return '我很重视你刚刚说的危险信号。请先暂停独处，立刻联系身边可信任的人，或拨打当地紧急电话/心理危机援助热线。艺术练习不能替代危机支持，现在最重要的是让真实的人陪到你身边。'
    }
    return `我听见了你的需求。可以先做一个低压力的线条练习：准备纸和笔，用 2 分钟画出三条线，分别代表“现在的感受”“我需要的边界”和“下一口呼气”。画完后不要解释作品，只观察哪条线最重、哪条线最松。\n\n如果你愿意，我们可以接着从最重的那条线开始，看看它需要被放在哪里。`
  }

  if (scene === 'voice_companion') {
    return `我听见你了。你刚刚表达的重点是「${userText || '想被陪伴一下'}」。先不用急着把情绪讲清楚，我们可以把它当作一团颜色：闭上眼睛想 5 秒，它更像深蓝、灰色，还是一团很亮的红色？\n\n现在做一个很轻的练习：拿一张纸，画三条线。第一条代表现在的压力，第二条代表你希望拥有的边界，第三条代表今天可以给自己的一个小小出口。画完后，只需要给这三条线取一个名字。`
  }

  return '我会先陪你把感受放慢一点，再给你一个可以马上开始的艺术疗愈动作。'
}

function buildGuideFallbackReply({ scene, intent, userQuery, turnIndex }) {
  if (scene === 'three_minute_guide' || intent === 'three_minute_guide') {
    return [
      '先让身体找到一个比较舒服的位置，脚轻轻踩住地面。你可以慢慢吸气，再慢慢呼气。现在不用把情绪说清楚，也不用画得好看，我们只是让手和呼吸一起慢下来。',
      '如果身边有纸和笔，先选一个此刻最想靠近的颜色。吸气时，把笔放到纸上；呼气时，画一条很慢的线。线可以弯，可以断，也可以重复。它不需要代表任何东西，只是在陪你把这一刻放下来。',
      '接下来，用同样的节奏继续。每一次呼气，让线条多走一点；每一次吸气，看一眼手里的颜色。你可以画圆点、波浪、色块，或者一个小小的安全角落。哪里想重一点就重一点，哪里想轻一点就轻一点。',
      '最后慢慢停下来，看一眼这张纸。不要解释它，只问自己：画面里有没有一个地方，比刚才更安静一点？如果愿意，给它取一个名字，比如“暂时放下”“一点光”或者“我在这里”。'
    ].join('\n\n')
  }

  const userText = String(userQuery || '').trim()
  const guides = [
    `我听到了，你刚刚提到「${userText || '现在的感受'}」。先不用解释它。请在纸上选一个颜色，画三条很慢的线：一条代表此刻，一条代表你想要的安稳，一条代表下一口呼气。画好后，用一句话告诉我，哪一条最接近你。`,
    `谢谢你回应我。现在把注意力放到手上，沿着刚才最有感觉的那条线，慢慢加一些圆点或色块。每加一个点，就呼一口气。做完后，你可以告诉我：画面里有没有一个地方稍微松了一点。`,
    `我在听。接下来我们做收尾：给画面找一个小小的安全角落，可以用框、圆圈或浅色把它圈出来。它不需要很大，只要能放下此刻的一点点自己。完成后，请说一个名字给它。`,
    `很好，我们先停在这里。看着这个名字，慢慢吸气，再呼气。今天这张画不需要被解释，它只是证明你刚刚陪了自己三分钟。接下来可以把纸放在身边，等需要时再回来。`
  ]

  return guides[Math.min(Math.max(Number(turnIndex || 0), 0), guides.length - 1)]
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

async function uploadCloudFileToJiuwen(fileID) {
  console.log('[artwork.analyze] preparing jiuwen media upload', {
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

  if (!mediaUrl) {
    throw new Error(`九问媒体上传失败：${JSON.stringify(uploadRes).slice(0, 1000)}`)
  }

  return mediaUrl
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
    },
    timeout: 45000
  })
}

async function callJiuwenArtworkVision({ imageUrl, prompt, sourceType }) {
  const query = buildArtworkVisionQuery({ prompt, sourceType })

  console.log('[artwork.analyze] call jiuwen chat-messages', {
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
    },
    timeout: 55000
  })

  const answer = extractJiuwenAnswer(response)
  console.log('[artwork.analyze] jiuwen chat-messages response', {
    responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
    hasAnswer: Boolean(answer),
    answerLength: String(answer || '').length
  })

  if (!answer) {
    throw new Error(`九问 chat-messages 返回中没有 answer 字段：${JSON.stringify(response).slice(0, 1000)}`)
  }

  return answer
}

function buildArtworkVisionQuery({ prompt, sourceType }) {
  return [
    '请分析这张用户绘画、手账、涂鸦或情绪便签图片。',
    `输入来源：${sourceType === 'upload' ? '用户上传图片' : '用户在线画板创作'}。`,
    `用户补充：${prompt || '无'}。`,
    '请只返回一个两个元素的 JSON 数组，不要 Markdown，不要解释。',
    '第一个元素是一段 mood_observation：只描述你在画面中实际观察到的颜色、线条、构图、元素和整体氛围，避免心理诊断。',
    '第二个元素是一段 practice_suggestions：给出一个 5 分钟以内、具体可执行的感官锚定或艺术疗愈练习。',
    '输出示例：["我观察到……", "你可以……"]'
  ].join('\n')
}

function extractJiuwenAnswer(response) {
  const data = response && response.data
  const dataOutputs = data && data.outputs
  const outputs = response && response.outputs
  return (response && response.answer) ||
    (data && data.answer) ||
    (dataOutputs && dataOutputs.answer) ||
    (dataOutputs && dataOutputs.text) ||
    (outputs && outputs.answer) ||
    (outputs && outputs.text) ||
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
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.6,
    max_tokens: options.max_tokens || 1200,
    stream: false
  }

  const candidates = buildChatEndpointCandidates(requestId)
  let response = null
  let lastError = null

  for (const candidate of candidates) {
    try {
      response = await requestJson({
        method: 'POST',
        url: candidate.url,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${candidate.apiKey}`
        },
        body: payload,
        timeout: 45000
      })
      break
    } catch (error) {
      lastError = error
      console.warn('[callVivoChat] endpoint failed:', candidate.name, error.message)
      if (!isEndpointFallbackError(error)) {
        throw error
      }
    }
  }

  if (!response && JIUWEN_BASE_URL && getJiuwenApiKey()) {
    try {
      const answer = await callJiuwenTextChat(messages)
      if (answer) return answer
    } catch (error) {
      lastError = error
      console.warn('[callVivoChat] jiuwen chat-messages failed:', error.message)
    }
  }

  if (!response) {
    throw lastError || new Error('蓝心大模型接口调用失败')
  }

  const choices = response && response.choices
  const firstChoice = Array.isArray(choices) ? choices[0] : null
  return (firstChoice && firstChoice.message && firstChoice.message.content) || '我已经收到你的信息，但暂时没有生成有效回复。'
}

async function callJiuwenTextChat(messages) {
  const query = buildJiuwenTextQuery(messages)
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
      response_mode: 'blocking'
    },
    timeout: 55000
  })

  const answer = extractJiuwenAnswer(response)
  if (!answer) {
    throw new Error(`九问 chat-messages 返回中没有 answer 字段：${JSON.stringify(response).slice(0, 1000)}`)
  }

  return answer
}

function buildJiuwenTextQuery(messages) {
  const system = []
  const dialog = []

  normalizeMessages(messages, '').forEach(item => {
    if (item.role === 'system') {
      system.push(item.content)
      return
    }
    dialog.push(`${item.role === 'assistant' ? '艺哟' : '用户'}：${item.content}`)
  })

  return compactText([
    system.length ? `请严格遵守以下角色和安全边界：\n${system.join('\n')}` : '',
    '请根据下面对话生成回复：',
    dialog.slice(-8).join('\n')
  ].filter(Boolean).join('\n\n'), 6000)
}

function buildChatEndpointCandidates(requestId) {
  const appKey = getConfigValue('VIVO_APP_KEY')
  const jiuwenKey = getJiuwenApiKey()
  const encodedRequestId = encodeURIComponent(requestId)
  const candidates = [
    {
      name: 'vivo-openai-request-id',
      url: `${VIVO_BASE_URL}/v1/chat/completions?request_id=${encodedRequestId}`,
      apiKey: appKey
    },
    {
      name: 'vivo-openai-requestId',
      url: `${VIVO_BASE_URL}/v1/chat/completions?requestId=${encodedRequestId}`,
      apiKey: appKey
    }
  ]

  if (JIUWEN_BASE_URL && jiuwenKey) {
    candidates.push({
      name: 'jiuwen-openai-request-id',
      url: `${JIUWEN_BASE_URL}/chat/completions?request_id=${encodedRequestId}`,
      apiKey: jiuwenKey
    })
  }

  return candidates
}

function isEndpointFallbackError(error) {
  const message = String(error && error.message || '')
  return /HTTP\s+(404|405|501|502|503|504)/.test(message) ||
    message.indexOf('ENOTFOUND') !== -1 ||
    message.indexOf('ECONNRESET') !== -1
}

function buildPoiKeywordVariants(keyword) {
  const normalizedKeyword = normalizePoiKeyword(keyword)
  const searchableKeyword = stripPoiBudgetTerms(normalizedKeyword)
  const variants = []
  const addVariant = value => {
    const normalized = normalizePoiKeyword(value)
    if (normalized && !variants.includes(normalized)) {
      variants.push(normalized)
    }
  }

  if (searchableKeyword) {
    addVariant(searchableKeyword)
  }

  POI_KEYWORD_EXPANSIONS.forEach(group => {
    if (group.triggers.some(trigger => normalizedKeyword.includes(trigger))) {
      group.terms.forEach(addVariant)
    }
  })

  if (!variants.length) {
    ['艺术疗愈', '绘画疗愈', '心理咨询', '冥想', '瑜伽', '陶艺'].forEach(addVariant)
  }

  return variants.slice(0, POI_QUERY_VARIANT_LIMIT)
}

function normalizePoiKeyword(value) {
  return String(value || '')
    .trim()
    .replace(/[，,、]/g, ' ')
    .replace(/\s+/g, ' ')
}

function stripPoiBudgetTerms(keyword) {
  return String(keyword || '')
    .replace(/200元以内/g, '')
    .replace(/[0-9０-９]+元?(以内|以下|左右)?/g, '')
    .replace(/预算|便宜|性价比|低价|优惠/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isIgnorablePoiStatus(result = {}) {
  return Number(result.statusCode) === 4 &&
    String(result.statusInfo || '').toLowerCase().includes('cookie is null')
}

async function callVivoPoiExpanded({ city, keyword }) {
  const keywordVariants = buildPoiKeywordVariants(keyword)
  const allPois = []
  const apiUrls = []
  const errors = []
  let total = 0
  let statusCode = 0
  let statusInfo = ''
  let currentDistrict = null
  let pagesFetched = 0
  let httpStatusCode = 200

  console.log('[callVivoPoiExpanded] keywordVariants =', keywordVariants.join(' / '))

  for (let index = 0; index < keywordVariants.length; index++) {
    const variant = keywordVariants[index]
    const maxPages = index === 0 ? POI_MAX_PAGES : POI_EXPANDED_QUERY_PAGE_LIMIT
    const result = await callVivoPoi({
      city,
      keywords: variant,
      maxPages
    })

    if (result.apiUrl) apiUrls.push(result.apiUrl)

    if (!result.success) {
      errors.push(result.error || 'POI搜索失败')
      httpStatusCode = result.httpStatusCode || httpStatusCode
      if (!allPois.length) {
        continue
      }
      break
    }

    const pagePois = (result.pois || []).map(poi => ({
      ...poi,
      matchedKeyword: variant
    }))

    allPois.push(...pagePois)
    total += Number(result.total || pagePois.length || 0)
    pagesFetched += Number(result.pagesFetched || 0)
    statusCode = typeof result.statusCode === 'number' ? result.statusCode : statusCode
    statusInfo = result.statusInfo || statusInfo
    currentDistrict = result.currentDistrict || currentDistrict
    httpStatusCode = result.httpStatusCode || httpStatusCode

    const currentPois = dedupePois(filterPoisByCity(allPois, city))
    if (currentPois.length >= POI_TARGET_RESULT_COUNT) {
      break
    }
  }

  const pois = dedupePois(allPois)

  if (!pois.length && errors.length) {
    return {
      success: false,
      error: errors[0],
      pois: [],
      keywords: keywordVariants,
      apiUrl: apiUrls[0],
      httpStatusCode
    }
  }

  return {
    success: true,
    pois,
    total: total || pois.length,
    fetchedTotal: pois.length,
    pagesFetched,
    statusCode,
    statusInfo,
    currentDistrict,
    keywords: keywordVariants,
    apiUrl: apiUrls[0],
    httpStatusCode
  }
}

async function callVivoPoi({ city, keywords, maxPages = POI_MAX_PAGES }) {
  const allPois = []
  let total = 0
  let statusCode = 0
  let statusInfo = ''
  let currentDistrict = null
  let firstApiUrl = ''
  let pagesFetched = 0

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const requestId = createRequestId()
    const apiUrl = buildVivoPoiUrl({
      city,
      keywords,
      pageNum,
      pageSize: POI_PAGE_SIZE,
      requestId
    })

    if (!firstApiUrl) firstApiUrl = apiUrl

    console.log('[callVivoPoi] 请求URL:')
    console.log(apiUrl)

    try {
      const response = await requestJson({
        method: 'GET',
        url: apiUrl,
        headers: {
          Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`,
          'Content-Type': 'application/json'
        }
      })

      const pagePois = Array.isArray(response && response.pois)
        ? response.pois
        : []
      const responseTotal = Number((response && (response.total || response.totalCount)) || 0)

      pagesFetched = pageNum
      total = responseTotal || total
      statusCode = typeof (response && response.statusCode) === 'number'
        ? response.statusCode
        : statusCode
      statusInfo = (response && response.statusInfo) || statusInfo
      currentDistrict = (response && response.currentDistrict) || currentDistrict
      allPois.push(...pagePois)

      console.log('[callVivoPoi] page =', pageNum)
      console.log('[callVivoPoi] statusCode =', statusCode)
      console.log('[callVivoPoi] total =', total)
      console.log('[callVivoPoi] pagePois =', pagePois.length)

      if (!pagePois.length) break
      if (total && allPois.length >= total) break
      if (pagePois.length < POI_PAGE_SIZE) break
    } catch (error) {
      console.error('[callVivoPoi] 请求失败:')
      console.error(error)

      if (pageNum > 1 && allPois.length) {
        statusInfo = statusInfo || error.message || '后续分页请求失败'
        break
      }

      return {
        success: false,
        error: error.message || '未知错误',
        pois: [],
        apiUrl,
        httpStatusCode: extractHttpStatusCode(error)
      }
    }
  }

  const pois = dedupePois(allPois)

  return {
    success: true,
    pois,
    total: total || pois.length,
    fetchedTotal: pois.length,
    pagesFetched,
    statusCode,
    statusInfo,
    currentDistrict,
    apiUrl: firstApiUrl,
    httpStatusCode: 200
  }
}

function buildVivoPoiUrl({ city, keywords, pageNum, pageSize, requestId }) {
  // 不使用 URLSearchParams，避免微信云函数环境兼容问题。
  return `${VIVO_POI_BASE_URL}/search/geo` +
    `?keywords=${encodeURIComponent(keywords)}` +
    `&city=${encodeURIComponent(city)}` +
    `&page_num=${pageNum}` +
    `&page_size=${pageSize}` +
    `&requestId=${requestId}`
}

function extractHttpStatusCode(error) {
  if (error && error.httpStatusCode) return error.httpStatusCode

  const match = String((error && error.message) || '').match(/HTTP\s+(\d+)/)
  return match ? Number(match[1]) : null
}

function dedupePois(pois) {
  if (!Array.isArray(pois)) return []

  const seen = new Set()
  return pois.filter(poi => {
    const key = poi.nid || `${poi.name || ''}|${poi.city || ''}|${poi.district || ''}|${poi.address || ''}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function filterPoisByCity(pois, requestedCity) {
  if (!Array.isArray(pois)) return []

  const expected = normalizeRegionName(requestedCity)
  if (!expected) return pois

  return pois.filter(poi => {
    const city = normalizeRegionName(poi.city)
    const province = normalizeRegionName(poi.province)
    const district = normalizeRegionName(poi.district)
    if (!city && !province) return true

    const matches = region => region && (
      region === expected ||
      expected.includes(region) ||
      region.includes(expected)
    )
    return matches(city) || matches(province) || matches(district)
  })
}

function normalizeRegionName(value) {
  const text = String(value || '').trim()
  if (!text || /^\d+$/.test(text)) return ''
  return text
    .replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市|地区|盟|州|县|区)$/g, '')
    .replace(/\s+/g, '')
}

function requestJson({ method, url, headers = {}, body, timeout = 30000 }) {
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
      timeout
    }, (res) => {
      // 2. 修复中文截断 Bug：使用 Buffer 数组收集，最后一次性转换
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`HTTP ${res.statusCode}: ${raw}`)
          error.httpStatusCode = res.statusCode
          error.responseText = raw
          reject(error)
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

function requestMultipart({ method, url, headers = {}, fields = {}, file, timeout = 30000 }) {
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
      timeout
    }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(`HTTP ${res.statusCode}: ${raw}`)
          error.httpStatusCode = res.statusCode
          error.responseText = raw
          reject(error)
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
