const TOOL_META = {
  healing_music: { name: '声音疗愈', description: '生成一段粉红或棕噪环境声', icon: '♫' },
  mindfulness: { name: '正念鼓励', description: '把注意力带回此刻的身体感受', icon: '◌' },
  breathing: { name: '呼吸引导', description: '生成带节律提示音的呼吸练习', icon: '◒' }
}

const OPENING_TEXT = '欢迎来到这一小段安静的时间。先不用急着说明发生了什么。让脚底找到地面，吸气，再慢慢呼气。等我开始聆听时，你可以只说一个词、一种颜色，或者身体此刻最明显的感觉。'
const SILENCE_TO_STOP_MS = 1500
const AUDIO_TO_MIC_SETTLE_MS = 900
const SILENCE_MONITOR_INTERVAL_MS = 200
const SPEECH_RMS_THRESHOLD = 180
const VOICE_OPTIONS = [
  { name: '知性柔美', value: 'F245_natural' },
  { name: '俊朗男声', value: 'M24' },
  { name: '理性男声', value: 'M193' },
  { name: '电台主播', value: 'GAME_GIR_LTY' }
]

Page({
  data: {
    messages: [],
    sessionActive: false,
    isRecording: false,
    isThinking: false,
    isSpeaking: false,
    isMuted: false,
    statusText: '准备好后，点击开始对话',
    elapsedText: '00:00',
    sessionRound: 0,
    toolSummary: '陪伴已准备',
    toolEvents: [],
    scrollToMessage: '',
    waveLevel: 0,
    conversationPhase: 'idle',
    voiceOptions: VOICE_OPTIONS,
    voiceIndex: 0,
    selectedVoice: VOICE_OPTIONS[0].value,
    selectedVoiceName: VOICE_OPTIONS[0].name
  },

  onLoad() {
    this.pageAlive = true
    this.sessionToken = 0
    this.assistantPlaybackActive = false
    this.pendingHealingTool = null
    this.currentSpeechText = ''
    this.currentSpeechToken = 0
    this.currentSpeechRetry = 0
    this.currentSpeechTiming = null
    const savedVoice = wx.getStorageSync('voice-healing-voice')
    const savedIndex = VOICE_OPTIONS.findIndex(item => item.value === savedVoice)
    if (savedIndex >= 0) {
      this.setData({
        voiceIndex: savedIndex,
        selectedVoice: VOICE_OPTIONS[savedIndex].value,
        selectedVoiceName: VOICE_OPTIONS[savedIndex].name
      }, () => this.prepareOpeningAudio())
    } else {
      this.prepareOpeningAudio()
    }
    this.recorderManager = wx.getRecorderManager()
    this.audioContext = wx.createInnerAudioContext()
    this.musicContext = wx.createInnerAudioContext()
    this.bindRecorderEvents()
    this.bindAudioEvents()
    this.musicContext.onEnded(() => {
      if (this.musicContext && !this.musicContext.loop) this.ambientAudioActive = false
    })
  },

  onUnload() {
    this.pageAlive = false
    this.sessionToken += 1
    this.stopSessionResources()
  },

  bindRecorderEvents() {
    this.recorderManager.onFrameRecorded((frame) => {
      this.handleRecorderFrame(frame)
    })

    this.recorderManager.onStart(() => {
      this.recordingRequested = false
      if (!this.pageAlive || !this.data.sessionActive) {
        this.recordOptions = { skip: true }
        try { this.recorderManager.stop() } catch (error) { /* 页面已离开 */ }
        return
      }
      this.voiceActivity = {
        hasSpeech: false,
        lastSpeechAt: 0,
        stopping: false,
        speechFrames: 0
      }
      this.recordingStartedAt = Date.now()
      this.setData({
        isRecording: true,
        conversationPhase: 'listening',
        statusText: '轮到你说了，说完后停顿 1.5 秒即可'
      })
      this.startSilenceMonitor()
    })

    this.recorderManager.onStop((result) => {
      const options = this.recordOptions || {}
      this.recordOptions = null
      this.recordingRequested = false
      this.stopSilenceMonitor()
      if (!this.pageAlive || options.skip) return
      this.setData({ isRecording: false, conversationPhase: 'transcribing' })
      this.handleVoiceStop(result, options.token)
    })

    this.recorderManager.onError((error) => {
      console.error('[Voice Healing] recorder error', error)
      this.recordOptions = null
      this.recordingRequested = false
      this.stopSilenceMonitor()
      if (!this.pageAlive) return
      this.setData({ isRecording: false, conversationPhase: 'idle', statusText: '麦克风没有准备好，请再试一次' })
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
    })
  },

  bindAudioEvents() {
    this.audioContext.onPlay(() => {
      if (!this.pageAlive || !this.data.sessionActive) return
      if (this.currentSpeechTiming) {
        const timing = this.currentSpeechTiming
        console.info('[Voice Healing] latency', {
          uploadMs: timing.uploadMs || 0,
          asrMs: timing.asrMs || 0,
          agentMs: timing.agentMs || 0,
          ttsMs: timing.ttsRequestMs || 0,
          audioReadyToPlayMs: timing.audioReadyAt ? Date.now() - timing.audioReadyAt : 0,
          totalMs: timing.recordStopAt ? Date.now() - timing.recordStopAt : 0
        })
      }
      this.setData({ isSpeaking: true, conversationPhase: 'assistantSpeaking', statusText: '艺呦正在说话，请先听她说完' })
    })
    this.audioContext.onEnded(() => {
      // stop() 触发的旧结束事件不能结束当前这一轮开场语音，也不能启动录音。
      if (!this.pageAlive || !this.data.sessionActive || !this.data.isSpeaking || !this.assistantPlaybackActive) return
      this.assistantPlaybackActive = false
      this.setData({ isSpeaking: false })
      this.resumeAmbientAudio()
      if (this.data.sessionActive) {
        this.setData({ conversationPhase: 'listening', statusText: '轮到你说了，说完后停顿 1.5 秒即可' })
        const pendingTool = this.pendingHealingTool
        this.pendingHealingTool = null
        if (pendingTool && this.isSessionTokenActive(pendingTool.token)) {
          this.runHealingTool(pendingTool.toolCall, pendingTool.token)
        }
        // 给手机扬声器和麦克风留出消除残响的时间，避免第一段把艺呦的尾音录进去。
        this.scheduleListening(AUDIO_TO_MIC_SETTLE_MS, this.sessionToken)
      }
    })
    this.audioContext.onError((error) => {
      console.warn('[Voice Healing] tts play error', error)
      if (!this.pageAlive || !this.data.sessionActive || !this.data.isSpeaking || !this.assistantPlaybackActive) return

      // 临时 URL 失效或音频上下文首次播放失败时，重新请求一次 TTS，
      // 避免开场语音或回复只显示文字却完全没有声音。
      if (this.currentSpeechText && this.currentSpeechToken === this.sessionToken && this.currentSpeechRetry < 1) {
        this.currentSpeechRetry += 1
        this.assistantPlaybackActive = true
        this.setData({ statusText: '语音连接不稳定，正在重试' })
        this.speakText(this.currentSpeechText, this.currentSpeechToken, '')
        return
      }

      this.assistantPlaybackActive = false
      this.setData({ isSpeaking: false })
      this.resumeAmbientAudio()
      if (this.data.sessionActive) {
        this.setData({ conversationPhase: 'listening', statusText: '语音暂时没播放出来，轮到你说了' })
        this.scheduleListening(AUDIO_TO_MIC_SETTLE_MS, this.sessionToken)
      }
    })
  },

  onClose() {
    if (this.data.sessionActive) {
      wx.showModal({
        title: '结束这段疗愈？',
        content: '你的对话会保留在本次页面中，结束后可以回到聊天页。',
        confirmText: '结束',
        cancelText: '继续',
        success: (res) => { if (res.confirm) this.finishSession(true) }
      })
      return
    }
    this.stopSessionResources()
    wx.navigateBack()
  },

  onToggleMute() {
    const isMuted = !this.data.isMuted
    this.setData({ isMuted })
    if (isMuted) {
      this.stopAudioContextSafely(this.audioContext, 'tts')
      this.stopAudioContextSafely(this.musicContext, 'ambient')
      this.ambientAudioActive = false
      this.ambientAudioPaused = false
      if (this.data.sessionActive && !this.data.isRecording && !this.data.isThinking) {
        this.setData({ isSpeaking: false, conversationPhase: 'listening', statusText: '声音已静音，轮到你说了' })
        this.scheduleListening(200, this.sessionToken)
      }
    }
    if (!isMuted && this.data.sessionActive) {
      this.setData({ statusText: '声音已打开，轮到你说了' })
    }
  },

  onMainControl() {
    if (!this.data.sessionActive) {
      this.requestMicrophoneAndStart()
      return
    }
    if (this.data.isRecording) {
      this.stopRecording()
      return
    }
    if (this.data.isThinking || this.data.isSpeaking || this.data.conversationPhase === 'assistantSpeaking') return
    this.startListening()
  },

  onVoiceChange(event) {
    const index = Number(event.detail.value)
    const option = VOICE_OPTIONS[index]
    if (!option) return
    this.setData({
      voiceIndex: index,
      selectedVoice: option.value,
      selectedVoiceName: option.name
    }, () => this.prepareOpeningAudio())
    wx.setStorageSync('voice-healing-voice', option.value)
    this.openingAudioUrl = ''
    this.openingAudioVoice = ''
    wx.showToast({ title: `已选择${option.name}`, icon: 'none' })
  },

  requestMicrophoneAndStart() {
    // 开场语音不再等待授权回调；授权弹窗与开场语音准备并行，减少首次点击等待。
    this.startSession()
    wx.authorize({
      scope: 'scope.record',
      success: () => {},
      fail: () => {
        if (this.data.sessionActive) this.finishSession(false)
        wx.showModal({
          title: '需要麦克风权限',
          content: '开启麦克风后，艺呦才能听见你的声音。',
          confirmText: '去设置',
          success: (res) => { if (res.confirm) wx.openSetting() }
        })
      }
    })
  },

  startSession() {
    const opening = OPENING_TEXT
    this.stopAudioContextSafely(this.audioContext, 'tts')
    this.stopAudioContextSafely(this.musicContext, 'ambient')
    this.ambientAudioActive = false
    this.ambientAudioPaused = false
    if (this.listenTimer) clearTimeout(this.listenTimer)
    this.listenTimer = null
    if (this.recorderManager && (this.data.isRecording || this.recordingRequested)) {
      this.recordOptions = { skip: true }
      try { this.recorderManager.stop() } catch (error) { console.warn('[Voice Healing] previous recorder stop skipped', error) }
    }
    this.recordingRequested = false
    this.assistantPlaybackActive = true
    this.pendingHealingTool = null
    this.currentSpeechTiming = null
    this.sessionToken += 1
    const token = this.sessionToken
    this.sessionStartedAt = Date.now()
    this.setData({
      sessionActive: true,
      statusText: '艺呦正在说话，请先听她说完',
      conversationPhase: 'assistantSpeaking',
      isSpeaking: false,
      isThinking: false,
      isRecording: false,
      elapsedText: '00:00',
      sessionRound: 0,
      messages: [{ id: this.createId(), role: 'assistant', text: opening }],
      toolEvents: [],
      toolSummary: '陪伴已开始'
    }, () => {
      // 必须等 sessionActive 真正写入页面数据后再调用 speakText，
      // 否则真机上 isSessionTokenActive 可能误判为无效，直接跳过开场 TTS。
      if (!this.isSessionTokenActive(token)) return
      const cachedOpening = this.openingAudioVoice === this.data.selectedVoice ? this.openingAudioUrl : ''
      this.speakText(opening, token, cachedOpening)
    })
    this.startSessionTimer()
    this.scrollToLatest()
  },

  async prepareOpeningAudio() {
    const voice = this.data.selectedVoice
    if (this.openingAudioLoadingVoice === voice) return
    this.openingAudioLoadingVoice = voice
    const cacheKey = `voice-healing-opening-${voice}`
    try {
      const cachedFileID = wx.getStorageSync(cacheKey)
      if (cachedFileID) {
        const cachedUrlResult = await wx.cloud.getTempFileURL({ fileList: [cachedFileID] })
        const cachedUrl = cachedUrlResult.fileList && cachedUrlResult.fileList[0] && cachedUrlResult.fileList[0].tempFileURL
        if (cachedUrl && this.pageAlive && this.data.selectedVoice === voice) {
          this.openingAudioUrl = cachedUrl
          this.openingAudioVoice = voice
          return
        }
        wx.removeStorageSync(cacheKey)
      }

      const response = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: { action: 'voice.tts', data: { text: OPENING_TEXT, voice } }
      })
      const result = response.result || {}
      if (!result.success || !result.audioUrl || !this.pageAlive || this.data.selectedVoice !== voice) return
      this.openingAudioUrl = result.audioUrl
      this.openingAudioVoice = voice
      if (result.fileID) wx.setStorageSync(cacheKey, result.fileID)
    } catch (error) {
      console.warn('[Voice Healing] opening audio prepare failed', error)
    } finally {
      if (this.openingAudioLoadingVoice === voice) this.openingAudioLoadingVoice = ''
    }
  },

  startSessionTimer() {
    if (this.sessionTimer) clearInterval(this.sessionTimer)
    this.sessionTimer = setInterval(() => {
      if (!this.pageAlive || !this.data.sessionActive || !this.sessionStartedAt) return
      const seconds = Math.floor((Date.now() - this.sessionStartedAt) / 1000)
      const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
      const rest = String(seconds % 60).padStart(2, '0')
      this.setData({ elapsedText: `${minutes}:${rest}` })
    }, 1000)
  },

  scheduleListening(delay, token = this.sessionToken) {
    if (this.listenTimer) clearTimeout(this.listenTimer)
    this.listenTimer = setTimeout(() => {
      this.listenTimer = null
      if (this.isSessionTokenActive(token) && !this.assistantPlaybackActive && !this.data.isRecording && !this.data.isThinking && !this.data.isSpeaking) this.startListening()
    }, delay)
  },

  startListening() {
    if (!this.data.sessionActive || this.data.isRecording || this.data.isThinking || this.data.isSpeaking || this.recordingRequested) return
    this.assistantPlaybackActive = false
    this.stopAudioContextSafely(this.audioContext, 'tts')
    this.pauseAmbientAudio()
    const token = this.sessionToken
    this.recordOptions = { skip: false, token }
    this.recordingRequested = true
    this.voiceActivity = {
      hasSpeech: false,
      lastSpeechAt: 0,
      stopping: false,
      speechFrames: 0
    }
    this.setData({ conversationPhase: 'listening', statusText: '正在听你说，说完后停顿 1.5 秒即可' })
    try {
      this.recorderManager.start({
        duration: 30000,
        sampleRate: 16000,
        numberOfChannels: 1,
        // vivo ASR 要求 16kHz / 16bit / 单声道 PCM；与 ai-chat 页面保持同一录音格式。
        format: 'pcm',
        frameSize: 4
      })
    } catch (error) {
      this.recordingRequested = false
      this.recordOptions = null
      this.setData({ conversationPhase: 'idle', statusText: '麦克风没有准备好，请再试一次' })
      console.warn('[Voice Healing] recorder start error', error)
    }
  },

  handleRecorderFrame(frame) {
    if (!this.data.isRecording || !frame || !frame.frameBuffer) return
    const bytes = new Uint8Array(frame.frameBuffer)
    if (bytes.length < 4) return

    let energy = 0
    let sampleCount = 0
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      const sample = bytes[index] | (bytes[index + 1] << 8)
      const signedSample = sample > 32767 ? sample - 65536 : sample
      energy += signedSample * signedSample
      sampleCount += 1
    }

    const rms = Math.sqrt(energy / Math.max(sampleCount, 1))
    const now = Date.now()
    const voiceActivity = this.voiceActivity || { hasSpeech: false, lastSpeechAt: 0, stopping: false, speechFrames: 0 }
    // 520 对部分手机麦克风过高，会导致整句话都没有被 VAD 记为有效语音。
    // 这里只负责判断“说完”，完整录音仍会上传给 ASR，不会裁掉用户的声音。
    if (rms > SPEECH_RMS_THRESHOLD) {
      voiceActivity.speechFrames += 1
      voiceActivity.hasSpeech = true
      voiceActivity.lastSpeechAt = now
      this.voiceActivity = voiceActivity
      return
    }

    if (voiceActivity.hasSpeech && !voiceActivity.stopping && now - voiceActivity.lastSpeechAt >= SILENCE_TO_STOP_MS) {
      voiceActivity.stopping = true
      this.voiceActivity = voiceActivity
      this.setData({ statusText: '听到了，正在整理你的话' })
      try { this.recorderManager.stop() } catch (error) { console.warn('[Voice Healing] recorder stop error', error) }
    }
  },

  stopRecording() {
    if (this.data.isRecording || this.recordingRequested) {
      if (this.voiceActivity) this.voiceActivity.stopping = true
      this.setData({
        isThinking: true,
        conversationPhase: 'transcribing',
        statusText: '听到了，正在整理你的话'
      })
      try {
        this.recorderManager.stop()
      } catch (error) {
        this.setData({ isThinking: false, conversationPhase: 'idle', statusText: '录音没有正常结束，请点击“我来说”重试' })
        console.warn('[Voice Healing] recorder stop error', error)
      }
    }
  },

  startSilenceMonitor() {
    this.stopSilenceMonitor()
    this.silenceMonitorTimer = setInterval(() => {
      const voiceActivity = this.voiceActivity
      if (!this.pageAlive || !this.data.isRecording || !voiceActivity || !voiceActivity.hasSpeech || voiceActivity.stopping) return
      if (Date.now() - voiceActivity.lastSpeechAt < SILENCE_TO_STOP_MS) return

      voiceActivity.stopping = true
      this.voiceActivity = voiceActivity
      this.setData({
        isThinking: true,
        conversationPhase: 'transcribing',
        statusText: '听到了，正在整理你的话'
      })
      try {
        this.recorderManager.stop()
      } catch (error) {
        this.setData({ isThinking: false, conversationPhase: 'idle', statusText: '录音没有正常结束，请点击“我来说”重试' })
        console.warn('[Voice Healing] silence stop error', error)
      }
    }, SILENCE_MONITOR_INTERVAL_MS)
  },

  stopSilenceMonitor() {
    if (this.silenceMonitorTimer) clearInterval(this.silenceMonitorTimer)
    this.silenceMonitorTimer = null
  },

  async handleVoiceStop(result, token = this.sessionToken) {
    if (!this.isSessionTokenActive(token)) return
    if (!result || !result.tempFilePath) {
      this.setData({
        isThinking: false,
        conversationPhase: 'idle',
        statusText: '没有收到这段录音，请点击“我来说”再试一次'
      })
      return
    }

    let fileID = ''
    let recognizedText = ''
    const timing = { recordStopAt: Date.now() }
    try {
      const recordDuration = result.duration || (this.recordingStartedAt ? Date.now() - this.recordingStartedAt : 0)
      let localFileSize = 0
      try {
        const fileInfo = await new Promise((resolve, reject) => {
          wx.getFileInfo({ filePath: result.tempFilePath, success: resolve, fail: reject })
        })
        localFileSize = Number(fileInfo.size || 0)
      } catch (fileInfoError) {
        console.warn('[Voice Healing] cannot inspect recording file', fileInfoError)
      }
      console.info('[Voice Healing] recording ready', {
        durationMs: recordDuration,
        fileBytes: localFileSize,
        expectedPcmBytes: Math.round(Number(recordDuration || 0) * 32),
        stopReason: this.voiceActivity && this.voiceActivity.stopping ? 'silence-or-manual' : 'recorder'
      })
      this.setData({ statusText: '正在把声音变成文字', conversationPhase: 'transcribing', isThinking: true })
      const uploadStartedAt = Date.now()
      const upload = await wx.cloud.uploadFile({
        cloudPath: `voice-healing/asr-${Date.now()}-${Math.random().toString(36).slice(2)}.pcm`,
        filePath: result.tempFilePath
      })
      timing.uploadMs = Date.now() - uploadStartedAt
      if (!this.isSessionTokenActive(token)) return
      fileID = upload.fileID
      const asrStartedAt = Date.now()
      const asrResponse = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'voice.asrShort',
          data: {
            fileID,
            audioType: 'pcm',
            sampleRate: 16000,
            userId: wx.getStorageSync('userId') || 'artcure_voice_user'
          }
        }
      })
      timing.asrMs = Date.now() - asrStartedAt
      if (!this.isSessionTokenActive(token)) return
      const asr = asrResponse.result || {}
      if (!asr.success) throw new Error(asr.message || '语音识别失败')
      const text = String(
        asr.text ||
        (asr.raw && asr.raw.data && (asr.raw.data.text || asr.raw.data.onebest)) ||
        ''
      ).trim()
      console.info('[Voice Healing] asr result', {
        requestId: asr.requestId || '',
        code: asr.raw && asr.raw.code,
        audioBytes: asr.audioBytes || 0,
        audioDurationMs: asr.audioDurationMs || 0,
        textLength: text.length,
        text
      })
      if (!text) throw new Error('没有听清有效内容')
      recognizedText = text

      this.appendMessage({ role: 'user', text, isVoice: true })
      await this.requestAgent(text, token, timing)
    } catch (error) {
      console.warn('[Voice Healing] asr or agent error', error)
      if (!this.isSessionTokenActive(token)) return
      this.setData({
        isThinking: false,
        conversationPhase: 'idle',
        statusText: recognizedText ? '回应准备得有点慢，请点击“我来说”继续' : '这句没有听清，请点击“我来说”再试一次'
      })
    } finally {
      if (fileID) wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})
    }
  },

  async requestAgent(text, token = this.sessionToken, timing = null) {
    if (!this.isSessionTokenActive(token)) return

    const localReply = this.getLocalVoiceReply(text)
    if (localReply) {
      console.info('[Voice Healing] local short reply', { text, reply: localReply })
      await this.applyAgentReply(localReply, token, null, timing)
      return
    }

    const history = this.data.messages.slice(-8).map(item => ({
      role: item.role,
      content: item.text
    }))
    const last = history[history.length - 1]
    if (!last || last.role !== 'user' || last.content !== text) {
      history.push({ role: 'user', content: text })
    }

    // 语音只需要最近两轮上下文，减少发送体积和模型输入处理时间。
    const compactHistory = history.slice(-4)
    const agentStartedAt = Date.now()
    const response = await wx.cloud.callFunction({
      name: 'vivoAigcGateway',
      data: {
        action: 'voice.healingAgent',
        data: {
          prompt: text,
          turnIndex: this.data.sessionRound,
          messages: compactHistory
        }
      }
    })
    if (timing) timing.agentMs = Date.now() - agentStartedAt
    if (!this.isSessionTokenActive(token)) return
    const result = response.result || {}
    if (!result.success) throw new Error(result.message || '疗愈回应生成失败')
    const reply = String(result.reply || '').trim()
    if (!reply) throw new Error('疗愈回应为空')

    await this.applyAgentReply(reply, token, result.toolCall, timing)
  },

  getLocalVoiceReply(text) {
    if (this.data.sessionRound <= 0) return ''
    const normalized = String(text || '').trim().replace(/[。！？!?，, ]+$/g, '')
    if (/^(嗯+|好+的?|可以|行|继续|知道了|没事|谢谢)$/.test(normalized)) {
      return '嗯，我在。我们先陪这一口呼吸停一会儿，不用急着往下走。'
    }
    if (/^(没有|不知道)$/.test(normalized)) {
      return '没关系，不需要马上找到答案。我们先安静一会儿，等你准备好再说。'
    }
    return ''
  },

  async applyAgentReply(reply, token, toolCall = null, timing = null) {
    if (!this.isSessionTokenActive(token)) return
    this.setData({
      isThinking: false,
      sessionRound: this.data.sessionRound + 1,
      conversationPhase: 'assistantSpeaking',
      statusText: '我在整理一小步适合你的练习'
    })
    this.appendMessage({ role: 'assistant', text: reply })
    // 工具音效等辅助能力放到 TTS 播放完成后执行，避免阻塞或覆盖艺呦的回复语音。
    this.pendingHealingTool = toolCall ? { toolCall, token } : null
    await this.speakText(reply, token, '', timing)
  },

  async runHealingTool(toolCall, token = this.sessionToken) {
    if (!this.isSessionTokenActive(token)) return
    const meta = TOOL_META[toolCall.name] || TOOL_META.mindfulness
    const event = {
      id: this.createId(),
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      status: 'running'
    }
    this.setData({
      toolEvents: this.data.toolEvents.concat(event).slice(-3),
      toolSummary: meta.name,
      statusText: `正在准备${meta.name}`
    })
    this.scrollToLatest()

    try {
      const response = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: { action: 'voice.tool', data: { tool: toolCall.name, input: toolCall.input || {} } }
      })
      if (!this.isSessionTokenActive(token)) return
      const result = response.result || {}
      if (result.success === false) throw new Error(result.message || '工具调用失败')
      const events = this.data.toolEvents.map(item => item.id === event.id ? { ...item, status: 'done' } : item)
      this.setData({ toolEvents: events, statusText: `${meta.name}已准备好` })
      const generatedAudioUrl = result.musicUrl || result.audioUrl
      if (generatedAudioUrl && !this.data.isMuted && this.isSessionTokenActive(token)) {
        this.stopAudioContextSafely(this.musicContext, 'ambient')
        this.musicContext.src = generatedAudioUrl
        this.musicContext.loop = Boolean(result.musicUrl)
        this.musicContext.volume = result.audioUrl ? 0.16 : 0.22
        this.ambientAudioActive = true
        this.musicContext.play()
      }
    } catch (error) {
      console.warn('[Voice Healing] tool error', error)
      if (this.isSessionTokenActive(token)) this.setData({ statusText: '练习已经准备好' })
    }
  },

  async speakText(text, token = this.sessionToken, audioUrl = '', timing = null) {
    if (!text || !this.isSessionTokenActive(token)) return
    if (this.currentSpeechToken !== token || this.currentSpeechText !== text) {
      this.currentSpeechToken = token
      this.currentSpeechText = text
      this.currentSpeechRetry = 0
    }
    if (timing) this.currentSpeechTiming = timing
    const speechTiming = timing || this.currentSpeechTiming
    if (this.data.isMuted) {
      this.assistantPlaybackActive = false
      this.setData({ isSpeaking: false, conversationPhase: 'listening', statusText: '声音已静音，轮到你说了' })
      this.scheduleListening(200, token)
      return
    }

    try {
      let resolvedAudioUrl = audioUrl
      if (!resolvedAudioUrl) {
        const ttsStartedAt = Date.now()
        const response = await wx.cloud.callFunction({
          name: 'vivoAigcGateway',
          data: {
            action: 'voice.tts',
            data: {
              text,
              voice: this.data.selectedVoice,
              userId: wx.getStorageSync('userId') || 'artcure_voice_user'
            }
          }
        })
        const result = response.result || {}
        if (!result.success || !result.audioUrl) throw new Error(result.message || 'TTS 音频暂不可用')
        resolvedAudioUrl = result.audioUrl
        if (speechTiming) {
          speechTiming.ttsRequestMs = Date.now() - ttsStartedAt
          speechTiming.audioReadyAt = Date.now()
        }
      }
      if (!this.isSessionTokenActive(token)) return
      this.playAudioUrl(resolvedAudioUrl, token, speechTiming)
    } catch (error) {
      console.warn('[Voice Healing] tts error', error)
      if (!this.isSessionTokenActive(token)) return
      this.pendingHealingTool = null
      this.assistantPlaybackActive = false
      const errorMessage = String(error && error.message || '')
      const statusText = errorMessage.includes('VIVO_KEY_MISSING')
        ? '语音服务未配置，文字回应已准备好'
        : '语音生成失败，文字回应已准备好'
      this.setData({ isSpeaking: false, statusText })
      this.setData({ conversationPhase: 'listening' })
      if (this.data.sessionActive) this.scheduleListening(250, token)
    }
  },

  playAudioUrl(audioUrl, token, timing = null) {
    if (!audioUrl || !this.isSessionTokenActive(token)) return
    try {
      this.assistantPlaybackActive = true
      this.stopAudioContextSafely(this.audioContext, 'tts')
      this.audioContext.src = audioUrl
      if (timing) {
        this.currentSpeechTiming = timing
        if (!timing.audioReadyAt) timing.audioReadyAt = Date.now()
      }
      this.setData({ isSpeaking: true, conversationPhase: 'assistantSpeaking', statusText: '艺呦正在说话，请先听她说完' })
      this.audioContext.play()
    } catch (error) {
      console.warn('[Voice Healing] tts play failed', error)
      this.assistantPlaybackActive = false
      if (this.isSessionTokenActive(token)) this.scheduleListening(250, token)
    }
  },

  pauseAmbientAudio() {
    if (!this.ambientAudioActive || !this.musicContext) return
    this.musicContext.pause()
    this.ambientAudioPaused = true
  },

  resumeAmbientAudio() {
    if (!this.ambientAudioActive || !this.ambientAudioPaused || this.data.isMuted || !this.musicContext) return
    this.ambientAudioPaused = false
    this.musicContext.play()
  },

  appendMessage(message) {
    this.setData({ messages: this.data.messages.concat({ id: this.createId(), ...message }) })
    this.scrollToLatest()
  },

  scrollToLatest() {
    setTimeout(() => {
      const messages = this.data.messages
      const last = messages[messages.length - 1]
      if (last) this.setData({ scrollToMessage: `msg-${last.id}` })
    }, 80)
  },

  finishSession(navigateBack) {
    this.stopSessionResources()
    this.setData({
      sessionActive: false,
      isRecording: false,
      isThinking: false,
      isSpeaking: false,
      conversationPhase: 'idle',
      statusText: '这一段陪伴结束了，愿你带走一点松弛'
    })
    if (navigateBack) setTimeout(() => wx.navigateBack(), 120)
  },

  stopSessionResources() {
    this.sessionToken += 1
    this.assistantPlaybackActive = false
    this.pendingHealingTool = null
    this.stopSilenceMonitor()
    if (this.sessionTimer) clearInterval(this.sessionTimer)
    if (this.listenTimer) clearTimeout(this.listenTimer)
    this.sessionTimer = null
    this.listenTimer = null
    this.sessionStartedAt = null
    if (this.recorderManager && (this.data.isRecording || this.recordingRequested)) {
      this.recordOptions = { skip: true }
      this.recordingRequested = false
      try { this.recorderManager.stop() } catch (error) { console.warn('[Voice Healing] recorder stop skipped', error) }
    }
    this.stopAudioContextSafely(this.audioContext, 'tts')
    this.stopAudioContextSafely(this.musicContext, 'ambient')
    this.ambientAudioActive = false
    this.ambientAudioPaused = false
  },

  isSessionTokenActive(token) {
    return Boolean(this.pageAlive && this.data.sessionActive && token === this.sessionToken)
  },

  stopAudioContextSafely(context, name) {
    if (!context) return
    try {
      // 微信基础库在音频底层资源尚未建立时调用 destroy() 会触发内部异常。
      // 页面卸载时停止播放即可由页面生命周期回收上下文，避免重复销毁。
      context.stop()
    } catch (error) {
      console.warn(`[Voice Healing] ${name} audio stop skipped`, error)
    }
  },

  createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
})
