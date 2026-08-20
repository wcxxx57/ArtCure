const TOOL_META = {
  start_soundscape: { name: '声音陪伴', description: '准备低音量、可循环的环境音景', icon: '♫' },
  start_breathing: { name: '呼吸引导', description: '用较长呼气的节律提示安顿身体', icon: '◒' },
  start_grounding: { name: '感官接地', description: '把注意力带回脚底、声音和颜色', icon: '◌' },
  start_art_exercise: { name: '艺术表达', description: '准备一个低门槛的短时创作练习', icon: '✎' },
  analyze_artwork: { name: '创作分析', description: '打开画板或图片分析功能', icon: '▧' },
  handoff_support: { name: '安全支持', description: '暂停练习并连接现实中的帮助', icon: '♡' }
}

const OPENING_TEXT = '欢迎来到这一小段安静的时间。先不用急着说明发生了什么。让脚底找到地面，吸气，再慢慢呼气。等我开始聆听时，你可以只说一个词、一种颜色，或者身体此刻最明显的感觉。'
const SILENCE_TO_STOP_MS = 1100
const AUDIO_TO_MIC_SETTLE_MS = 900
const SILENCE_MONITOR_INTERVAL_MS = 100
const NO_SPEECH_TIMEOUT_MS = 9000
const SPEECH_CALIBRATION_MS = 700
const SPEECH_MIN_FRAMES = 3
const SPEECH_MIN_ACTIVE_MS = 240
const SPEECH_NOISE_MARGIN = 48
const SPEECH_SILENCE_RATIO = 1.35
const SPEECH_MAX_NOISE_ZCR = 0.46
const SHORT_ASR_MAX_CHARS = 1
const SHORT_ASR_MIN_CONFIDENCE = 0.58
const RECORDER_FRAME_STALL_TIMEOUT_MS = 1200
const RECORDER_STOP_CALLBACK_TIMEOUT_MS = 3000
const RECORD_START_TIMEOUT_MS = 5000
const PLAYBACK_START_TIMEOUT_MS = 12000
const SPEECH_RMS_THRESHOLD = 80
const SPEECH_NOISE_RATIO = 1.8
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
    this.sessionStarting = false
    this.microphoneAuthorizationPending = false
    this.currentSpeechIsOpening = false
    this.pendingHealingTool = null
    this.pendingAmbientAudio = null
    this.pendingArtworkNavigation = false
    this.toolOutputGate = false
    this.sessionState = {
      goal: '',
      phase: 'opening',
      preferredModality: 'voice',
      currentTool: '',
      consentedTool: ''
    }
    this.currentSpeechText = ''
    this.currentSpeechToken = 0
    this.currentSpeechRetry = 0
    this.currentSpeechTiming = null
    this.openingAudioPromises = {}
    this.playbackToken = 0
    this.activePlaybackToken = 0
    this.playbackStarted = false
    this.ttsPlayRequested = false
    this.ambientAudioSource = null
    this.ambientAudioPlaying = false
    this.ambientPlaybackToken = 0
    this.audioContextHasSource = false
    this.musicContextHasSource = false
    this.playbackStartTimer = null
    this.recorderStopTimer = null
    this.ignoreAudioEndedUntil = 0
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
      if (this.recordStartTimer) clearTimeout(this.recordStartTimer)
      this.recordStartTimer = null
      this.clearRecorderStopTimer()
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
        stopReason: '',
        speechFrames: 0,
        speechEvidenceFrames: 0,
        speechStartedAt: 0,
        speechDurationMs: 0,
        speechPeakRms: 0,
        speechConfidence: 0,
        speechCandidateStartedAt: 0,
        speechCandidatePeakRms: 0,
        calibrationStartedAt: Date.now(),
        noiseFloorRms: 0,
        noiseFloorZcr: 0,
        lastRms: 0,
        lastFrameAt: 0
      }
      this.recordingStartedAt = Date.now()
      this.lastRecorderFrameAt = 0
      this.setData({
        isRecording: true,
        conversationPhase: 'listening',
        statusText: '轮到你说了，说完后停顿约 1.1 秒即可'
      })
      console.info('[Voice Healing] recorder started', {
        token: this.recordOptions && this.recordOptions.token,
        sampleRate: 16000,
        format: 'pcm',
        audioSource: 'voice_communication',
        ambientAudioActive: Boolean(this.ambientAudioActive),
        ambientAudioPaused: Boolean(this.ambientAudioPaused)
      })
      this.startSilenceMonitor()
    })

    this.recorderManager.onStop((result) => {
      const options = this.recordOptions || {}
      this.recordOptions = null
      if (this.recordStartTimer) clearTimeout(this.recordStartTimer)
      this.recordStartTimer = null
      this.clearRecorderStopTimer()
      this.recordingRequested = false
      this.stopSilenceMonitor()
      if (!this.pageAlive || options.skip) return
      this.setData({ isRecording: false, conversationPhase: 'transcribing' })
      console.info('[Voice Healing] recorder stopped', {
        durationMs: result && result.duration,
        tempFilePath: Boolean(result && result.tempFilePath)
      })
      this.handleVoiceStop(result, options.token)
    })

    this.recorderManager.onError((error) => {
      console.error('[Voice Healing] recorder error', error)
      if (this.recordStartTimer) clearTimeout(this.recordStartTimer)
      this.recordStartTimer = null
      this.recordOptions = null
      this.recordingRequested = false
      this.clearRecorderStopTimer()
      this.stopSilenceMonitor()
      if (!this.pageAlive) return
      this.setData({ isRecording: false, isThinking: false, conversationPhase: 'idle', statusText: '麦克风没有准备好，请再试一次' })
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' })
      const errorText = String(error && (error.errMsg || error.message) || '')
      if (this.data.sessionActive && !/permission|authorize|auth/i.test(errorText)) {
        this.scheduleListening(700, this.sessionToken)
      }
    })
  },

  bindAudioEvents() {
    this.audioContext.onPlay(() => {
      if (!this.isActiveAudioPlayback()) return
      this.playbackStarted = true
      this.ttsPlayRequested = false
      if (this.playbackStartTimer) clearTimeout(this.playbackStartTimer)
      this.playbackStartTimer = null
      console.info('[Voice Healing] tts playback started', {
        opening: this.currentSpeechIsOpening,
        playbackToken: this.activePlaybackToken
      })
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
    this.audioContext.onCanplay(() => {
      if (!this.isActiveAudioPlayback()) return
      console.info('[Voice Healing] tts audio ready', {
        opening: this.currentSpeechIsOpening,
        playbackToken: this.activePlaybackToken
      })
      if (this.playbackStarted || this.ttsPlayRequested) return
      this.ttsPlayRequested = true
      try {
        this.audioContext.play()
      } catch (error) {
        this.ttsPlayRequested = false
        this.handleAudioPlaybackFailure(error)
      }
    })
    this.audioContext.onEnded(() => {
      // stop() 触发的旧结束事件不能结束当前这一轮开场语音，也不能启动录音。
      if (!this.isActiveAudioPlayback() || !this.playbackStarted || Date.now() < this.ignoreAudioEndedUntil) return
      console.info('[Voice Healing] tts playback ended', {
        opening: this.currentSpeechIsOpening,
        playbackToken: this.activePlaybackToken
      })
      this.finishAudioPlayback('轮到你说了，说完后停顿约 1.1 秒即可')
    })
    this.audioContext.onError((error) => {
      console.warn('[Voice Healing] tts play error', error)
      this.handleAudioPlaybackFailure(error)
    })

    this.musicContext.onCanplay(() => {
      if (!this.ambientAudioActive || !this.musicContext) return
      console.info('[Voice Healing] tool audio ready', {
        source: this.ambientAudioSource && this.ambientAudioSource.source,
        token: this.ambientPlaybackToken
      })
      if (this.ambientAudioPlaying) return
      try {
        this.musicContext.play()
      } catch (error) {
        this.handleAmbientAudioFailure(error)
      }
    })
    this.musicContext.onPlay(() => {
      if (!this.ambientAudioActive) return
      this.ambientAudioPlaying = true
      console.info('[Voice Healing] tool audio playback confirmed', {
        loop: Boolean(this.musicContext.loop),
        source: this.ambientAudioSource && this.ambientAudioSource.source,
        token: this.ambientPlaybackToken
      })
      this.setData({
        toolSummary: this.musicContext.loop ? '声音陪伴进行中' : '呼吸引导进行中',
        statusText: this.musicContext.loop ? '声音陪伴进行中' : '呼吸引导进行中'
      })
    })
    this.musicContext.onEnded(() => {
      if (!this.musicContext || this.musicContext.loop) return
      this.ambientAudioActive = false
      this.ambientAudioPlaying = false
      this.ambientAudioSource = null
      this.musicContextHasSource = false
      if (this.data.sessionActive && !this.data.isMuted) {
        this.setData({ toolSummary: '陪伴已准备', statusText: '这一小段练习结束了，轮到你说了' })
      }
      console.info('[Voice Healing] tool audio playback ended', { token: this.ambientPlaybackToken })
    })
    this.musicContext.onError((error) => {
      this.handleAmbientAudioFailure(error)
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
      this.currentSpeechIsOpening = false
      this.ambientAudioActive = false
      this.ambientAudioPaused = false
      this.ambientAudioPlaying = false
      this.ambientAudioSource = null
      this.musicContextHasSource = false
      if (this.data.sessionActive && !this.data.isRecording && !this.data.isThinking) {
        this.setData({ isSpeaking: false, conversationPhase: 'listening', statusText: '声音已静音，轮到你说了' })
        this.scheduleListening(200, this.sessionToken)
      }
    }
    if (!isMuted && this.data.sessionActive) {
      this.setData({ statusText: '声音已打开，轮到你说了' })
      this.flushPendingToolOutputs(this.sessionToken)
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
    if (this.microphoneAuthorizationPending || this.sessionStarting || this.data.sessionActive) return
    this.microphoneAuthorizationPending = true
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.microphoneAuthorizationPending = false
        this.startSession()
      },
      fail: () => {
        this.microphoneAuthorizationPending = false
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
    if (this.sessionStarting || this.data.sessionActive) return
    this.sessionStarting = true
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
    this.currentSpeechIsOpening = true
    this.pendingHealingTool = null
    this.pendingAmbientAudio = null
    this.pendingArtworkNavigation = false
    this.toolOutputGate = false
    this.sessionState = {
      goal: '',
      phase: 'opening',
      preferredModality: 'voice',
      currentTool: '',
      consentedTool: ''
    }
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
      this.sessionStarting = false
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
    if (this.openingAudioPromises[voice]) return this.openingAudioPromises[voice]
    const cacheKey = `voice-healing-opening-${voice}`
    const promise = (async () => {
      try {
        const cachedFileID = wx.getStorageSync(cacheKey)
        if (cachedFileID) {
             const cachedUrl = await this.resolveCloudAudioFile(cachedFileID, '', 'opening-tts')
          if (cachedUrl && this.pageAlive && this.data.selectedVoice === voice) {
            this.openingAudioUrl = cachedUrl
            this.openingAudioVoice = voice
            console.info('[Voice Healing] opening audio cache ready', { voice })
            return cachedUrl
          }
          wx.removeStorageSync(cacheKey)
        }

        const response = await wx.cloud.callFunction({
          name: 'vivoAigcGateway',
          data: { action: 'voice.tts', data: { text: OPENING_TEXT, voice } }
        })
        const result = response.result || {}
        if (!result.success || !result.audioUrl) throw new Error(result.message || '开场语音没有返回音频地址')
        if (!this.pageAlive || this.data.selectedVoice !== voice) return ''
         this.openingAudioUrl = await this.resolveCloudAudioFile(result.fileID, result.audioUrl, 'opening-tts')
        this.openingAudioVoice = voice
        if (result.fileID) wx.setStorageSync(cacheKey, result.fileID)
        console.info('[Voice Healing] opening audio prepared', { voice, hasFileID: Boolean(result.fileID) })
        return this.openingAudioUrl
      } catch (error) {
        console.warn('[Voice Healing] opening audio prepare failed', error)
        return ''
      }
    })()
    this.openingAudioPromises[voice] = promise
    try {
      return await promise
    } finally {
      if (this.openingAudioPromises[voice] === promise) delete this.openingAudioPromises[voice]
    }
  },

  async resolveCloudAudioFile(fileID, fallbackUrl = '', purpose = 'audio') {
    if (fileID) {
      try {
        const downloaded = await wx.cloud.downloadFile({ fileID })
        if (downloaded && downloaded.tempFilePath) {
          console.info('[Voice Healing] audio downloaded locally', {
            purpose,
            fileID: String(fileID).slice(-16)
          })
          return downloaded.tempFilePath
        }
      } catch (error) {
        console.warn('[Voice Healing] local audio download failed, fallback to URL', error)
      }
    }
    return fallbackUrl || ''
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
    if (!this.ambientAudioSource || !this.ambientAudioSource.loop) {
      this.pauseAmbientAudio('recording')
    }
    const token = this.sessionToken
    this.recordOptions = { skip: false, token }
    this.recordingRequested = true
    this.voiceActivity = {
      hasSpeech: false,
      lastSpeechAt: 0,
      stopping: false,
      stopReason: '',
      speechFrames: 0,
      speechEvidenceFrames: 0,
      speechStartedAt: 0,
      speechDurationMs: 0,
      speechPeakRms: 0,
      speechConfidence: 0,
      speechCandidateStartedAt: 0,
      speechCandidatePeakRms: 0,
      calibrationStartedAt: Date.now(),
      noiseFloorRms: 0,
      noiseFloorZcr: 0,
      lastRms: 0,
      lastFrameAt: 0
    }
    this.setData({ conversationPhase: 'listening', statusText: '正在听你说，说完后停顿约 1.1 秒即可' })
    try {
      this.recorderManager.start({
        duration: 30000,
        sampleRate: 16000,
        numberOfChannels: 1,
        // 语音通信采集源会启用更适合人声的处理，降低环境音和扬声器回录导致的误触发。
        audioSource: 'voice_communication',
        // vivo ASR 要求 16kHz / 16bit / 单声道 PCM；与 ai-chat 页面保持同一录音格式。
        format: 'pcm',
        frameSize: 4
      })
      this.recordStartTimer = setTimeout(() => {
        if (!this.pageAlive || !this.data.sessionActive || !this.recordingRequested || token !== this.sessionToken) return
        this.recordStartTimer = null
        this.recordingRequested = false
        this.recordOptions = { skip: true }
        console.warn('[Voice Healing] recorder start timeout', { token })
        this.setData({ conversationPhase: 'idle', statusText: '麦克风启动有点慢，正在重试' })
        try { this.recorderManager.stop() } catch (error) {
          this.recordOptions = null
          console.warn('[Voice Healing] recorder timeout stop skipped', error)
        }
        this.scheduleListening(500, token)
      }, RECORD_START_TIMEOUT_MS)
    } catch (error) {
      this.recordingRequested = false
      this.recordOptions = null
      this.setData({ conversationPhase: 'idle', statusText: '麦克风没有准备好，请再试一次' })
      console.warn('[Voice Healing] recorder start error', error)
    }
  },

  handleRecorderFrame(frame) {
    if (!this.data.isRecording || !frame || !frame.frameBuffer) return
    const frameBuffer = frame.frameBuffer
    const bytes = frameBuffer instanceof ArrayBuffer
      ? new Uint8Array(frameBuffer)
      : ArrayBuffer.isView(frameBuffer)
        ? new Uint8Array(frameBuffer.buffer, frameBuffer.byteOffset, frameBuffer.byteLength)
        : new Uint8Array(frameBuffer)
    if (bytes.length < 4) return

    let energy = 0
    let sampleCount = 0
    let peakAmplitude = 0
    let zeroCrossings = 0
    let previousSample = 0
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      const sample = bytes[index] | (bytes[index + 1] << 8)
      const signedSample = sample > 32767 ? sample - 65536 : sample
      energy += signedSample * signedSample
      peakAmplitude = Math.max(peakAmplitude, Math.abs(signedSample))
      if (sampleCount > 0 && ((signedSample >= 0) !== (previousSample >= 0))) zeroCrossings += 1
      previousSample = signedSample
      sampleCount += 1
    }

    const rms = Math.sqrt(energy / Math.max(sampleCount, 1))
    const zeroCrossingRate = zeroCrossings / Math.max(sampleCount - 1, 1)
    const now = Date.now()
    this.lastRecorderFrameAt = now
    const voiceActivity = this.voiceActivity || {
      hasSpeech: false,
      lastSpeechAt: 0,
      stopping: false,
      stopReason: '',
      speechFrames: 0,
      speechEvidenceFrames: 0,
      speechStartedAt: 0,
      speechDurationMs: 0,
      speechPeakRms: 0,
      speechConfidence: 0,
      speechCandidateStartedAt: 0,
      speechCandidatePeakRms: 0,
      calibrationStartedAt: now,
      noiseFloorRms: 0,
      noiseFloorZcr: 0,
      lastRms: 0
    }
    voiceActivity.lastFrameAt = now
    voiceActivity.lastRms = rms

    const noiseFloor = Number(voiceActivity.noiseFloorRms || 0)
    const calibrationStartedAt = Number(voiceActivity.calibrationStartedAt || this.recordingStartedAt || now)
    const isCalibrating = now - calibrationStartedAt < SPEECH_CALIBRATION_MS

    // 开始录音后的短窗口只估计底噪，不把第一帧环境声误当成用户已经开始说话。
    // 语音页在 TTS 结束后还会额外等待 AUDIO_TO_MIC_SETTLE_MS，因此这段校准不会吞掉正常开口。
    if (isCalibrating) {
      voiceActivity.noiseFloorRms = noiseFloor
        ? noiseFloor * 0.8 + rms * 0.2
        : rms
      voiceActivity.noiseFloorZcr = Number(voiceActivity.noiseFloorZcr || 0)
        ? Number(voiceActivity.noiseFloorZcr) * 0.8 + zeroCrossingRate * 0.2
        : zeroCrossingRate
      this.voiceActivity = voiceActivity
      return
    }

    const calibratedNoiseFloor = Number(voiceActivity.noiseFloorRms || 0)
    const speechThreshold = Math.max(
      SPEECH_RMS_THRESHOLD,
      calibratedNoiseFloor ? calibratedNoiseFloor * SPEECH_NOISE_RATIO : SPEECH_RMS_THRESHOLD,
      calibratedNoiseFloor + SPEECH_NOISE_MARGIN
    )
    const quietThreshold = Math.max(
      SPEECH_RMS_THRESHOLD * 0.75,
      calibratedNoiseFloor ? calibratedNoiseFloor * SPEECH_SILENCE_RATIO : SPEECH_RMS_THRESHOLD
    )

    // 只要当前帧明显高于校准后的底噪，就算作说话；必须连续三帧，避免点击声/残响把
    // “已经说完”重新推迟。低于说话阈值的帧持续更新底噪，避免说话后空调声一直刷新 lastSpeechAt。
    // 扬声器播放的白噪音通常表现为高零交叉率、能量稳定的连续噪声；
    // 过滤这类帧，避免环境音把“没有说话”误判成真实人声。
    const isLikelyBroadbandNoise = zeroCrossingRate > SPEECH_MAX_NOISE_ZCR &&
      rms < Math.max(speechThreshold * 2.5, calibratedNoiseFloor * 3)
    const isSpeechCandidate = rms > speechThreshold && !isLikelyBroadbandNoise

    if (isSpeechCandidate) {
      voiceActivity.speechFrames += 1
      voiceActivity.speechCandidateStartedAt = voiceActivity.speechCandidateStartedAt || now
      voiceActivity.speechCandidatePeakRms = Math.max(
        Number(voiceActivity.speechCandidatePeakRms || 0),
        rms,
        peakAmplitude / 8
      )
      const candidateDurationMs = now - voiceActivity.speechCandidateStartedAt
      const speechConfirmedNow = !voiceActivity.hasSpeech &&
        voiceActivity.speechFrames >= SPEECH_MIN_FRAMES &&
        candidateDurationMs >= SPEECH_MIN_ACTIVE_MS
      if (speechConfirmedNow) {
        voiceActivity.hasSpeech = true
        voiceActivity.speechEvidenceFrames = Math.max(
          Number(voiceActivity.speechEvidenceFrames || 0),
          voiceActivity.speechFrames
        )
        voiceActivity.speechStartedAt = voiceActivity.speechStartedAt || voiceActivity.speechCandidateStartedAt
        voiceActivity.speechDurationMs = now - voiceActivity.speechStartedAt
        voiceActivity.speechPeakRms = Math.max(
          Number(voiceActivity.speechPeakRms || 0),
          Number(voiceActivity.speechCandidatePeakRms || 0)
        )
        const contrast = (voiceActivity.speechPeakRms - calibratedNoiseFloor) /
          Math.max(SPEECH_NOISE_MARGIN, calibratedNoiseFloor || SPEECH_RMS_THRESHOLD)
        voiceActivity.speechConfidence = Math.min(1, Math.max(0, contrast / 1.2))
        voiceActivity.lastSpeechAt = now
      }
      if (voiceActivity.hasSpeech) {
        if (!speechConfirmedNow) voiceActivity.speechEvidenceFrames += 1
        voiceActivity.lastSpeechAt = now
        voiceActivity.speechDurationMs = now - voiceActivity.speechStartedAt
        voiceActivity.speechPeakRms = Math.max(
          Number(voiceActivity.speechPeakRms || 0),
          rms,
          peakAmplitude / 8
        )
      }
      this.voiceActivity = voiceActivity
      return
    }

    voiceActivity.speechFrames = 0
    voiceActivity.speechCandidateStartedAt = 0
    voiceActivity.speechCandidatePeakRms = 0
    if (calibratedNoiseFloor === 0 || rms <= quietThreshold || !voiceActivity.hasSpeech) {
      voiceActivity.noiseFloorRms = calibratedNoiseFloor
        ? calibratedNoiseFloor * 0.94 + rms * 0.06
        : rms
    }

    this.voiceActivity = voiceActivity
    // 这里只负责判断“说完”，完整录音仍会上传给 ASR，不会裁掉用户的声音。
    if (voiceActivity.hasSpeech && !voiceActivity.stopping && now - voiceActivity.lastSpeechAt >= SILENCE_TO_STOP_MS) {
      this.requestRecorderStop('silence', '听到了，正在整理你的话')
    }
  },

  stopRecording() {
    if (this.data.isRecording || this.recordingRequested) {
      this.requestRecorderStop('manual', '听到了，正在整理你的话')
    }
  },

  startSilenceMonitor() {
    this.stopSilenceMonitor()
    this.silenceMonitorTimer = setInterval(() => {
      const voiceActivity = this.voiceActivity
      if (!this.pageAlive || !this.data.isRecording || !voiceActivity || voiceActivity.stopping) return
      const now = Date.now()
      const recordingElapsed = this.recordingStartedAt ? Date.now() - this.recordingStartedAt : 0
      if (!voiceActivity.hasSpeech) {
        if (recordingElapsed < NO_SPEECH_TIMEOUT_MS) return
        this.requestRecorderStop('no-speech-timeout', '暂时没有听到声音，正在重新听你说')
        return
      }

      // 某些真机在静音期间会暂时不再触发 onFrameRecorded。此时不能一直等
      // lastSpeechAt 自然更新，否则用户已经停下却会卡在“正在听”。
      if (voiceActivity.lastFrameAt && now - voiceActivity.lastFrameAt >= RECORDER_FRAME_STALL_TIMEOUT_MS) {
        this.requestRecorderStop('frame-stall', '音频流已安静，正在整理你的话')
        return
      }
      if (now - voiceActivity.lastSpeechAt < SILENCE_TO_STOP_MS) return
      this.requestRecorderStop('silence', '听到了，正在整理你的话')
    }, SILENCE_MONITOR_INTERVAL_MS)
  },

  requestRecorderStop(reason, statusText) {
    const canStop = Boolean(this.data.isRecording || this.recordingRequested)
    const voiceActivity = this.voiceActivity || {
      hasSpeech: false,
      lastSpeechAt: 0,
      stopping: false,
      stopReason: '',
      speechFrames: 0,
      noiseFloorRms: 0,
      lastRms: 0,
      lastFrameAt: 0
    }
    if (!canStop || voiceActivity.stopping) return false

    voiceActivity.stopping = true
    voiceActivity.stopReason = reason
    this.voiceActivity = voiceActivity
    if (this.recordOptions) this.recordOptions.stopReason = reason
    this.stopSilenceMonitor()
    this.setData({
      isThinking: true,
      conversationPhase: 'transcribing',
      statusText: statusText || '正在整理你的话'
    })

    this.clearRecorderStopTimer()
    this.recorderStopTimer = setTimeout(() => {
      if (!this.pageAlive || !this.data.sessionActive || !this.data.isRecording || !this.voiceActivity || !this.voiceActivity.stopping) return
      console.warn('[Voice Healing] recorder stop callback timeout', { reason })
      try { this.recorderManager.stop() } catch (error) { console.warn('[Voice Healing] recorder stop retry error', error) }
      this.recorderStopTimer = setTimeout(() => {
        if (!this.pageAlive || !this.data.sessionActive || !this.data.isRecording || !this.voiceActivity || !this.voiceActivity.stopping) return
        this.recordOptions = null
        this.recordingRequested = false
        this.setData({
          isRecording: false,
          isThinking: false,
          conversationPhase: 'listening',
          statusText: '录音结束有点慢，正在重新听你说'
        })
        this.scheduleListening(500, this.sessionToken)
      }, RECORDER_STOP_CALLBACK_TIMEOUT_MS)
    }, RECORDER_STOP_CALLBACK_TIMEOUT_MS)

    try {
      this.recorderManager.stop()
      return true
    } catch (error) {
      this.clearRecorderStopTimer()
      this.recordingRequested = false
      this.recordOptions = null
      this.setData({ isRecording: false, isThinking: false, conversationPhase: 'idle', statusText: '录音没有正常结束，请点击“我来说”重试' })
      console.warn('[Voice Healing] recorder stop error', { reason, error })
      return false
    }
  },

  clearRecorderStopTimer() {
    if (this.recorderStopTimer) clearTimeout(this.recorderStopTimer)
    this.recorderStopTimer = null
  },

  evaluateSpeechActivity() {
    const activity = this.voiceActivity || {}
    const evidenceFrames = Number(activity.speechEvidenceFrames || 0)
    const durationMs = Number(activity.speechDurationMs || 0)
    const confidence = Number(activity.speechConfidence || 0)
    const diagnostics = {
      noiseFloorRms: Number(activity.noiseFloorRms || 0),
      speechPeakRms: Number(activity.speechPeakRms || 0),
      lastRms: Number(activity.lastRms || 0)
    }
    if (!activity.hasSpeech) {
      return {
        accept: false,
        reason: 'local-no-speech',
        evidenceFrames,
        durationMs,
        confidence,
        ...diagnostics
      }
    }
    if (evidenceFrames < SPEECH_MIN_FRAMES || durationMs < SPEECH_MIN_ACTIVE_MS) {
      return {
        accept: false,
        reason: 'local-speech-too-short',
        evidenceFrames,
        durationMs,
        confidence,
        ...diagnostics
      }
    }
    return {
      accept: true,
      reason: 'local-speech-confirmed',
      evidenceFrames,
      durationMs,
      confidence,
      ...diagnostics
    }
  },

  evaluateRecognizedText(text, speechGate) {
    const compactText = String(text || '').replace(/[\s\r\n，。！？、,.!?；;：:"“”‘’…]+/g, '')
    const textLength = compactText.length
    if (!textLength) return { accept: false, reason: 'asr-empty', textLength }

    // 单字/极短词在静音、底噪或回录中最容易产生误识别；只有本地 VAD
    // 同时给出较强的人声证据时才允许进入 Agent，正常说“累”“好”等短词仍可通过。
    if (
      textLength <= SHORT_ASR_MAX_CHARS &&
      (!speechGate || Number(speechGate.confidence || 0) < SHORT_ASR_MIN_CONFIDENCE)
    ) {
      return { accept: false, reason: 'asr-short-weak-speech', textLength }
    }
    return { accept: true, reason: 'asr-accepted', textLength }
  },

  skipVoiceTurn(token, reason = 'no-speech') {
    if (!this.isSessionTokenActive(token)) return
    console.info('[Voice Healing] voice turn skipped', { reason })
    this.setData({
      isThinking: false,
      conversationPhase: 'listening',
      statusText: reason === 'asr-short-weak-speech'
        ? '这次只听到一点环境声，等你愿意说时我再回应'
        : '暂时没有听到清晰的人声，继续等你说'
    })
    this.scheduleListening(450, token)
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
        conversationPhase: 'listening',
        statusText: '没有收到这段录音，正在重新听你说'
      })
      this.scheduleListening(350, token)
      return
    }

    let fileID = ''
    let recognizedText = ''
    const timing = { recordStopAt: Date.now() }
    try {
      const recordDuration = result.duration || (this.recordingStartedAt ? Date.now() - this.recordingStartedAt : 0)
      const speechGate = this.evaluateSpeechActivity()
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
        stopReason: this.voiceActivity && this.voiceActivity.stopReason || 'recorder',
        speechGate: speechGate.reason,
        speechEvidenceFrames: speechGate.evidenceFrames,
        speechDurationMs: speechGate.durationMs,
        speechConfidence: speechGate.confidence,
        noiseFloorRms: speechGate.noiseFloorRms,
        speechPeakRms: speechGate.speechPeakRms,
        lastRms: speechGate.lastRms
      })
      if (!speechGate.accept) {
        this.skipVoiceTurn(token, speechGate.reason)
        return
      }
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
      const textGate = this.evaluateRecognizedText(text, speechGate)
      if (!textGate.accept) {
        console.info('[Voice Healing] asr text ignored', {
          reason: textGate.reason,
          text,
          textLength: textGate.textLength,
          speechConfidence: speechGate.confidence,
          speechEvidenceFrames: speechGate.evidenceFrames,
          speechDurationMs: speechGate.durationMs
        })
        this.skipVoiceTurn(token, textGate.reason)
        return
      }
      recognizedText = text

      this.appendMessage({ role: 'user', text, isVoice: true })
      await this.requestAgent(text, token, timing)
    } catch (error) {
      console.warn('[Voice Healing] asr or agent error', error)
      if (!this.isSessionTokenActive(token)) return

      // ASR 已经拿到文字但 Agent 暂时失败时，先用当前原话做本地承接，
      // 不让一次云端请求失败把整段语音陪伴链路停在 idle。
      if (recognizedText) {
        const recoveryReply = this.getVoiceRecoveryReply(recognizedText)
        await this.applyAgentReply(recoveryReply, token, null, timing)
        return
      }

      this.setData({
        isThinking: false,
        conversationPhase: 'listening',
        statusText: recognizedText ? '回应准备得有点慢，正在继续听你说' : '这句没有听清，正在重新听你说'
      })
      this.scheduleListening(450, token)
    } finally {
      if (fileID) wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {})
    }
  },

  async requestAgent(text, token = this.sessionToken, timing = null) {
    if (!this.isSessionTokenActive(token)) return

    const history = this.data.messages.slice(-8).map(item => ({
      role: item.role,
      content: item.text
    }))
    const last = history[history.length - 1]
    const previousHistory = last && last.role === 'user' && last.content === text
      ? history.slice(0, -1)
      : history

    // 当前语音单独作为 currentUserMessage 传递，历史只保留之前的轮次，
    // 避免同一句转写同时出现在 prompt 和 messages 末尾，导致兼容接口上下文去重不一致。
    const compactHistory = previousHistory.slice(-4)
    if (!text) {
      throw new Error('语音转写为空')
    }
    const agentStartedAt = Date.now()
    const response = await wx.cloud.callFunction({
      name: 'vivoAigcGateway',
      data: {
        action: 'voice.healingTurn',
        data: {
          prompt: text,
          currentUserMessage: text,
          turnIndex: this.data.sessionRound,
          messages: compactHistory,
          sessionState: this.sessionState,
          voice: this.data.selectedVoice,
          isMuted: this.data.isMuted,
          userId: wx.getStorageSync('userId') || 'artcure_voice_user'
        }
      }
    })
    const requestMs = Date.now() - agentStartedAt
    if (timing) timing.turnMs = requestMs
    if (!this.isSessionTokenActive(token)) return
    const result = response.result || {}
    if (!result.success) throw new Error(result.message || '疗愈回应生成失败')
    const reply = String(result.reply || '').trim()
    if (!reply) throw new Error('疗愈回应为空')
    if (timing && result.latency) {
      timing.agentMs = Number(result.latency.planningMs || 0)
      timing.ttsRequestMs = Number(result.latency.ttsMs || 0)
      timing.toolMs = Number(result.latency.toolMs || 0)
    }

    console.info('[Voice Healing] agent result', {
      source: result.source || '',
      provider: result.provider || '',
      model: result.model || '',
      intent: result.intent || '',
      tool: result.toolCall && result.toolCall.name || '',
      toolPhase: result.toolCall && result.toolCall.phase || '',
      toolExecuted: Boolean(result.toolResult && result.toolResult.success !== false),
      reply
    })

    const audioUrl = result.audioFileID
      ? await this.resolveCloudAudioFile(result.audioFileID, result.audioUrl, 'reply-tts')
      : result.audioUrl
    await this.applyAgentReply(reply, token, result.toolCall, timing, audioUrl, result.toolResult, result.intent)
  },

  getVoiceRecoveryReply(text) {
    const normalized = String(text || '').trim().replace(/[\r\n]+/g, ' ')
    const shortText = normalized.length > 56 ? `${normalized.slice(0, 56)}…` : normalized
    if (/焦虑|紧张|心慌|喘不过气|胸口堵|害怕/.test(normalized)) {
      return '我听见你刚才说的这份紧张了，像是身体已经替你撑了很久。先不用急着解决，你愿意告诉我它现在最明显地落在哪里吗？'
    }
    if (/难过|委屈|想哭|失望|孤单|低落/.test(normalized)) {
      return '我听见你刚才话里的难受了，先不用把它解释清楚。我可以继续听你说，也可以陪你安静一会儿。'
    }
    return `我听见你刚才说：“${shortText}”。我先不替你下结论，你想继续说说，还是先做一个很短的练习？`
  },

  async applyAgentReply(reply, token, toolCall = null, timing = null, audioUrl = '', toolResult = null, intent = '') {
    if (!this.isSessionTokenActive(token)) return
    this.setData({
      isThinking: false,
      sessionRound: this.data.sessionRound + 1,
      conversationPhase: 'assistantSpeaking',
      statusText: '我在想怎么更贴近地回应你'
    })
    this.currentSpeechIsOpening = false
    this.appendMessage({ role: 'assistant', text: reply })
    this.toolOutputGate = Boolean(toolCall && (toolResult || audioUrl) && !this.data.isMuted)

    if (toolCall && toolCall.phase === 'execute') {
      this.sessionState = {
        ...this.sessionState,
        phase: 'practice',
        currentTool: toolCall.name,
        consentedTool: toolCall.name
      }
      const event = this.addToolEvent(toolCall, 'running')
      if (toolResult) {
        await this.applyToolResult(toolCall, toolResult, token, event.id)
      } else {
        // 仅在云端没有提前准备工具结果时保留待执行状态。
        this.pendingHealingTool = { toolCall, token }
      }
    } else if (!toolCall) {
      if (intent === 'decline_or_stop') {
        this.setData({
          toolEvents: this.data.toolEvents.map(item => item.status === 'waiting'
            ? { ...item, status: 'cancelled', description: '你选择先跳过这一步' }
            : item)
        })
      }
      this.sessionState = { ...this.sessionState, phase: 'listening', currentTool: '' }
    }

    await this.speakText(reply, token, audioUrl, timing)
  },

  async runHealingTool(toolCall, token = this.sessionToken) {
    if (!this.isSessionTokenActive(token)) return
    if (!toolCall) return
    const meta = TOOL_META[toolCall.name] || TOOL_META.start_grounding
    const event = this.addToolEvent(toolCall, 'running')

    try {
      const response = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: { action: 'voice.tool', data: { tool: toolCall.name, input: toolCall.input || {} } }
      })
      if (!this.isSessionTokenActive(token)) return
      const result = response.result || {}
      if (result.success === false) throw new Error(result.message || '工具调用失败')
      await this.applyToolResult(toolCall, result, token, event.id)
    } catch (error) {
      console.warn('[Voice Healing] tool error', error)
      if (this.isSessionTokenActive(token)) {
        this.setData({
          toolEvents: this.data.toolEvents.map(item => item.id === event.id
            ? { ...item, status: 'error', description: error.message || `${meta.name}调用失败` }
            : item),
          statusText: `${meta.name}暂时没有准备好，请先继续用声音陪伴`
        })
      }
    }
  },

  addToolEvent(toolCall, status = 'running', stateText = '') {
    const meta = TOOL_META[toolCall && toolCall.name] || TOOL_META.start_grounding
    const event = {
      id: this.createId(),
      name: meta.name,
      description: stateText || meta.description,
      icon: meta.icon,
      status
    }
    this.setData({
      toolEvents: this.data.toolEvents.concat(event).slice(-3),
      toolSummary: status === 'waiting' ? '等待你的选择' : meta.name,
      statusText: status === 'waiting' ? `${meta.name}等待你的选择` : `正在启动${meta.name}`
    })
    this.scrollToLatest()
    return event
  },

  async applyToolResult(toolCall, result, token, eventId = '') {
    if (!this.isSessionTokenActive(token)) return
    const meta = TOOL_META[toolCall && toolCall.name] || TOOL_META.start_grounding
    const event = eventId
      ? this.data.toolEvents.find(item => item.id === eventId)
      : null
    const nextEvent = event || this.addToolEvent(toolCall, 'running')
    const description = result.description || result.instruction || (result.exercise && result.exercise.title) || meta.description
    const events = this.data.toolEvents.map(item => item.id === nextEvent.id
      ? { ...item, status: 'done', description }
      : item)
    this.setData({
      toolEvents: events,
      toolSummary: meta.name,
      statusText: `${meta.name}正在启动`
    })

    const generatedAudioUrl = result.musicUrl || result.audioUrl
    if (generatedAudioUrl && !this.data.isMuted) {
      const localAudioUrl = await this.resolveCloudAudioFile(
        result.musicFileID || result.audioFileID || result.fileID,
        generatedAudioUrl,
        'tool-audio'
      )
      if (!this.isSessionTokenActive(token)) return
      if (!localAudioUrl) {
        this.setData({
          toolEvents: this.data.toolEvents.map(item => item.id === nextEvent.id
            ? { ...item, status: 'error', description: '工具已调用，但没有拿到可播放的音频文件' }
            : item),
          toolSummary: '声音陪伴未播放',
          statusText: '声音陪伴音频没有准备好，请稍后再试'
        })
        return
      }
      this.pendingAmbientAudio = {
        url: localAudioUrl,
        loop: Boolean(result.loop || result.musicUrl),
        volume: Math.min(1, Math.max(
          result.musicUrl ? 0.3 : 0.24,
          Number(result.volume || (result.audioUrl ? 0.28 : 0.34))
        )),
        token,
        source: result.source || (result.musicUrl ? 'soundscape' : 'breathing'),
        eventId: nextEvent.id
      }
      console.info('[Voice Healing] tool audio prepared', {
        tool: toolCall && toolCall.name,
        local: Boolean(localAudioUrl && localAudioUrl !== generatedAudioUrl),
        source: this.pendingAmbientAudio.source,
        token
      })
    }
    if (result.navigationUrl) {
      this.pendingArtworkNavigation = result.navigationUrl
    }
    if (this.data.isSpeaking || this.assistantPlaybackActive) return
    this.flushPendingToolOutputs(token)
  },

  flushPendingToolOutputs(token = this.sessionToken) {
    if (!this.isSessionTokenActive(token)) return
    if (this.toolOutputGate) return
    if (this.pendingArtworkNavigation && !this.data.isSpeaking && !this.data.isThinking) {
      const url = this.pendingArtworkNavigation
      this.pendingArtworkNavigation = false
      wx.navigateTo({
        url,
        fail: error => console.warn('[Voice Healing] open create analysis failed', error)
      })
      return
    }
    const ambient = this.pendingAmbientAudio
    if (!ambient || ambient.token !== token || this.data.isMuted || this.data.isSpeaking || this.data.isThinking || !this.musicContext) return
    this.pendingAmbientAudio = null
    this.stopAudioContextSafely(this.musicContext, 'ambient')
    this.ambientPlaybackToken += 1
    this.ambientAudioSource = ambient
    this.ambientAudioPlaying = false
    this.ambientAudioPaused = false
    this.musicContext.src = ambient.url
    this.musicContextHasSource = true
    this.musicContext.loop = ambient.loop
    this.musicContext.volume = ambient.volume
    this.ambientAudioActive = true
    this.setData({
      toolSummary: ambient.loop ? '声音陪伴进行中' : '呼吸引导进行中',
      statusText: ambient.loop ? '声音陪伴正在准备' : '呼吸引导正在准备'
    })
    console.info('[Voice Healing] tool audio playback requested', {
      loop: ambient.loop,
      source: ambient.source,
      localFile: !/^https?:\/\//i.test(String(ambient.url || '')),
      token: ambient.token,
      playbackToken: this.ambientPlaybackToken
    })
    try {
      this.musicContext.play()
    } catch (error) {
      this.handleAmbientAudioFailure(error)
    }
  },

  handleAmbientAudioFailure(error) {
    if (!this.ambientAudioActive) return
    const ambient = this.ambientAudioSource
    console.warn('[Voice Healing] tool audio playback error', {
      source: ambient && ambient.source,
      token: this.ambientPlaybackToken,
      message: String(error && (error.errMsg || error.message) || error || '')
    })
    this.ambientAudioActive = false
    this.ambientAudioPlaying = false
    this.ambientAudioSource = null
    this.musicContextHasSource = false
    if (!this.isSessionTokenActive(this.sessionToken)) return
    this.setData({
      toolEvents: this.data.toolEvents.map(item => item.status === 'done'
        ? (ambient && item.id === ambient.eventId
          ? { ...item, status: 'error', description: '工具已调用，但声音没有在手机上播放出来' }
          : item)
        : item),
      toolSummary: '声音陪伴未播放',
      statusText: '声音陪伴没有播放出来，请检查网络或手机媒体音量'
    })
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
      this.flushPendingToolOutputs(token)
      this.scheduleListening(200, token)
      return
    }

    try {
      let resolvedAudioUrl = audioUrl
      if (!resolvedAudioUrl && this.currentSpeechIsOpening) {
        // onLoad 已经可能在后台预生成开场音频；这里复用同一个 Promise，
        // 不再并发生成第二份欢迎语，也避免真机上播放到尚未完成的 URL。
        resolvedAudioUrl = await this.prepareOpeningAudio()
      }
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
      this.currentSpeechIsOpening = false
      this.clearPlaybackStartTimer()
      this.activePlaybackToken = 0
      this.ttsPlayRequested = false
      this.toolOutputGate = false
      const errorMessage = String(error && error.message || '')
      const statusText = errorMessage.includes('VIVO_KEY_MISSING')
        ? '语音服务未配置，文字回应已准备好'
        : '语音生成失败，文字回应已准备好'
      this.setData({ isSpeaking: false, statusText })
      this.setData({ conversationPhase: 'listening' })
      this.flushPendingToolOutputs(token)
      if (this.data.sessionActive) this.scheduleListening(250, token)
    }
  },

  playAudioUrl(audioUrl, token, timing = null) {
    if (!audioUrl || !this.isSessionTokenActive(token)) return
    try {
      const playbackToken = this.playbackToken + 1
      this.playbackToken = playbackToken
      this.activePlaybackToken = playbackToken
      this.playbackStarted = false
      this.ttsPlayRequested = false
      // stop() 在部分真机基础库中会异步触发一次旧 onEnded；在新音频真正开始前忽略它。
      this.ignoreAudioEndedUntil = Date.now() + 250
      this.clearPlaybackStartTimer()
      this.assistantPlaybackActive = true
      this.toolOutputGate = false
      this.pauseAmbientAudio('tts')
      this.stopAudioContextSafely(this.audioContext, 'tts')
      this.audioContext.autoplay = false
      this.audioContext.src = audioUrl
      this.audioContextHasSource = true
      this.audioContext.volume = 1
      if (timing) {
        this.currentSpeechTiming = timing
        if (!timing.audioReadyAt) timing.audioReadyAt = Date.now()
      }
      this.setData({ isSpeaking: false, conversationPhase: 'assistantSpeaking', statusText: '艺呦正在准备声音，请稍等' })
      this.playbackStartTimer = setTimeout(() => {
        if (!this.isActiveAudioPlayback() || this.playbackStarted || playbackToken !== this.activePlaybackToken) return
        this.handleAudioPlaybackFailure(new Error('音频在规定时间内没有开始播放'))
      }, PLAYBACK_START_TIMEOUT_MS)
    } catch (error) {
      console.warn('[Voice Healing] tts play failed', error)
      this.handleAudioPlaybackFailure(error)
    }
  },

  isActiveAudioPlayback() {
    return Boolean(
      this.pageAlive &&
      this.data.sessionActive &&
      this.assistantPlaybackActive &&
      this.activePlaybackToken > 0
    )
  },

  clearPlaybackStartTimer() {
    if (this.playbackStartTimer) clearTimeout(this.playbackStartTimer)
    this.playbackStartTimer = null
  },

  finishAudioPlayback(statusText = '轮到你说了，说完后停顿约 1.1 秒即可') {
    if (!this.isActiveAudioPlayback()) return
    const token = this.sessionToken
    this.clearPlaybackStartTimer()
    this.activePlaybackToken = 0
    this.playbackStarted = false
    this.ttsPlayRequested = false
    this.audioContextHasSource = false
    this.assistantPlaybackActive = false
    this.currentSpeechIsOpening = false
    this.setData({ isSpeaking: false, conversationPhase: 'listening', statusText })
    this.resumeAmbientAudio()

    const pendingTool = this.pendingHealingTool
    this.pendingHealingTool = null
    if (pendingTool && this.isSessionTokenActive(pendingTool.token)) {
      this.runHealingTool(pendingTool.toolCall, pendingTool.token)
    }
    this.flushPendingToolOutputs(token)
    // 给手机扬声器和麦克风留出消除残响的时间，避免第一段把艺呦的尾音录进去。
    this.scheduleListening(AUDIO_TO_MIC_SETTLE_MS, token)
  },

  handleAudioPlaybackFailure(error) {
    if (!this.isActiveAudioPlayback()) return
    console.warn('[Voice Healing] audio playback recovery', {
      opening: this.currentSpeechIsOpening,
      message: String(error && (error.errMsg || error.message) || error || '')
    })

    // 回复语音失败时只重试一次；开场语音不重播，避免用户听到两次相同的欢迎语。
    if (!this.currentSpeechIsOpening && this.currentSpeechText && this.currentSpeechToken === this.sessionToken && this.currentSpeechRetry < 1) {
      this.currentSpeechRetry += 1
      this.clearPlaybackStartTimer()
      this.activePlaybackToken = 0
      this.playbackStarted = false
      this.assistantPlaybackActive = true
      this.setData({ isSpeaking: false, statusText: '语音连接不稳定，正在重试' })
      this.speakText(this.currentSpeechText, this.currentSpeechToken, '')
      return
    }

    const wasOpening = this.currentSpeechIsOpening
    this.clearPlaybackStartTimer()
    this.activePlaybackToken = 0
    this.playbackStarted = false
    this.ttsPlayRequested = false
    this.audioContextHasSource = false
    this.assistantPlaybackActive = false
    this.currentSpeechIsOpening = false
    this.toolOutputGate = false
    this.resumeAmbientAudio()
    if (this.isSessionTokenActive(this.sessionToken)) {
      this.setData({
        isSpeaking: false,
        conversationPhase: 'listening',
        statusText: wasOpening ? '欢迎语暂时没有播放出来，轮到你说了' : '语音暂时没播放出来，轮到你说了'
      })
      this.flushPendingToolOutputs(this.sessionToken)
      this.scheduleListening(AUDIO_TO_MIC_SETTLE_MS, this.sessionToken)
    }
  },

  pauseAmbientAudio(reason = 'unknown') {
    if (!this.ambientAudioActive || !this.musicContext) return
    this.musicContext.pause()
    this.ambientAudioPaused = true
    console.info('[Voice Healing] tool audio paused', {
      reason,
      loop: Boolean(this.ambientAudioSource && this.ambientAudioSource.loop),
      token: this.ambientPlaybackToken
    })
  },

  resumeAmbientAudio(reason = 'unknown') {
    if (!this.ambientAudioActive || !this.ambientAudioPaused || this.data.isMuted || !this.musicContext) return
    this.ambientAudioPaused = false
    console.info('[Voice Healing] tool audio resume requested', {
      reason,
      loop: Boolean(this.ambientAudioSource && this.ambientAudioSource.loop),
      token: this.ambientPlaybackToken
    })
    try {
      this.musicContext.play()
    } catch (error) {
      this.handleAmbientAudioFailure(error)
    }
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
    this.sessionStarting = false
    this.microphoneAuthorizationPending = false
    this.assistantPlaybackActive = false
    this.currentSpeechIsOpening = false
    this.activePlaybackToken = 0
    this.playbackStarted = false
    this.ttsPlayRequested = false
    this.clearPlaybackStartTimer()
    this.pendingHealingTool = null
    this.pendingAmbientAudio = null
    this.pendingArtworkNavigation = false
    this.toolOutputGate = false
    this.stopSilenceMonitor()
    if (this.sessionTimer) clearInterval(this.sessionTimer)
    if (this.listenTimer) clearTimeout(this.listenTimer)
    this.sessionTimer = null
    this.listenTimer = null
    this.sessionStartedAt = null
    if (this.recordStartTimer) clearTimeout(this.recordStartTimer)
    this.recordStartTimer = null
    this.clearRecorderStopTimer()
    if (this.recorderManager && (this.data.isRecording || this.recordingRequested)) {
      this.recordOptions = { skip: true }
      this.recordingRequested = false
      try { this.recorderManager.stop() } catch (error) { console.warn('[Voice Healing] recorder stop skipped', error) }
    }
    this.stopAudioContextSafely(this.audioContext, 'tts')
    this.stopAudioContextSafely(this.musicContext, 'ambient')
    this.ambientAudioActive = false
    this.ambientAudioPaused = false
    this.ambientAudioPlaying = false
    this.ambientAudioSource = null
    this.audioContextHasSource = false
    this.musicContextHasSource = false
  },

  isSessionTokenActive(token) {
    return Boolean(this.pageAlive && this.data.sessionActive && token === this.sessionToken)
  },

  stopAudioContextSafely(context, name) {
    if (!context) return
    const hasSource = name === 'tts'
      ? this.audioContextHasSource
      : name === 'ambient'
        ? this.musicContextHasSource
        : Boolean(context.src)
    if (!hasSource) return
    if (name === 'tts') this.audioContextHasSource = false
    if (name === 'ambient') this.musicContextHasSource = false
    try {
      context.autoplay = false
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
