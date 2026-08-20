// 艺呦艺术疗愈陪伴 AI 网关
// 说明：对话/视觉生成使用 OpenAI 兼容 LLM；语音识别和 TTS 暂保留 vivo 能力。

const cloud = require('wx-server-sdk')
const https = require('https')
const WebSocket = require('ws')
const crypto = require('crypto')
const artTherapyKnowledge = require('./artTherapyKnowledge')
const voiceHealingSkills = require('./voiceHealingSkills')
const localConfig = loadLocalConfig()

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const LLM_CHAT_PATH = getConfigValue('LLM_CHAT_PATH') || '/chat/completions'
const JIUWEN_BASE_URL = (getConfigValue('JIUWEN_BASE_URL') || 'https://jiuwen.vivo.com.cn/v1').replace(/\/$/, '')
const JIUWEN_CHAT_MESSAGES_PATH = getConfigValue('JIUWEN_CHAT_MESSAGES_PATH') || '/chat-messages'
const DEFAULT_CHAT_MODEL = normalizeConfigValue(getConfigValue('LLM_MODEL'))
const VIVO_CHAT_MODEL = getConfigValue('VIVO_CHAT_MODEL') || getConfigValue('JIUWEN_MODEL') || 'Volc-DeepSeek-V3.2'
const DEFAULT_EMBEDDING_MODEL = getConfigValue('VIVO_EMBEDDING_MODEL') || 'bge-base-zh-v1.5'
const DEFAULT_RERANK_MODEL = getConfigValue('VIVO_RERANK_MODEL') || 'bge-reranker-large'
const ASR_CHUNK_SIZE = 1280
const ASR_CHUNK_INTERVAL_MS = 40
const POI_PAGE_SIZE = 15
const POI_MAX_PAGES = 3
const POI_QUERY_VARIANT_LIMIT = 9
const POI_TARGET_RESULT_COUNT = 36
const POI_EXPANDED_QUERY_PAGE_LIMIT = 1

// 语音疗愈 Agent 的普通工具协议。工具只描述可执行能力，具体是否调用由模型结合
// system prompt、当前对话和用户状态自行判断；危机转接不暴露给普通模型调用。
const VOICE_AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'start_soundscape',
      description: '准备低音量、可循环的自然环境音景；结合对话判断用户是否需要声音陪伴、安静空间或降低环境干扰。',
      parameters: {
        type: 'object',
        properties: {
          soundscape: {
            type: 'string',
            enum: ['ocean', 'rain', 'pink_noise', 'brown_noise', 'white_noise', 'night'],
            description: '音景类型；结合用户在对话中流露的偏好选择，没有明显偏好时选择温和的默认音景。'
          },
          duration: { type: 'number', description: '陪伴时长，单位秒，建议 60 到 300。' },
          volume: { type: 'number', description: '播放音量，建议 0.24 到 0.42，保持柔和但需要在手机扬声器上可听见。' }
        },
        required: ['soundscape']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_breathing',
      description: '准备不屏息、可随时停止的短呼吸节律音频；当对话显示呼吸节律能帮助用户安顿下来时使用。',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', enum: ['3-5', '4-6', '5-7'], description: '吸气秒数-呼气秒数。' },
          rounds: { type: 'number', description: '练习轮数，建议 2 到 6。' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_grounding',
      description: '准备一个简短的感官接地练习，把注意力带回脚底、座面、声音和颜色；当用户显得紧张、飘散或情绪过载时可使用。',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_art_exercise',
      description: '准备一个低门槛的短时艺术表达练习，例如连续线条、色块或身体地图；当创作能帮助用户表达或整理当下感受时使用。',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['continuous_line', 'color_field', 'body_map', 'mandala'],
            description: '练习类型。'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_artwork',
      description: '打开创作分析页面，让用户提交作品后进行非诊断式画面观察；当对话自然进入作品回看或画面探索时使用。',
      parameters: { type: 'object', properties: {} }
    }
  },
]

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

const VOICE_AGENT_TOOL_NAMES = new Set(
  VOICE_AGENT_TOOLS.map(item => item.function.name)
)

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
      case 'voice.healingTurn':
        return await completeVoiceHealingTurn(data)
      case 'voice.tool': {
        const toolStartedAt = Date.now()
        console.info('[voice.tool] api execute', {
          tool: data.tool || '',
          input: data.input || {}
        })
        const toolResult = await runVoiceHealingTool(data)
        console.info('[voice.tool] api result', {
          tool: data.tool || '',
          success: toolResult && toolResult.success !== false,
          source: toolResult && toolResult.source || '',
          hasAudioFile: Boolean(toolResult && (toolResult.musicFileID || toolResult.audioFileID || toolResult.fileID)),
          durationMs: Date.now() - toolStartedAt
        })
        return toolResult
      }
      case 'text.embedding':
        return await embedTexts(data)
      case 'text.rerank':
        return await rerankTexts(data)
      case 'voice.tts':
        return await synthesizeTts(data)
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
    intent = '',
    currentUserMessage = '',
    voiceRouteHint = null
  } = data
  const userQuery = String(currentUserMessage || prompt || lastUserMessage(messages)).trim()

  if (!hasChatProvider()) {
    // 没有配置远程模型时，聊天仍应按运行指南提供本地降级体验。
    // 这里返回成功结果，避免前端把“可预期的配置缺失”误报为 RAG 请求异常。
    const fallbackReply = isGuideIntent(scene, intent)
      ? buildGuideFallbackReply({
        scene,
        intent,
        userQuery,
        turnIndex: Number(data.turnIndex || 0)
      })
      : buildMockChatReply(scene, userQuery, {
        mode,
        intent,
        turnIndex: Number(data.turnIndex || 0)
      })

    return {
      success: true,
      source: isGuideIntent(scene, intent) ? 'local-guide-fallback' : 'local-chat-fallback',
      provider: 'local',
      model: '',
      reply: fallbackReply,
      audioText: extractGuideText(fallbackReply, scene, intent),
      sources: [],
      retrieval: {
        ranker: 'none',
        query: userQuery
      }
    }
  }

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
    ragContext: rag.context,
    currentUserText: userQuery,
    voiceRouteHint
  })
  const llmMessages = [
    { role: 'system', content: systemPrompt },
    ...normalizedMessages
  ]

  let reply = ''
  let source = 'llm'
  let provider = 'openai-compatible'
  let model = DEFAULT_CHAT_MODEL
  const generation = getChatGenerationConfig(scene, mode, intent)

  try {
    const generated = await callConfiguredChat(llmMessages, {
      maxTokens: generation.maxTokens
    })
    reply = generated.reply
    source = generated.source
    provider = generated.provider
    model = generated.model
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
      : buildMockChatReply(scene, userQuery, {
        mode,
        intent,
        turnIndex: Number(data.turnIndex || 0)
      })
  }

  return {
    success: true,
    source,
    provider: source === 'llm' || source === 'vivo-llm' ? provider : 'local',
    model: source === 'llm' || source === 'vivo-llm' ? model : '',
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

  getRequiredConfigValue('LLM_API_KEY')
  getRequiredConfigValue('LLM_BASE_URL')
  getRequiredConfigValue('LLM_VISION_MODEL')

  if (!imageUrl && !fileID) {
    throw new Error('没有可分析的图片：缺少 fileID 或 imageUrl')
  }

  const imageInput = await resolveArtworkImageInput({ fileID, imageUrl })
  console.log('[artwork.analyze] image ready for llm vision', {
    inputType: imageInput.startsWith('data:') ? 'data-url' : 'remote-url',
    inputLength: imageInput.length
  })

  if (!imageInput) {
    throw new Error(`没有可分析的图片：fileID=${fileID || '空'}，imageUrl=${imageUrl ? '已传入' : '空'}`)
  }

  const rawText = await callLlmArtworkVision({
    imageInput,
    prompt,
    sourceType
  })
  const result = normalizeArtworkResult(rawText)
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error(`LLM 图片分析返回内容无法解析为两个元素数组：${rawText || '空响应'}`)
  }

  console.log('[artwork.analyze] success', {
    source: 'llm',
    rawTextLength: String(rawText || '').length,
    resultCount: result.length
  })

  return {
    success: true,
    source: 'llm',
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

  const audioType = String(data.audioType || data.format || 'pcm').toLowerCase()
  if (audioType !== 'pcm') {
    return {
      success: false,
      code: 'ASR_AUDIO_FORMAT_UNSUPPORTED',
      message: 'vivo 实时短语音识别要求 16k/16bit 单声道 PCM 音频'
    }
  }

  const rawAudioBuffer = await resolveAudioBuffer(data)
  const audioBuffer = normalizePcmAudio(rawAudioBuffer)
  if (!audioBuffer || audioBuffer.length === 0) {
    return {
      success: false,
      code: 'ASR_AUDIO_EMPTY',
      message: '未获取到可识别的语音数据'
    }
  }

  console.info('[voice.asrShort] audio normalized', {
    rawBytes: rawAudioBuffer.length,
    pcmBytes: audioBuffer.length,
    hasWavHeader: isWavBuffer(rawAudioBuffer),
    sampleRate: Number(data.sampleRate || 16000),
    audioType
  })

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
    audioBytes: audioBuffer.length,
    audioDurationMs: Math.round(audioBuffer.length / 32),
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

function isWavBuffer(buffer) {
  return Boolean(
    buffer &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  )
}

function normalizePcmAudio(input) {
  if (!input) return Buffer.alloc(0)
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  if (!isWavBuffer(buffer)) {
    // ASR 按 16bit 采样读取，末尾不能保留半个采样点。
    return buffer.length % 2 === 0 ? buffer : buffer.subarray(0, buffer.length - 1)
  }

  // 微信真机在部分基础库版本中即使声明 format=pcm，临时文件仍可能带 WAV 头。
  // 只把 data chunk 交给 vivo，避免 RIFF/fmt 字节被当作语音内容。
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    if (chunkId === 'data') {
      const end = Math.min(chunkStart + chunkSize, buffer.length)
      const pcm = buffer.subarray(chunkStart, end)
      return pcm.length % 2 === 0 ? pcm : pcm.subarray(0, pcm.length - 1)
    }
    // RIFF chunk 按偶数字节对齐，防止异常文件导致死循环。
    offset = chunkStart + chunkSize + (chunkSize % 2)
  }

  // 不是标准 WAV 时不要把整段带头文件发送给 ASR。
  return Buffer.alloc(0)
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

    const ws = new WebSocket(`ws://${getRequiredVivoWsHost()}/asr/v2?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${getConfigValue('VIVO_APP_KEY')}`
      }
    })

    let finished = false
    let sid = ''
    let finalText = ''
    let lastResult = null
    let lastResultSignature = ''
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
            // 与 vivo 实时短语音协议的 VAD 参数保持一致：太短的噪声片段
            // 不作为一句话提交，静音结束也不必等待过长时间。
            mini_speech_time: 300,
            end_vad_time: 1600,
            audio_type: 'pcm',
            chinese2digital: 1,
            punctuation: 1
          },
          business_info: JSON.stringify({
            scenes_pkg: packageName,
            scene: 'artcure_voice_healing'
          })
        }))

        const framesSent = await sendPcmFrames(ws, audioBuffer)
        console.info('[voice.asrShort] pcm frames sent', {
          framesSent,
          frameBytes: ASR_CHUNK_SIZE,
          frameIntervalMs: ASR_CHUNK_INTERVAL_MS,
          pcmBytes: audioBuffer.length
        })
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
        if (message.code && message.code !== 0 && message.code !== 9) {
          finish(new Error(`vivo ASR ${message.code}: ${message.desc || '识别失败'}`))
          return
        }

        lastResult = message
        const resultData = message.data || {}
        const text = String(resultData.text || resultData.onebest || '').trim()
        if (text) {
          const signature = `${message.code || 0}|${resultData.result_id || ''}|${resultData.reformation || ''}|${text}`
          if (signature !== lastResultSignature) {
            finalText = mergeShortAsrText(finalText, text, resultData.reformation)
            lastResultSignature = signature
          }
        }

        if (resultData.is_last || message.is_finish || message.code === 9) {
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
  // vivo 文档要求每帧 1280 字节（16kHz/16bit/单声道下正好 40ms），
  // 并建议按实时节奏发送；连续倾倒整个文件会让实时 VAD/断句丢失中间内容。
  let frameCount = 0
  for (let offset = 0; offset < audioBuffer.length; offset += ASR_CHUNK_SIZE) {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error('vivo ASR 连接已断开')
    }

    const sourceChunk = audioBuffer.subarray(offset, Math.min(offset + ASR_CHUNK_SIZE, audioBuffer.length))
    const chunk = sourceChunk.length === ASR_CHUNK_SIZE
      ? sourceChunk
      : Buffer.concat([sourceChunk, Buffer.alloc(ASR_CHUNK_SIZE - sourceChunk.length)])
    ws.send(chunk)
    frameCount += 1
    await sleep(ASR_CHUNK_INTERVAL_MS)
  }

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(Buffer.from('--end--'))
  }
  return frameCount
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
    url: `${getRequiredVivoBaseUrl()}/embedding-model-api/predict/batch?requestId=${encodeURIComponent(requestId)}`,
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
    url: `${getRequiredVivoBaseUrl()}/rerank?requestId=${encodeURIComponent(requestId)}`,
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

async function runVoiceHealingTool(data = {}, options = {}) {
  const tool = String(data.tool || '').trim()
  const input = data.input || {}
  const skill = voiceHealingSkills[tool]

  if (!skill) {
    return {
      success: false,
      code: 'VOICE_TOOL_UNKNOWN',
      message: `未知疗愈工具: ${tool}`
    }
  }

  if (tool === 'start_soundscape') {
    return await createHealingMusic(input, skill)
  }
  if (tool === 'start_breathing') {
    return await createBreathingAudio(input, skill)
  }
  if (tool === 'start_grounding') {
    return {
      success: true,
      tool,
      source: 'evidence-informed-grounding',
      skill: serializeVoiceSkill(skill),
      steps: [
        '感受双脚或身体与座面的接触，不需要改变它。',
        '找到一个此刻听得见的声音，再找到一处你愿意看的颜色。',
        '随着三次自然呼吸，观察这些线索，不评价，也不强迫自己放松。'
      ],
      instruction: '注意一个此刻能感受到的声音、一个身体接触点和一处颜色，不评价，只停留三次自然呼吸。'
    }
  }
  if (tool === 'start_art_exercise') {
    const exercise = chooseArtExercise(input)
    return {
      success: true,
      tool,
      source: 'evidence-informed-art-exercise',
      skill: serializeVoiceSkill(skill),
      exercise
    }
  }
  if (tool === 'analyze_artwork') {
    return {
      success: true,
      tool,
      source: 'create-analysis-module',
      skill: serializeVoiceSkill(skill),
      navigationUrl: '/pages/create-analysis/index?source=voice-healing'
    }
  }
  if (tool === 'handoff_support') {
    if (!options.allowSafety) {
      return {
        success: false,
        code: 'VOICE_TOOL_SAFETY_ONLY',
        message: 'handoff_support 只能由危机安全路由触发'
      }
    }
    return {
      success: true,
      tool,
      source: 'safety-critical',
      skill: serializeVoiceSkill(skill),
      safetyLevel: 'high',
      instruction: '先暂停这段练习，尽量不要独处。请立刻联系身边可信任的人、当地急救服务或心理危机援助；如果你愿意，我可以陪你把求助对象和要说的话整理出来。'
    }
  }

  return { success: true, tool, skill: serializeVoiceSkill(skill) }
}

function mergeShortAsrText(previous, incoming, reformation) {
  const before = String(previous || '')
  const next = String(incoming || '')
  if (!before) return next

  // vivo 短语音协议：reformation=1 表示修正整句，reformation=0 表示追加片段。
  if (Number(reformation) === 1) return next
  if (Number(reformation) !== 0) return next
  if (next === before || before.endsWith(next)) return before
  if (next.startsWith(before)) return next
  return before + next
}

async function createHealingMusic(input = {}, skill = voiceHealingSkills.start_soundscape) {
  const duration = clampNumber(input.duration, 180, 60, 300)
  const soundscape = normalizeSoundscape(input.soundscape)
  const volume = clampNumber(input.volume, 0.34, 0.18, 0.5)
  const cached = await resolveCachedSoundscape(soundscape)

  if (cached) {
    return {
      success: true,
      tool: 'start_soundscape',
      source: 'cached-soundscape',
      musicUrl: cached.tempFileURL,
      fileID: cached.fileID,
      duration,
      soundscape,
      volume,
      loop: true,
      personalization: {
        soundscape,
        duration,
        volume,
        generated: false
      },
      skill: serializeVoiceSkill(skill),
      description: `${getSoundscapeLabel(soundscape)}音景已准备好，将以低音量循环播放。`
    }
  }

  // 没有配置预生成音景时，使用短时本地算法生成作为演示降级；前端循环播放，
  // 避免每次为了几分钟的陪伴在云函数中生成过大的 WAV。
  const generatedSeconds = Math.min(duration, 45)
  const wav = createAmbientWav(generatedSeconds, soundscape)
  const audio = await uploadGeneratedAudio('soundscape', wav)
  return {
    success: true,
    tool: 'start_soundscape',
    source: 'generated-fallback-soundscape',
    musicUrl: audio.tempFileURL,
    fileID: audio.fileID,
    duration,
    soundscape,
    volume,
    loop: true,
    personalization: {
      soundscape,
      duration,
      volume,
      generated: true,
      generatedSeconds
    },
    skill: serializeVoiceSkill(skill),
    description: `${getSoundscapeLabel(soundscape)}音景已准备好，将以低音量循环播放。`
  }
}

async function createBreathingAudio(input = {}, skill = voiceHealingSkills.start_breathing) {
  const patternMatch = String(input.pattern || '4-6').match(/^(\d+)-(\d+)$/)
  const inhaleSeconds = patternMatch ? Math.min(Math.max(Number(patternMatch[1]), 3), 6) : 4
  const exhaleSeconds = patternMatch ? Math.min(Math.max(Number(patternMatch[2]), 4), 8) : 6
  const rounds = Math.min(Math.max(Number(input.rounds || 4), 2), 6)
  const wav = createBreathingWav({ inhaleSeconds, exhaleSeconds, rounds })
  const audio = await uploadGeneratedAudio('breathing', wav)
  return {
    success: true,
    tool: 'start_breathing',
    pattern: `${inhaleSeconds}-${exhaleSeconds}`,
    rounds,
    source: 'generated-paced-breathing-audio',
    audioUrl: audio.tempFileURL,
    fileID: audio.fileID,
    duration: (inhaleSeconds + exhaleSeconds) * rounds,
    volume: 0.28,
    loop: false,
    skill: serializeVoiceSkill(skill),
    instruction: `吸气${inhaleSeconds}秒，呼气${exhaleSeconds}秒，做${rounds}轮；不屏息，如果不舒服，回到自然呼吸。`
  }
}

function chooseArtExercise(input = {}) {
  const requested = String(input.type || input.exercise || '').trim()
  const type = ['continuous_line', 'color_field', 'body_map', 'mandala'].includes(requested)
    ? requested
    : 'continuous_line'
  const exercises = {
    continuous_line: {
      type,
      title: '三分钟连续线条',
      durationMinutes: 3,
      steps: [
        '拿一张纸，让笔尖从纸面上的任意位置开始。',
        '接下来三分钟，让线条慢慢走，不追求画得像，也不需要解释。',
        '停下后，看看你最先注意到的地方，并给这幅画取一个名字。'
      ],
      reflection: '这条线现在更像是在靠近什么，还是在和什么保持距离？'
    },
    color_field: {
      type,
      title: '一块属于此刻的颜色',
      durationMinutes: 3,
      steps: [
        '选择一个你此刻愿意靠近的颜色，不需要它代表任何固定含义。',
        '让这个颜色慢慢形成一个色块，注意手部动作和身体感觉。',
        '停下来后，问问自己：这个颜色对我来说像什么？'
      ],
      reflection: '这个颜色是让你更靠近自己，还是给你留出了一点距离？'
    },
    body_map: {
      type,
      title: '身体地图',
      durationMinutes: 4,
      steps: [
        '画一个简单的身体轮廓，不需要准确。',
        '用线条、点或颜色标出此刻最明显的紧绷、沉重、发热或空空的地方。',
        '看一看画面，不解释它，只记录你最先注意到的区域。'
      ],
      reflection: '如果这个身体部位可以提出一个小请求，它会是什么？'
    },
    mandala: {
      type,
      title: '从中心向外',
      durationMinutes: 4,
      steps: [
        '先画一个圆或一个你愿意停留的中心。',
        '从中心向外重复简单的点、线或形状，按照自己的节奏来。',
        '停下来后，观察重复动作给你带来的感觉，而不是评价结果。'
      ],
      reflection: '画面里有没有一个让你想多停留一会儿的部分？'
    }
  }
  return exercises[type]
}

function serializeVoiceSkill(skill) {
  if (!skill) return null
  return {
    id: skill.id,
    name: skill.name,
    evidenceLevel: skill.evidenceLevel,
    sources: skill.sources,
    safety: skill.safety
  }
}

function normalizeSoundscape(value) {
  const soundscape = String(value || 'pink_noise').trim()
  return ['ocean', 'rain', 'pink_noise', 'brown_noise', 'white_noise', 'night'].includes(soundscape)
    ? soundscape
    : 'pink_noise'
}

function getSoundscapeLabel(soundscape) {
  return {
    ocean: '海浪',
    rain: '轻雨',
    pink_noise: '粉红噪声',
    brown_noise: '棕噪声',
    white_noise: '白噪声',
    night: '夜间环境'
  }[soundscape] || '环境'
}

async function resolveCachedSoundscape(soundscape) {
  const configKey = {
    ocean: 'VOICE_SOUND_OCEAN_FILE_ID',
    rain: 'VOICE_SOUND_RAIN_FILE_ID',
    pink_noise: 'VOICE_SOUND_PINK_NOISE_FILE_ID',
    brown_noise: 'VOICE_SOUND_BROWN_NOISE_FILE_ID',
    white_noise: 'VOICE_SOUND_WHITE_NOISE_FILE_ID',
    night: 'VOICE_SOUND_NIGHT_FILE_ID'
  }[soundscape]
  const fileID = configKey ? getConfigValue(configKey) : ''
  if (!fileID) return null

  try {
    const temp = await cloud.getTempFileURL({ fileList: [fileID] })
    const file = temp.fileList && temp.fileList[0]
    if (!file || !file.tempFileURL) return null
    return { fileID, tempFileURL: file.tempFileURL }
  } catch (error) {
    console.warn('[voice.soundscape] cached audio unavailable:', error.message)
    return null
  }
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, min), max)
}

async function uploadGeneratedAudio(prefix, wav) {
  const cloudPath = `voice-healing/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
  const upload = await cloud.uploadFile({ cloudPath, fileContent: wav })
  const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] })
  const file = temp.fileList && temp.fileList[0]
  if (!file || !file.tempFileURL) throw new Error(`${prefix} 音频临时地址生成失败`)
  return { fileID: upload.fileID, tempFileURL: file.tempFileURL }
}

function createAmbientWav(seconds, soundscape) {
  const sampleRate = 24000
  const sampleCount = sampleRate * seconds
  const pcm = Buffer.alloc(sampleCount * 2)
  let brownState = 0
  let pinkB0 = 0
  let pinkB1 = 0
  let pinkB2 = 0

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const fade = Math.min(1, time / 0.6, (seconds - time) / 0.6)
    const white = Math.random() * 2 - 1
    brownState = Math.max(-1, Math.min(1, (brownState + white * 0.025) * 0.985))
    pinkB0 = 0.99886 * pinkB0 + white * 0.0555179
    pinkB1 = 0.99332 * pinkB1 + white * 0.0750759
    pinkB2 = 0.96900 * pinkB2 + white * 0.1538520
    const pink = (pinkB0 + pinkB1 + pinkB2 + white * 0.5362) * 0.12
    const lowTone = Math.sin(2 * Math.PI * 174 * time) * 0.08
    const softTone = Math.sin(2 * Math.PI * 261 * time + Math.sin(time * 0.7) * 0.4) * 0.035
    const oceanEnvelope = 0.55 + 0.45 * Math.max(0, Math.sin(2 * Math.PI * 0.075 * time - 0.8))
    const rainEnvelope = 0.72 + 0.28 * Math.max(0, Math.sin(2 * Math.PI * 0.19 * time + 0.6))
    const noise = soundscape === 'white_noise'
      ? white * 0.32
      : soundscape === 'brown_noise'
        ? brownState * 0.48
        : soundscape === 'ocean'
          ? (pink * 0.42 + brownState * 0.12) * oceanEnvelope
          : soundscape === 'rain'
            ? (pink * 0.50 + white * 0.05) * rainEnvelope
            : soundscape === 'night'
              ? brownState * 0.28 + pink * 0.12
              : pink * 0.48
    const tone = soundscape === 'night' ? lowTone * 0.35 : lowTone
    const sample = Math.max(-1, Math.min(1, (noise + tone + softTone) * fade * 0.72))
    pcm.writeInt16LE(Math.round(sample * 32767), index * 2)
  }

  return createWavFromPcm(pcm, sampleRate)
}

function createBreathingWav({ inhaleSeconds, exhaleSeconds, rounds }) {
  const sampleRate = 24000
  const cycleSeconds = inhaleSeconds + exhaleSeconds
  const totalSeconds = cycleSeconds * rounds
  const sampleCount = sampleRate * totalSeconds
  const pcm = Buffer.alloc(sampleCount * 2)

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    const cycleTime = time % cycleSeconds
    const isInhale = cycleTime < inhaleSeconds
    const phaseTime = isInhale ? cycleTime : cycleTime - inhaleSeconds
    const phaseDuration = isInhale ? inhaleSeconds : exhaleSeconds
    const progress = Math.min(1, phaseTime / phaseDuration)
    const level = isInhale
      ? 0.5 - 0.5 * Math.cos(Math.PI * progress)
      : 0.5 + 0.5 * Math.cos(Math.PI * progress)
    const frequency = isInhale ? 220 + level * 70 : 220 + level * 70
    const carrier = Math.sin(2 * Math.PI * frequency * time) * 0.11
    const harmonic = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.018
    const chime = phaseTime < 0.6
      ? Math.exp(-phaseTime * 5) * Math.sin(2 * Math.PI * 440 * phaseTime) * 0.045
      : 0
    const fade = Math.min(1, time / 1.2, (totalSeconds - time) / 1.2)
    const sample = Math.max(-1, Math.min(1, (carrier + harmonic + chime) * (0.35 + level * 0.65) * fade))
    pcm.writeInt16LE(Math.round(sample * 32767), index * 2)
  }

  return createWavFromPcm(pcm, sampleRate)
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

async function synthesizeTts(data = {}) {
  const text = compactText(data.text || '先慢慢吸气，再把今天的压力随着呼气放下来。', 1800)
  if (!hasVivoKey()) {
    return {
      success: false,
      code: 'VIVO_KEY_MISSING',
      message: '未配置 VIVO_APP_KEY，暂时无法生成语音'
    }
  }

  const appKey = getConfigValue('VIVO_APP_KEY')
  const requestId = createRequestId()
  const userId = normalizeAsrUserId(data.userId || 'artcure_voice_healing')
  const params = new URLSearchParams({
    engineid: getConfigValue('VIVO_TTS_ENGINE_ID') || 'tts_humanoid_lam',
    system_time: String(Math.floor(Date.now() / 1000)),
    user_id: userId,
    model: 'unknown',
    product: 'artcure',
    package: getConfigValue('VIVO_TTS_PACKAGE') || 'artcure.miniprogram',
    client_version: '1.0.0',
    system_version: 'unknown',
    sdk_version: '1.0.0',
    android_version: 'unknown',
    requestId
  })
  const ws = new WebSocket(`wss://${getRequiredVivoWsHost()}/tts?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${appKey}`,
      'X-AI-GATEWAY-SIGNATURE': 'developers-aigc'
    }
  })

  const pcm = await new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const timer = setTimeout(() => finish(new Error('vivo TTS 超时')), 45000)
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (ws.readyState === WebSocket.OPEN) ws.close()
      if (error) reject(error)
      else resolve(Buffer.concat(chunks))
    }

    ws.on('open', () => {
      ws.send(JSON.stringify({
        aue: 0,
        auf: 'audio/L16;rate=24000',
        vcn: data.voice || getConfigValue('VIVO_TTS_VOICE') || 'F245_natural',
        speed: Number(data.speed || 50),
        volume: Number(data.volume || 60),
        text: Buffer.from(text, 'utf8').toString('base64'),
        encoding: 'utf8',
        reqId: Date.now()
      }))
    })
    ws.on('message', raw => {
      try {
        const message = JSON.parse(raw.toString())
        if (message.error_code && message.error_code !== 0) {
          finish(new Error(`vivo TTS ${message.error_code}: ${message.error_msg || '合成失败'}`))
          return
        }
        if (message.data && message.data.audio) chunks.push(Buffer.from(message.data.audio, 'base64'))
        if (message.data && Number(message.data.status) === 2) finish(null)
      } catch (error) {
        finish(new Error(`vivo TTS 返回非 JSON 数据: ${error.message}`))
      }
    })
    ws.on('error', finish)
    ws.on('close', () => {
      if (!settled) finish(null)
    })
  })

  if (!pcm.length) throw new Error('vivo TTS 未返回音频数据')
  const wav = createWavFromPcm(pcm, 24000)
  const cloudPath = `voice-healing/tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`
  const upload = await cloud.uploadFile({ cloudPath, fileContent: wav })
  const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] })
  return {
    success: true,
    source: 'vivo-tts',
    text,
    audioUrl: temp.fileList && temp.fileList[0] && temp.fileList[0].tempFileURL,
    fileID: upload.fileID
  }
}

function createWavFromPcm(pcm, sampleRate) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

async function completeVoiceHealing(data = {}) {
  const prompt = String(
    data.currentUserMessage || data.prompt || lastUserMessage(data.messages || [])
  ).trim()
  const turnIndex = Number(data.turnIndex || 0)
  if (!prompt) {
    return {
      success: false,
      code: 'VOICE_PROMPT_EMPTY',
      message: 'voice.healingTurn 需要用户语音转写文本'
    }
  }

  const safetyRoute = routeVoiceHealingSafety(prompt, {
    sessionState: data.sessionState
  })

  if (safetyRoute.bypassModel) {
    let toolResult = null
    if (safetyRoute.toolCall && safetyRoute.toolCall.phase === 'execute') {
      toolResult = await runVoiceHealingTool({
        tool: safetyRoute.toolCall.name,
        input: safetyRoute.toolCall.input || {}
      }, { allowSafety: true })
    }
    const reply = normalizeVoiceHealingReply(safetyRoute.reply, prompt, turnIndex)
    return {
      success: true,
      source: 'local-voice-safety-router',
      provider: 'local',
      model: '',
      reply,
      audioText: compactText(reply, 1800),
      intent: safetyRoute.intent,
      safety: safetyRoute.safety,
      toolCall: safetyRoute.toolCall,
      toolResult,
      evidenceIds: getVoiceEvidenceIds(safetyRoute.toolCall),
      retrieval: null,
      latency: { toolMs: 0 }
    }
  }

  const explicitToolCall = routeVoiceHealingExplicitTool(prompt)
  if (explicitToolCall) {
    const toolStartedAt = Date.now()
    console.info('[voice.tool] explicit execute', {
      tool: explicitToolCall.name,
      input: explicitToolCall.input,
      toolCallId: explicitToolCall.id
    })
    const toolResult = await runVoiceHealingTool({
      tool: explicitToolCall.name,
      input: explicitToolCall.input
    })
    const toolMs = Date.now() - toolStartedAt
    console.info('[voice.tool] explicit result', {
      tool: explicitToolCall.name,
      success: toolResult && toolResult.success !== false,
      source: toolResult && toolResult.source || '',
      hasAudioFile: Boolean(toolResult && (toolResult.musicFileID || toolResult.audioFileID || toolResult.fileID)),
      durationMs: toolMs
    })
    const reply = buildVoiceToolResultReply(explicitToolCall, toolResult)
    return {
      success: true,
      source: 'local-voice-explicit-tool',
      provider: 'local',
      model: '',
      reply: normalizeVoiceHealingReply(reply, prompt, turnIndex),
      audioText: compactText(reply, 1800),
      intent: `tool_${explicitToolCall.name}`,
      safety: safetyRoute.safety,
      toolCall: explicitToolCall,
      toolResult,
      evidenceIds: getVoiceEvidenceIds(explicitToolCall),
      retrieval: null,
      latency: { toolMs }
    }
  }

  if (!hasChatProvider()) {
    const fallbackReply = normalizeVoiceHealingReply(
      buildVoiceHealingFallback(prompt, turnIndex),
      prompt,
      turnIndex
    )
    return {
      success: true,
      source: 'local-voice-healing',
      provider: 'local',
      model: '',
      reply: fallbackReply,
      audioText: compactText(fallbackReply, 1800),
      intent: safetyRoute.intent,
      safety: safetyRoute.safety,
      toolCall: null,
      toolResult: null,
      evidenceIds: [],
      retrieval: null,
      latency: { toolMs: 0 }
    }
  }

  const normalizedMessages = normalizeMessages(data.messages || [], prompt)
  const rag = await retrieveArtTherapyContext(prompt, normalizedMessages, {
    scene: 'immersive_voice_healing',
    mode: 'therapist',
    intent: 'voice_healing_turn',
    inputType: 'voice'
  })
  const systemPrompt = buildSystemPrompt('immersive_voice_healing', {
    mode: 'therapist',
    intent: 'voice_healing_turn',
    inputType: 'voice',
    ragContext: rag.context,
    currentUserText: prompt,
    sessionState: data.sessionState
  })

  try {
    const agent = await runVoiceHealingAgent([
      { role: 'system', content: systemPrompt },
      ...normalizedMessages
    ], {
      prompt,
      turnIndex
    })
    const reply = normalizeVoiceHealingReply(
      agent.reply || buildVoiceHealingFallback(prompt, turnIndex),
      prompt,
      turnIndex
    )
    console.info('[completeVoiceHealing] agent result', {
      source: agent.source || '',
      provider: agent.provider || '',
      model: agent.model || '',
      intent: agent.intent || '',
      tool: agent.toolCall && agent.toolCall.name || '',
      promptLength: prompt.length,
      replyLength: reply.length
    })
    return {
      success: true,
      source: agent.source,
      provider: agent.provider,
      model: agent.model,
      reply,
      audioText: compactText(reply, 1800),
      intent: agent.intent || safetyRoute.intent,
      safety: safetyRoute.safety,
      toolCall: agent.toolCall,
      toolResult: agent.toolResult,
      evidenceIds: getVoiceEvidenceIds(agent.toolCall),
      retrieval: { ...rag, sources: rag.sources },
      latency: { toolMs: agent.toolMs || 0 }
    }
  } catch (error) {
    console.warn('[completeVoiceHealing] agent failed, using local reply:', error.message)
    const fallbackReply = normalizeVoiceHealingReply(buildVoiceHealingFallback(prompt, turnIndex), prompt, turnIndex)
    return {
      success: true,
      source: 'local-voice-healing-fallback',
      provider: 'local',
      model: '',
      reply: fallbackReply,
      audioText: compactText(fallbackReply, 1800),
      intent: safetyRoute.intent,
      safety: safetyRoute.safety,
      toolCall: null,
      toolResult: null,
      evidenceIds: [],
      retrieval: { ...rag, sources: rag.sources },
      latency: { toolMs: 0 }
    }
  }
}

async function runVoiceHealingAgent(messages, options = {}) {
  const decision = await requestVoiceAgentDecision(messages, { prompt: options.prompt })

  const toolCall = decision.toolCall
  if (!toolCall) {
    const parsed = parseVoiceAgentDecision(decision.message && decision.message.content)
    return {
      reply: parsed.reply || (decision.message && decision.message.content) || '',
      source: decision.source,
      provider: decision.provider,
      model: decision.model,
      intent: parsed.intent || 'emotional_listening',
      toolCall: null,
      toolResult: null,
      toolMs: 0
    }
  }

  const toolStartedAt = Date.now()
  console.info('[voice.tool] execute', {
    tool: toolCall.name,
    input: toolCall.input || {},
    toolCallId: toolCall.id || ''
  })
  const toolResult = await runVoiceHealingTool({
    tool: toolCall.name,
    input: toolCall.input || {}
  })
  const toolMs = Date.now() - toolStartedAt
  console.info('[voice.tool] result', {
    tool: toolCall.name,
    success: toolResult && toolResult.success !== false,
    source: toolResult && toolResult.source || '',
    hasAudioFile: Boolean(toolResult && (toolResult.musicFileID || toolResult.audioFileID || toolResult.fileID)),
    durationMs: toolMs
  })
  const finalReply = await requestVoiceAgentFinalReply(messages, {
    source: decision.source,
    provider: decision.provider,
    model: decision.model,
    assistantMessage: decision.message,
    toolCall,
    toolResult
  })

  return {
    ...finalReply,
    intent: `tool_${toolCall.name}`,
    toolCall: { ...toolCall, phase: 'execute', requiresConsent: false },
    toolResult,
    toolMs
  }
}

async function requestVoiceAgentDecision(messages, options = {}) {
  try {
    const response = await callConfiguredChatCompletion(messages, {
      maxTokens: 260,
      tools: VOICE_AGENT_TOOLS,
      toolChoice: 'auto'
    })
    const message = response.message || { role: 'assistant', content: '' }
    const parsed = parseVoiceAgentDecision(message.content)
    const toolCall = extractVoiceToolCall(message) || parsed.toolCall
    return { ...response, message, toolCall }
  } catch (error) {
    // 部分 OpenAI 兼容网关不接受 tools 字段时，仍让模型按同一套 Agent prompt
    // 输出严格 JSON 决策，而不是退回关键词路由。
    console.warn('[requestVoiceAgentDecision] native tools unavailable, using JSON protocol:', error.message)
    const response = await callConfiguredChatCompletion(appendVoiceJsonProtocol(messages), { maxTokens: 300 })
    const parsed = parseVoiceAgentDecision(response.message && response.message.content)
    return { ...response, toolCall: parsed.toolCall }
  }
}

async function requestVoiceAgentFinalReply(messages, options = {}) {
  const finalMessages = messages.slice()
  if (options.guardMessage) finalMessages.push({ role: 'system', content: options.guardMessage })
  if (options.toolCall) {
    const assistantMessage = options.assistantMessage && (
      Array.isArray(options.assistantMessage.tool_calls) || options.assistantMessage.function_call
    )
      ? options.assistantMessage
      : {
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: options.toolCall.id || `voice_tool_${Date.now()}`,
          type: 'function',
          function: {
            name: options.toolCall.name,
            arguments: JSON.stringify(options.toolCall.input || {})
          }
        }]
      }
    finalMessages.push(assistantMessage)
    finalMessages.push({
      role: 'tool',
      tool_call_id: options.toolCall.id || `voice_tool_${Date.now()}`,
      name: options.toolCall.name,
      content: compactText(JSON.stringify(options.toolResult || {}), 5000)
    })
  }

  try {
    const response = await callConfiguredChatCompletion(finalMessages, { maxTokens: 260 })
    const parsed = parseVoiceAgentDecision(response.message && response.message.content)
    return {
      reply: parsed.reply || (response.message && response.message.content) || '',
      source: response.source || options.source,
      provider: response.provider || options.provider,
      model: response.model || options.model
    }
  } catch (error) {
    console.warn('[requestVoiceAgentFinalReply] failed:', error.message)
    return {
      reply: buildVoiceToolResultReply(options.toolCall, options.toolResult),
      source: options.source || 'local-voice-tool-fallback',
      provider: options.provider || 'local',
      model: options.model || ''
    }
  }
}

function appendVoiceJsonProtocol(messages) {
  return messages.concat({
    role: 'system',
    content: [
      '当前对话网关不支持原生 function calling。请严格只输出一个 JSON 对象，不要 Markdown，不要额外文字。',
      '格式：{"reply":"给用户的自然中文回复","intent":"简短意图名","tool_call":null 或 {"name":"工具名","arguments":{}}}。',
      '根据整个对话、用户当前状态和工具返回结果，自行判断是否需要 tool_call；没有合适工具时填写 null。不要等待固定确认词，也不要把提到某个练习自动当成调用。'
    ].join('\n')
  })
}

function parseVoiceAgentDecision(content) {
  const text = String(content || '').trim()
  if (!text) return { reply: '', intent: '', toolCall: null }
  const candidates = [
    text,
    text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(),
    extractJsonObject(text)
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
      return {
        reply: String(parsed.reply || parsed.response || '').trim(),
        intent: String(parsed.intent || '').trim(),
        toolCall: normalizeVoiceToolCall(parsed.tool_call || parsed.toolCall || parsed.tool)
      }
    } catch (error) {
      // 继续尝试下一个 JSON 候选；普通自然语言回复会在循环后原样返回。
    }
  }
  return { reply: text, intent: '', toolCall: null }
}

function extractJsonObject(text) {
  const start = String(text || '').indexOf('{')
  const end = String(text || '').lastIndexOf('}')
  if (start === -1 || end <= start) return ''
  return String(text).slice(start, end + 1)
}

function extractVoiceToolCall(message) {
  if (!message) return null
  const calls = Array.isArray(message.tool_calls) ? message.tool_calls : []
  if (calls.length) {
    const call = calls[0]
    return normalizeVoiceToolCall({
      id: call.id,
      name: call.function && call.function.name,
      arguments: call.function && call.function.arguments
    })
  }
  if (message.function_call) {
    return normalizeVoiceToolCall({
      name: message.function_call.name,
      arguments: message.function_call.arguments
    })
  }
  return null
}

function normalizeVoiceToolCall(toolCall) {
  if (!toolCall) return null
  const name = String(toolCall.name || '').trim()
  if (!name || !VOICE_AGENT_TOOL_NAMES.has(name)) return null
  let input = toolCall.input || toolCall.arguments || {}
  if (typeof input === 'string') {
    try { input = JSON.parse(input) } catch (error) { input = {} }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {}
  return {
    id: String(toolCall.id || `voice_tool_${Date.now()}`),
    name,
    input,
    phase: toolCall.phase || 'execute',
    requiresConsent: Boolean(toolCall.requiresConsent)
  }
}

function buildVoiceToolResultReply(toolCall, toolResult) {
  if (!toolCall) return '我在听。你不用急着把这一刻说清楚。'
  if (toolCall.name === 'handoff_support') return '我会先陪你停在这里。现在最重要的是让身边真实的人知道你正需要支持，请尽量不要独处。'
  const result = toolResult || {}
  if (result.instruction) return result.instruction
  if (result.description) return result.description
  if (result.exercise && result.exercise.steps && result.exercise.steps[0]) return result.exercise.steps[0]
  return buildToolStartReply(toolCall.name, toolCall.input || {})
}

async function completeVoiceHealingTurn(data = {}) {
  const planningStartedAt = Date.now()
  const plan = await completeVoiceHealing(data)
  if (!plan.success) return plan

  const latency = {
    planningMs: Date.now() - planningStartedAt,
    ttsMs: 0,
    toolMs: plan.latency && Number(plan.latency.toolMs || 0) || 0
  }
  let ttsResult = null
  if (plan.audioText && !data.isMuted) {
    const ttsStartedAt = Date.now()
    try {
      ttsResult = await synthesizeTts({
        text: plan.audioText,
        voice: data.voice,
        userId: data.userId || 'artcure_voice_user'
      })
      latency.ttsMs = Date.now() - ttsStartedAt
    } catch (error) {
      latency.ttsMs = Date.now() - ttsStartedAt
      ttsResult = {
        success: false,
        code: 'VOICE_TTS_FAILED',
        message: error.message
      }
      }
  }

  return {
    ...plan,
    audioUrl: ttsResult && ttsResult.success ? ttsResult.audioUrl : '',
    audioFileID: ttsResult && ttsResult.success ? ttsResult.fileID : '',
    ttsSource: ttsResult && ttsResult.source,
    toolResult: plan.toolResult && plan.toolResult.success !== false ? plan.toolResult : null,
    toolError: plan.toolResult && plan.toolResult.success === false ? plan.toolResult.message : '',
    latency
  }
}

function normalizeVoiceHealingReply(reply, prompt, turnIndex) {
  const cleaned = String(reply || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*(回复|回答|建议|回应)[:：]\s*/i, '')
    .replace(/^\s*[-*•]\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned) return buildVoiceHealingFallback(prompt, turnIndex)
  if (cleaned.length <= 120) return cleaned

  // 语音回复只保留 2～3 句，避免模型生成较长内容后才进入 TTS。
  const sentences = cleaned.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [cleaned]
  let compact = ''
  for (const sentence of sentences) {
    const next = `${compact}${sentence.trim()}`
    if (next.length > 120 && compact) break
    compact = next
    if ((compact.match(/[。！？!?]/g) || []).length >= 3) break
  }
  return (compact || cleaned.slice(0, 120)).trim()
}

function routeVoiceHealingSafety(prompt, meta = {}) {
  const text = String(prompt || '').trim()
  const normalized = text.replace(/[。！？!?，,、；;：: ]+$/g, '')
  if (hasCrisisSignal(text)) {
    return {
      intent: 'safety_crisis',
      bypassModel: true,
      safety: { level: 'high', action: 'handoff_support' },
      toolCall: {
        name: 'handoff_support',
        phase: 'execute',
        requiresConsent: false,
        reason: '识别到可能的现实危险或自伤/他伤信号',
        input: {}
      },
      reply: '我听见你现在可能正处在很危险、很难独自承受的时刻。先暂停这段练习，尽量不要独处，请马上联系身边可信任的人、当地急救服务或心理危机援助。'
    }
  }

  if (/^(不用|不要|不需要|先不用|停一下|停止|退出|结束|别放)/i.test(normalized)) {
    return {
      intent: 'decline_or_stop',
      bypassModel: true,
      safety: { level: 'normal', action: 'cancel_pending_tool' },
      toolCall: null,
      reply: '好，我们先不做这个练习，也不播放声音。我会留在这里，你想继续说，或者安静一会儿，都可以。'
    }
  }

  return {
    intent: 'emotional_listening',
    bypassModel: false,
    safety: { level: 'normal', action: 'continue' },
    toolCall: null,
    reply: ''
  }
}

function routeVoiceHealingExplicitTool(prompt) {
  const text = String(prompt || '').trim()
  if (!text) return null

  const requestsSoundscape = /(?:启动|开始|播放|放|打开|来一段|给我一段).{0,12}(?:声音陪伴|环境音|音景|背景音|雨声|海浪声|白噪音|粉红噪声|棕噪声)/.test(text) ||
    /(?:声音陪伴|环境音|音景|背景音|雨声|海浪声|白噪音|粉红噪声|棕噪声).{0,12}(?:吧|可以|好|要|行)/.test(text)
  if (!requestsSoundscape) return null

  return {
    id: `voice_tool_direct_${Date.now()}`,
    name: 'start_soundscape',
    input: {
      soundscape: inferSoundscape(text),
      duration: 180,
      volume: 0.34
    },
    phase: 'execute',
    requiresConsent: false
  }
}

function inferSoundscape(text) {
  if (/rain|雨/.test(text)) return 'rain'
  if (/ocean|海|浪|自然/.test(text)) return 'ocean'
  if (/white_noise|白噪|噪音|吵/.test(text)) return 'white_noise'
  if (/brown_noise|棕噪|低沉|压迫|沉下来/.test(text)) return 'brown_noise'
  if (/night|夜|睡/.test(text)) return 'night'
  return 'pink_noise'
}

function buildToolStartReply(tool, input = {}) {
  if (tool === 'start_soundscape') {
    return `我为你准备一段低音量的${getSoundscapeLabel(inferSoundscape(String(input.soundscape || '')))}音景。你不用配合说话，如果不舒服，随时告诉我“停一下”。`
  }
  if (tool === 'start_breathing') {
    return '我们先做四轮自然呼吸：吸气四秒，呼气六秒，不屏息。任何不舒服都回到自然呼吸。'
  }
  if (tool === 'start_grounding') {
    return '我们做一个很短的感官接地：感受双脚或座面的接触，再找一个听得见的声音和一处愿意看的颜色。'
  }
  if (tool === 'start_art_exercise') {
    return '如果你愿意，拿一张纸画三分钟连续线条。让笔尖慢慢走，不追求画得像，停下后再看看最先注意到的地方。'
  }
  return '我会陪你慢慢来。'
}

function getVoiceEvidenceIds(toolCall) {
  if (!toolCall || !voiceHealingSkills[toolCall.name]) return []
  return (voiceHealingSkills[toolCall.name].sources || []).map(source => source.title)
}

function buildVoiceHealingFallback(prompt, turnIndex) {
  const text = String(prompt || '').trim()
  if (/^(嗯+|好+|好的?|可以|行|知道了|没有|没事|谢谢)[。！!，,。 ]*$/i.test(text) && Number(turnIndex || 0) > 0) {
    return '嗯，我在。我们不用急着往下走，安静一会儿也可以。等你愿意时，告诉我一个刚刚掠过脑子的词就好。'
  }

  if (/累|疲惫|工作|加班|撑不住|耗尽/.test(text)) {
    return '听起来你今天被消耗了不少。先不用把自己调整好，我陪你安静坐一会儿。现在更想说说发生了什么，还是只想听一点安静的声音？'
  }
  if (/焦虑|紧张|心慌|喘|胸口|害怕|发抖/.test(text)) {
    return '这会儿身体好像比语言更早感到紧张，像是已经撑了一阵子。先不用解决它，你现在最明显的感觉在胸口、肩膀，还是脑子里？'
  }
  if (/难过|委屈|失望|想哭|孤单|低落/.test(text)) {
    return '这句话里有一点难过，我先陪你把它放在这里，不急着解释。你更想让我听你说，还是先陪你安静一会儿？'
  }

  if (text) {
    return `我听见你刚才说：“${compactText(text, 72)}”。我先不替你下结论。你想让我先听你说说，还是陪你做一个很短的练习？`
  }

  return '我在这儿。你不用把话说得完整，想从哪一点开始都可以。'
}

function hasLlmKey() {
  return Boolean(getLlmApiKey())
}

function getLlmApiKey() {
  return getConfigValue('LLM_API_KEY') || ''
}

function hasJiuwenKey() {
  return Boolean(getJiuwenApiKey())
}

function getJiuwenApiKey() {
  return getConfigValue('JIUWEN_API_KEY') || ''
}

function hasChatProvider() {
  return hasLlmKey() || hasVivoKey() || hasJiuwenKey()
}

function hasVivoKey() {
  return Boolean(getConfigValue('VIVO_APP_KEY'))
}

function hasVivoPoiKey() {
  return hasVivoKey()
}

function getConfigValue(key) {
  return process.env[key] || localConfig[key] || ''
}

function normalizeConfigValue(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

function getRequiredConfigValue(key) {
  const value = String(getConfigValue(key) || '').trim()
  if (!value) {
    throw createGatewayError(
      'CONFIG_MISSING',
      `缺少云函数环境变量 ${key}，请在 vivoAigcGateway 的环境变量中配置`
    )
  }
  return value
}

function getRequiredLlmBaseUrl() {
  return normalizeConfigValue(getRequiredConfigValue('LLM_BASE_URL'))
}

function getRequiredVivoBaseUrl() {
  return normalizeConfigValue(getRequiredConfigValue('VIVO_API_BASE'))
}

function getRequiredVivoPoiBaseUrl() {
  return normalizeConfigValue(getRequiredConfigValue('VIVO_POI_BASE_URL'))
}

function getRequiredVivoWsHost() {
  return normalizeConfigValue(getRequiredConfigValue('VIVO_WS_HOST'))
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
      message: 'AI 服务鉴权失败：请检查 vivoAigcGateway 云函数环境变量 LLM_API_KEY 是否有效，并重新上传部署云函数。'
    }
  }

  if (/LLM_API_KEY/.test(message)) {
    return {
      code: 'LLM_KEY_MISSING',
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

  if (scene === 'immersive_voice_healing') {
    const knowledge = meta.ragContext
      ? `【可参考的艺术疗愈知识】\n${meta.ragContext}\n`
      : '【可参考的艺术疗愈知识】\n可适当参考一些合适的艺术疗愈技巧和引导。\n'
    const currentUserText = String(meta.currentUserText || '').trim()
    const currentUserAnchor = currentUserText
      ? [
        '【本轮用户】',
        `用户原话：“${compactText(currentUserText, 360)}”`,
        '请围绕这句话自然回应；如果没有听清或意思不完整，先简单确认，不要自行猜测。'
      ].join('\n')
      : '【本轮用户】请围绕最后一条 role=user 消息自然回应。'
    return [
      '你是“艺呦”，一位通过手机语音陪伴用户的艺术疗愈师 AI。',
      '你提供的是自我觉察、情绪支持和低风险练习，不能诊断、不能替代心理咨询或医疗服务。',
      '如果用户表达自伤、伤害他人、强烈绝望或现实危险，先温和提醒联系身边可信任的人、当地紧急服务或专业危机援助。',
      knowledge,
      '【当前任务】进行“听与说”的沉浸式艺术疗愈。用户可能闭着眼，只靠听和说参与。',
      currentUserAnchor,
      '【工具决策规则】',
      '1. 通过理解用户此刻的需要，自行判断是否调用播放声音、做呼吸、接地、画画或分析作品等工具。',
      '2. 如果决定使用工具，直接发起对应的 tool_call，不要只在回复里说“准备好了”或“开始了”；等工具返回结果后，再自然地告诉用户下一步。',
      '3. 用户明确表示不要、停止或不舒服时，停止当前练习；一次只调用一个最合适的工具。',
      '【表达方式】',
      '语气自然、温和、口语化，适合直接播报，模仿真实疗愈师直接对话的形式，也不要太死板。根据用户说的内容做自然的回应，不必每次提问或提出练习。',
      '回复通常控制在约 20～120 个中文字符，简单回应可以更短，内容复杂时可以适当展开。不要做心理诊断或替代专业服务。'
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
  if (scene === 'immersive_voice_healing' || intent === 'voice_healing_turn') {
    return { maxTokens: 220 }
  }

  if (isGuideIntent(scene, intent)) {
    return { maxTokens: 1500 }
  }
  if (isShortCompanionMode(scene, mode, intent)) {
    return { maxTokens: 260 }
  }
  if (isTreeHoleMode(scene, mode, intent)) {
    return { maxTokens: 560 }
  }
  if (isTherapistChatMode(scene, mode, intent)) {
    return { maxTokens: 1000 }
  }
  return { maxTokens: 1200 }
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

  // 当前 LLM 已切换到独立 OpenAI 兼容接口，知识库使用本地关键词排序，
  // 避免这一轮请求额外触发 vivo 的 rerank 服务。

  const topK = meta.intent === 'three_minute_guide' || meta.scene === 'three_minute_guide' ? 5 : 4
  const selected = ranked.slice(0, topK)

  return {
    query,
    ranker,
    context: formatKnowledgeContext(selected),
    sources: selected.map(item => ({
      id: item.id,
      title: item.title,
      score: typeof item.score === 'number' ? Number(item.score.toFixed(4)) : item.score,
      evidenceLevel: item.evidenceLevel || 'unclassified',
      sourceUrls: item.sourceUrls || []
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
    url: `${getRequiredVivoBaseUrl()}/rerank?requestId=${encodeURIComponent(requestId)}`,
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
  const normalized = String(text || '')
  const keywords = [
    '自杀',
    '自残',
    '伤害自己',
    '不想活',
    '活不下去',
    '结束生命',
    '想死',
    '想消失',
    '没有活着的意义',
    '伤害别人',
    '杀人'
  ]
  return keywords.some(keyword => normalized.includes(keyword))
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
  if (scene === 'immersive_voice_healing') {
    return buildVoiceHealingFallback(userText, Number(meta.turnIndex || 0))
  }

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

async function resolveArtworkImageInput({ fileID, imageUrl }) {
  if (imageUrl) return String(imageUrl)
  const file = await getCloudFileBuffer(fileID)
  return `data:${file.contentType};base64,${file.buffer.toString('base64')}`
}

async function callLlmArtworkVision({ imageInput, prompt, sourceType }) {
  const query = buildArtworkVisionQuery({ prompt, sourceType })
  const llmBaseUrl = getRequiredLlmBaseUrl()
  const llmVisionModel = getRequiredConfigValue('LLM_VISION_MODEL')
  const llmApiKey = getRequiredConfigValue('LLM_API_KEY')

  console.log('[artwork.analyze] call llm vision', {
    inputType: imageInput.startsWith('data:') ? 'data-url' : 'remote-url',
    queryLength: query.length,
    sourceType
  })

  const response = await requestJson({
    method: 'POST',
    url: `${llmBaseUrl}${LLM_CHAT_PATH}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${llmApiKey}`
    },
    body: buildLlmPayload({
      model: llmVisionModel,
      messages: [
        {
          role: 'system',
          content: '你是艺呦艺术疗愈陪伴的创作观察助手。只做画面观察和低风险自我觉察引导，不做心理诊断，不武断解释象征意义。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: query },
            { type: 'image_url', image_url: { url: imageInput } }
          ]
        }
      ],
      maxTokens: 900
    }),
    timeout: 60000
  })

  const answer = extractChatCompletionContent(response)
  console.log('[artwork.analyze] llm vision response', {
    responseKeys: response && typeof response === 'object' ? Object.keys(response) : [],
    hasAnswer: Boolean(answer),
    answerLength: String(answer || '').length
  })

  if (!answer) {
    throw new Error(`LLM 视觉接口返回了空回复：${JSON.stringify(response).slice(0, 1000)}`)
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

async function callConfiguredChatCompletion(messages, options = {}) {
  if (hasLlmKey()) {
    try {
      const response = await callLlmChatCompletion(messages, options)
      const message = extractChatCompletionMessage(response)
      if (!message) throw new Error('LLM 接口没有返回 assistant message')
      return {
        message,
        source: 'llm',
        provider: 'openai-compatible',
        model: options.model || DEFAULT_CHAT_MODEL
      }
    } catch (error) {
      if (!hasVivoKey() && !hasJiuwenKey()) throw error
      console.warn('[callConfiguredChatCompletion] LLM provider failed, trying configured vivo provider:', error.message)
    }
  }

  if (hasVivoKey()) {
    try {
      const response = await callVivoChatCompletion(messages, options)
      const message = extractChatCompletionMessage(response)
      if (!message) throw new Error('vivo 接口没有返回 assistant message')
      return {
        message,
        source: 'vivo-llm',
        provider: 'vivo-compatible',
        model: options.model || VIVO_CHAT_MODEL
      }
    } catch (error) {
      if (!hasJiuwenKey()) throw error
      console.warn('[callConfiguredChatCompletion] vivo provider failed, trying Jiuwen:', error.message)
    }
  }

  if (hasJiuwenKey()) {
    const reply = await callJiuwenTextChat(messages)
    return {
      message: { role: 'assistant', content: reply },
      source: 'jiuwen-llm',
      provider: 'jiuwen-compatible',
      model: options.model || VIVO_CHAT_MODEL
    }
  }

  throw new Error('未配置可用的对话模型')
}

async function callConfiguredChat(messages, options = {}) {
  const result = await callConfiguredChatCompletion(messages, options)
  const reply = extractChatMessageContent(result.message)
  if (!reply) throw new Error('对话模型返回了空回复')
  return { ...result, reply }
}

async function callVivoChat(messages, options = {}) {
  const response = await callVivoChatCompletion(messages, options)
  const content = extractChatCompletionContent(response)
  if (!content) throw new Error('vivo/九问对话模型接口返回了空回复')
  return content
}

async function callVivoChatCompletion(messages, options = {}) {
  const requestId = createRequestId()
  const vivoBaseUrl = getRequiredVivoBaseUrl()
  const payload = {
    model: options.model || VIVO_CHAT_MODEL,
    messages,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.65,
    max_tokens: options.maxTokens || 1200,
    stream: false
  }
  if (Array.isArray(options.tools) && options.tools.length) {
    payload.tools = options.tools
    payload.tool_choice = options.toolChoice || 'auto'
  }
  const candidates = []
  const encodedRequestId = encodeURIComponent(requestId)
  const vivoKey = getConfigValue('VIVO_APP_KEY')
  const jiuwenKey = getJiuwenApiKey()

  if (vivoKey) {
    candidates.push(
      {
        name: 'vivo-openai-request-id',
        url: `${vivoBaseUrl}/v1/chat/completions?request_id=${encodedRequestId}`,
        apiKey: vivoKey
      },
      {
        name: 'vivo-openai-requestId',
        url: `${vivoBaseUrl}/v1/chat/completions?requestId=${encodedRequestId}`,
        apiKey: vivoKey
      }
    )
  }
  if (jiuwenKey) {
    candidates.push({
      name: 'jiuwen-openai-request-id',
      url: `${JIUWEN_BASE_URL}/chat/completions?request_id=${encodedRequestId}`,
      apiKey: jiuwenKey
    })
  }

  let lastError = null
  for (const candidate of candidates) {
    try {
      const response = await requestJson({
        method: 'POST',
        url: candidate.url,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${candidate.apiKey}`
        },
        body: payload,
        timeout: 45000
      })
      const message = extractChatCompletionMessage(response)
      if (message && (extractChatMessageContent(message) || Array.isArray(message.tool_calls) || message.function_call)) {
        console.info('[callVivoChat] remote model response', {
          endpoint: candidate.name,
          model: payload.model,
          replyLength: extractChatMessageContent(message).length,
          hasToolCalls: Boolean(message.tool_calls || message.function_call)
        })
        return response
      }
      lastError = new Error(`${candidate.name} 返回了空回复`)
    } catch (error) {
      lastError = error
      console.warn('[callVivoChat] endpoint failed:', candidate.name, error.message)
    }
  }

  // 九问的 chat-messages 接口不是 OpenAI 兼容格式，作为已配置的 vivo
  // 模型入口再尝试一次，避免网关只因为 endpoint 版本差异落到本地固定回复。
  if (jiuwenKey) {
    try {
      const answer = await callJiuwenTextChat(messages)
      if (answer) {
        return {
          choices: [{ message: { role: 'assistant', content: answer } }]
        }
      }
    } catch (error) {
      lastError = error
      console.warn('[callVivoChat] jiuwen chat-messages failed:', error.message)
    }
  }

  throw lastError || new Error('vivo/九问对话模型接口调用失败')
}

async function callJiuwenTextChat(messages) {
  const response = await requestJson({
    method: 'POST',
    url: `${JIUWEN_BASE_URL}${JIUWEN_CHAT_MESSAGES_PATH}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${getJiuwenApiKey()}`
    },
    body: {
      inputs: {},
      query: buildJiuwenTextQuery(messages),
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
  const normalized = Array.isArray(messages)
    ? messages.filter(item => item && item.content).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : item.role === 'system' ? 'system' : 'user',
      content: String(item.content)
    }))
    : []
  const dialog = normalized
    .filter(item => item.role !== 'system')
    .map(item => `${item.role === 'assistant' ? '艺呦' : '用户'}：${item.content}`)
    .slice(-8)
    .join('\n')
  const system = normalized
    .filter(item => item.role === 'system')
    .map(item => item.content)
    .join('\n')
  return compactText([
    system ? `请遵守以下角色和安全边界：\n${system}` : '',
    '请根据下面的对话生成最后一轮回复：',
    dialog
  ].filter(Boolean).join('\n\n'), 6000)
}

function extractJiuwenAnswer(response) {
  const data = response && response.data
  const dataOutputs = data && data.outputs
  const outputs = response && response.outputs
  return String(
    (response && response.answer) ||
    (data && data.answer) ||
    (dataOutputs && (dataOutputs.answer || dataOutputs.text)) ||
    (outputs && (outputs.answer || outputs.text)) ||
    ''
  ).trim()
}

async function callLlmChat(messages, options = {}) {
  const response = await callLlmChatCompletion(messages, options)
  const content = extractChatCompletionContent(response)
  if (content) return content
  throw new Error('LLM 接口返回了空回复')
}

async function callLlmChatCompletion(messages, options = {}) {
  const llmBaseUrl = getRequiredLlmBaseUrl()
  const llmModel = options.model || getRequiredConfigValue('LLM_MODEL')
  const llmApiKey = getRequiredConfigValue('LLM_API_KEY')
  const payload = buildLlmPayload({
    model: llmModel,
    messages,
    maxTokens: options.maxTokens || 1200,
    tools: options.tools,
    toolChoice: options.toolChoice
  })

  const response = await requestJson({
    method: 'POST',
    url: `${llmBaseUrl}${LLM_CHAT_PATH}`,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${llmApiKey}`
    },
    body: payload,
    timeout: 45000
  })

  const message = extractChatCompletionMessage(response)
  if (message && (extractChatMessageContent(message) || Array.isArray(message.tool_calls) || message.function_call)) return response
  throw new Error('LLM 接口返回了空回复')
}

function buildLlmPayload({ model, messages, maxTokens, tools, toolChoice }) {
  const payload = {
    model,
    messages,
    max_completion_tokens: maxTokens,
    stream: false
  }
  if (Array.isArray(tools) && tools.length) {
    payload.tools = tools
    payload.tool_choice = toolChoice || 'auto'
  }
  return payload
}

function extractChatCompletionMessage(response) {
  const choices = response && response.choices
  const firstChoice = Array.isArray(choices) ? choices[0] : null
  return firstChoice && firstChoice.message ? firstChoice.message : null
}

function extractChatMessageContent(message) {
  const content = message && message.content
  if (Array.isArray(content)) {
    return content
      .map(item => typeof item === 'string' ? item : item && (item.text || item.content) || '')
      .join('')
      .trim()
  }
  return typeof content === 'string' ? content.trim() : ''
}

function extractChatCompletionContent(response) {
  return extractChatMessageContent(extractChatCompletionMessage(response))
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
  return `${getRequiredVivoPoiBaseUrl()}/search/geo` +
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
