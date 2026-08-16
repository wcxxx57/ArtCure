// AI 对话页面 index.js

Page({
  data: {
    // 当前模式
    currentMode: 'comfort', // comfort | therapist | companion
    currentModeName: '树洞模式 · 倾听你的心声',
    
    // 模式配置
    modeConfig: {
      comfort: {
        name: '树洞模式 · 倾听你的心声',
        greeting: '大家好呀，我是艺哟。我是来自艺术疗愈星球的爱心小精灵，也是你的专属树洞！\n不管是 emo、焦虑还是想放空，都可以来找我贴贴～ 用色彩和温柔，把烦恼揉成小棉花糖，把快乐慢慢点亮！\n快来和我一起，在艺术里找回内心的软乎乎吧～💙',
        style: 'gentle' // 温柔、倾听、安慰
      },
      therapist: {
        name: '疗愈师模式 · 专业陪伴',
        greeting: '你好，我是艺呦疗愈师。我是来自艺术疗愈星球的爱心小精灵，我会运用艺术疗愈的专业知识，帮助你探索内心、缓解情绪。有什么想和我聊聊的吗？🌿',
        style: 'professional' // 专业、引导、建议
      },
      companion: {
        name: '日常陪伴 · 轻松聊天',
        greeting: '哈喽，我在～今天想随便聊点什么？',
        style: 'casual' // 轻松、活泼、朋友感
      }
    },
    
    // 当前显示的消息列表
    messages: [],
    
    // 各模式独立的聊天记录
    modeMessages: {
      comfort: [
        { id: 1, type: 'bot', text: '你好呀，我是~~艺哟~~^^！我是来自艺术疗愈星球的爱心小精灵，也是你的~~专属树洞~~！不管是 emo、焦虑还是想放空，都可以来找我贴贴～ 💙', richText: '' }
      ],
      therapist: [
        { id: 1, type: 'bot', text: '你好，我是~~疗愈师艺呦~~。我会运用~~艺术疗愈的专业知识~~，帮助你探索内心、缓解情绪。有什么想和我聊聊的吗？🌿', richText: '' }
      ],
      companion: [
        { id: 1, type: 'bot', text: '哈喽，我是~~艺呦~~。我在～今天想随便聊点什么？', richText: '' }
      ]
    },
    
    // 各模式的消息ID计数
    modeMessageCounters: {
      comfort: 2,
      therapist: 2,
      companion: 2
    },
    
    // 输入框内容
    inputText: '',

    // 语音疗愈
    isRecording: false,
    voiceStatus: '点麦克风说心情',
    currentGuideText: '',
    guideSessionActive: false,
    guideSessionStep: 0,
    guideSessionStatus: '点“三分钟引导”开始沉浸陪伴',
    guideAwaitingResponse: false,
    guideMaxTurns: 4,
    
    // 滚动到的消息ID
    scrollToMessage: '',
    
    // 各模式独立的加载状态
    modeTypingStatus: {
      comfort: false,
      therapist: false,
      companion: false
    },
    
    // 当前模式是否正在输入（用于显示）
    isTyping: false,
    
    // 不同模式的快捷问题
    modeQuickQuestions: {
      comfort: [
        '今天有点难过...',
        '感觉很累，想休息',
        '心里有些话想说',
        '最近压力好大',
        '需要一些安慰'
      ],
      therapist: [
        '什么是艺术疗愈？',
        '如何缓解焦虑？',
        '推荐一些疗愈方法',
        '情绪低落怎么办？',
        '如何进行自我关怀？'
      ],
      companion: [
        '今天发生了一件趣事',
        '最近在追什么剧？',
        '有什么好吃的推荐？',
        '周末有什么计划？',
        '聊聊最近的生活'
      ]
    },
    
    // AI 回复模板
    replies: {
      default: '我听到了你的心声。我也许不能立刻解决所有问题，但我会一直陪着你。要不要试着去「疗愈馆」听听雨声？',
      artTherapy: '艺术疗愈是一种结合创造性艺术表达（如绘画、音乐、舞动）和心理治疗的方法，帮助你非语言地表达情绪，探索自我。它不需要任何艺术技巧，重要的是表达的过程。',
      activities: '你可以尝试：\n🎨 曼陀罗绘画 - 专注于填色的过程\n🏺 黏土捏塑 - 用双手感受创作\n📝 拼贴画 - 拼凑出内心的风景\n🎵 即兴音乐 - 随心所欲地敲打节奏',
      lowMood: '抱抱你。心情不好的时候，试着不要急于寻找原因，就让自己静静地感受一会儿。你可以去「疗愈馆」听一首轻音乐，或者画一幅曼陀罗，让思绪自然流动。',
      anxious: '抱抱你。感到焦躁时，试着深呼吸。吸气4秒，屏住4秒，呼出6秒。或者拿起画笔随意涂鸦，不需要画得像什么，只需要释放线条。焦虑会过去的。',
      stressed: '压力大的时候，我们的身体会紧绷。试着做一个简单的放松：闭上眼睛，从头顶开始，想象温暖的阳光一点点往下流淌，经过眉毛、脸颊、肩膀...让每个部位都放松下来。'
    }
  },

  // Markdown 转 HTML（回复消息渲染）
  parseMarkdown(text) {
    if (!text) return text
    
    let html = text
    
    // 转义 HTML 特殊字符
    html = html.replace(/&/g, '&amp;')
    html = html.replace(/</g, '&lt;')
    html = html.replace(/>/g, '&gt;')
    
    // 标题处理 - 支持 # ## ### #### 等
    html = html.replace(/^#### (.+)$/gm, '<div style="font-weight:bold;font-size:30rpx;margin:16rpx 0 8rpx;color:#4A90E2;">$1</div>')
    html = html.replace(/^### (.+)$/gm, '<div style="font-weight:bold;font-size:32rpx;margin:16rpx 0 8rpx;color:#4A90E2;">$1</div>')
    html = html.replace(/^## (.+)$/gm, '<div style="font-weight:bold;font-size:34rpx;margin:18rpx 0 10rpx;color:#4A90E2;">$1</div>')
    html = html.replace(/^# (.+)$/gm, '<div style="font-weight:bold;font-size:36rpx;margin:20rpx 0 12rpx;color:#4A90E2;">$1</div>')
    
    // 加粗蓝色 **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:bold;color:#1976D2;">$1</span>')
    
    // 红色强调 ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<span style="color:#e8757e;font-weight:bold;">$1</span>')
    
    // 绿色标签 ##text##
    html = html.replace(/##(.+?)##/g, '<span style="color:#43A047;background:#E8F5E9;padding:4rpx 8rpx;border-radius:4rpx;">$1</span>')
    
    // 橙色标签 %%text%%
    html = html.replace(/%%(.+?)%%/g, '<span style="color:#FB8C00;background:#FFF3E0;padding:4rpx 8rpx;border-radius:4rpx;">$1</span>')
    
    // 斜体 *text* -> <em>
    html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<span style="font-style:italic;">$2</span>')
    
    // 有序列表 1. item -> 带序号的列表
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin:8rpx 0;padding-left:16rpx;position:relative;"><span style="position:absolute;left:0;color:#4A90E2;font-weight:bold;">$1.</span><span style="margin-left:24rpx;">$2</span></div>')
    
    // 无序列表 - item 或 * item -> 带圆点的列表
    html = html.replace(/^[-*]\s+(.+)$/gm, '<div style="margin:8rpx 0;padding-left:16rpx;position:relative;"><span style="position:absolute;left:0;color:#4A90E2;">•</span><span style="margin-left:20rpx;">$1</span></div>')
    
    // 代码块（简单处理）
    html = html.replace(/`([^`]+)`/g, '<span style="background-color:#f5f5f5;padding:2rpx 8rpx;border-radius:6rpx;font-family:monospace;color:#d63384;">$1</span>')
    
    // 换行处理
    html = html.replace(/\n\n/g, '<br/><br/>')
    html = html.replace(/\n/g, '<br/>')
    
    return html
  },

  onLoad(options) {
    this.pageAlive = true
    this.setupRecorder()

    // 初始化当前模式的消息和快捷问题
    const messages = this.data.modeMessages[this.data.currentMode]
    // 解析第一条欢迎消息的格式
    if (messages.length > 0 && messages[0].type === 'bot') {
      messages[0].richText = this.parseMarkdown(messages[0].text)
    }
    this.setData({
      messages: messages,
      quickQuestions: this.data.modeQuickQuestions[this.data.currentMode]
    })
  },

  onShow() {
    this.pageAlive = true
  },

  onHide() {
    this.pageAlive = false
  },

  onUnload() {
    this.pageAlive = false
    if (this.guideListenTimer) {
      clearTimeout(this.guideListenTimer)
      this.guideListenTimer = null
    }

    if (this.data.isRecording && this.recorderManager) {
      this.recorderManager.stop()
    }
  },

  setupRecorder() {
    this.recorderManager = wx.getRecorderManager()

    this.recorderManager.onStart(() => {
      if (!this.pageAlive) return
      const recordOptions = this.currentRecordOptions || {}
      this.setData({
        isRecording: true,
        voiceStatus: recordOptions.guide ? '引导中：正在聆听你的回应' : '正在听你说',
        guideSessionStatus: recordOptions.guide ? '正在聆听：说一句短回应即可' : this.data.guideSessionStatus
      })
    })

    this.recorderManager.onStop((res) => {
      if (!this.pageAlive) return
      const recordOptions = this.currentRecordOptions || {}
      this.currentRecordOptions = null
      this.setData({
        isRecording: false,
        voiceStatus: recordOptions.guide ? '听到了，正在整理回应' : '语音已记录，正在整理',
        guideSessionStatus: recordOptions.guide ? '听到了，正在整理回应' : this.data.guideSessionStatus
      })
      this.handleVoiceStop(res, recordOptions)
    })

    this.recorderManager.onError((err) => {
      if (!this.pageAlive) return
      console.error('[AI Chat] 录音失败:', err)
      this.setData({
        isRecording: false,
        voiceStatus: '录音失败，可改用文字'
      })
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      })
    })
  },

  // 切换模式
  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.currentMode) return
    
    const { modeConfig, modeQuickQuestions, modeMessages, modeTypingStatus } = this.data
    const config = modeConfig[mode]
    
    // 获取该模式的消息并解析欢迎消息
    const messages = modeMessages[mode]
    if (messages.length > 0 && messages[0].type === 'bot' && !messages[0].richText) {
      messages[0].richText = this.parseMarkdown(messages[0].text)
    }
    
    // 切换到对应模式的聊天记录，并同步该模式的加载状态
    this.setData({
      currentMode: mode,
      currentModeName: config.name,
      quickQuestions: modeQuickQuestions[mode],
      messages: messages,
      isTyping: modeTypingStatus[mode]  // 同步当前模式的加载状态
    })
    
    // 滚动到底部
    setTimeout(() => {
      this.scrollToBottom()
    }, 100)
  },

  // 关闭页面
  onClose() {
    wx.navigateBack({
      fail: () => {
        // 如果返回失败，尝试跳转到首页
        wx.switchTab({
          url: '/pages/page1/index'
        })
      }
    })
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  onVoiceTap() {
    wx.navigateTo({
      url: '/pages/voice-healing/index'
    })
  },

  startRecord(options = {}) {
    this.currentRecordOptions = options
    this.recorderManager.start({
      duration: options.duration || 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'pcm',
      frameSize: 4
    })
  },

  async handleVoiceStop(res, recordOptions = {}) {
    if (recordOptions.skip) {
      return
    }

    if (!res || !res.tempFilePath) {
      this.setData({
        voiceStatus: recordOptions.guide ? '没有听清，可以再说一句' : '没有录到声音，可再试一次',
        guideSessionStatus: recordOptions.guide ? '没有听清，可以点“回应”再说一次' : this.data.guideSessionStatus,
        guideAwaitingResponse: Boolean(recordOptions.guide)
      })
      wx.showToast({
        title: recordOptions.guide ? '没有听清' : '没有录到声音',
        icon: 'none'
      })
      return
    }

    let uploadedFileID = ''

    try {
      this.setData({ voiceStatus: '正在上传语音' })
      const cloudPath = `voice-healing/${Date.now()}-${Math.random().toString(36).slice(2)}.pcm`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: res.tempFilePath
      })

      uploadedFileID = uploadRes.fileID
      this.setData({ voiceStatus: '正在识别你说的话' })

      const transcribeRes = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'voice.asrShort',
          data: {
            fileID: uploadedFileID,
            audioType: 'pcm',
            sampleRate: 16000,
            userId: wx.getStorageSync('userId') || 'miniprogram_user'
          }
        }
      })

      const result = transcribeRes.result || {}
      if (!result.success) {
        throw new Error(result.message || '语音识别失败')
      }

      const text = this.extractVoiceText(result)
      if (!text) {
        throw new Error('没有识别出有效文字')
      }

      if (recordOptions.guide || this.data.guideSessionActive) {
        this.setData({
          voiceStatus: '听到了，正在回应你',
          guideSessionStatus: '听到了，正在回应你'
        })
        this.handleGuideUserText(text)
        return
      }

      this.setData({ voiceStatus: '已转成文字并发送' })
      this.sendMessage(text, {
        inputType: 'voice',
        scene: 'voice_companion'
      })
    } catch (err) {
      console.error('[AI Chat] 语音转写失败:', err)
      if (recordOptions.guide || this.data.guideSessionActive) {
        this.setData({
          voiceStatus: '这次没有听清，先继续引导',
          guideSessionStatus: '这次没有听清，先继续引导',
          guideAwaitingResponse: true
        })
        this.continueGuideAfterSilence()
        return
      }

      this.setData({ voiceStatus: '转写失败，可改用文字' })
      wx.showToast({
        title: err.message || '语音识别失败',
        icon: 'none'
      })
    } finally {
      if (uploadedFileID) {
        wx.cloud.deleteFile({
          fileList: [uploadedFileID]
        }).catch(deleteErr => {
          console.log('[AI Chat] 临时语音文件删除失败:', deleteErr)
        })
      }
    }
  },

  extractVoiceText(result) {
    return String(
      result.text ||
      (result.raw && result.raw.data && result.raw.data.text) ||
      ''
    ).trim()
  },

  onGuideTap() {
    if (this.data.guideSessionActive) {
      this.stopGuideSession()
      return
    }

    this.startGuideSession()
  },

  startGuideSession() {
    if (this.guideListenTimer) {
      clearTimeout(this.guideListenTimer)
      this.guideListenTimer = null
    }

    const opening = this.buildGuideOpening()
    this.setData({
      guideSessionActive: true,
      guideSessionStep: 0,
      guideAwaitingResponse: true,
      guideSessionStatus: '第1轮：听提示，随后说一句你的感受',
      voiceStatus: '沉浸引导中：听提示后回应',
      currentGuideText: opening
    })

    this.addBotMessage(opening, this.data.currentMode, {
      guideText: opening,
      isGuide: true
    })
    this.playGuideText(opening)
    this.scheduleGuideListening(2800)
  },

  stopGuideSession() {
    if (this.guideListenTimer) {
      clearTimeout(this.guideListenTimer)
      this.guideListenTimer = null
    }

    if (this.data.isRecording && this.recorderManager) {
      this.currentRecordOptions = { skip: true }
      this.recorderManager.stop()
    }

    this.setData({
      guideSessionActive: false,
      guideAwaitingResponse: false,
      guideSessionStatus: '沉浸引导已结束',
      voiceStatus: '三分钟引导已结束'
    })
  },

  buildGuideOpening() {
    return '我们开始一个三分钟的听与说引导。先让脚轻轻踩住地面，肩膀放松一点。吸气，停一小下，再慢慢呼气。\n\n如果手边有纸和笔，选一个现在最想靠近的颜色。等我开始聆听时，你只要说一句很短的话：这个颜色像什么，或者你现在身体哪里最有感觉。'
  },

  scheduleGuideListening(delay) {
    if (this.guideListenTimer) {
      clearTimeout(this.guideListenTimer)
    }

    this.guideListenTimer = setTimeout(() => {
      this.guideListenTimer = null
      if (!this.data.guideSessionActive || this.data.isRecording) return

      wx.authorize({
        scope: 'scope.record',
        success: () => this.startGuideListening(),
        fail: () => {
          this.setData({
            guideAwaitingResponse: true,
            voiceStatus: '点“回应”说一句，我会继续听',
            guideSessionStatus: '点“回应”说一句，我会继续听'
          })
        }
      })
    }, delay || 1800)
  },

  startGuideListening() {
    if (!this.data.guideSessionActive || this.data.isRecording) return

    this.setData({
      guideAwaitingResponse: false,
      voiceStatus: '正在聆听，想说时直接说，点结束可提前完成',
      guideSessionStatus: '正在聆听：想说时直接说'
    })
    this.startRecord({
      guide: true,
      duration: 22000
    })
  },

  async handleGuideUserText(text) {
    const mode = this.data.currentMode
    const step = this.data.guideSessionStep
    this.addUserOnlyMessage(text, mode)
    this.setGuideTyping(mode, true)

    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'chat.complete',
          data: {
            scene: 'immersive_guide',
            mode,
            inputType: 'voice',
            intent: 'immersive_guide_turn',
            turnIndex: step,
            prompt: text,
            messages: this.buildChatHistory(mode, text)
          }
        }
      })

      const result = res.result || {}
      if (result.success === false) {
        throw new Error(result.message || '沉浸引导生成失败')
      }

      const reply = result.reply || this.buildGuideTurnFallback(text, step)
      this.advanceGuideSession(reply, mode, step)
    } catch (err) {
      console.warn('[AI Chat] 沉浸引导远端回应失败，使用本地推进:', err)
      this.advanceGuideSession(this.buildGuideTurnFallback(text, step), mode, step)
    }
  },

  continueGuideAfterSilence() {
    if (!this.data.guideSessionActive) return

    const mode = this.data.currentMode
    const step = this.data.guideSessionStep
    this.advanceGuideSession(this.buildGuideTurnFallback('刚才没有听清', step), mode, step)
  },

  advanceGuideSession(reply, mode, previousStep) {
    this.setGuideTyping(mode, false)

    const nextStep = previousStep + 1
    const isFinished = nextStep >= this.data.guideMaxTurns
    this.addBotMessage(reply, mode, {
      guideText: reply,
      isGuide: true
    })
    this.playGuideText(reply)

    this.setData({
      guideSessionStep: nextStep,
      guideAwaitingResponse: !isFinished,
      guideSessionActive: !isFinished,
      guideSessionStatus: isFinished ? '引导完成：可以停下观察作品' : `第${nextStep + 1}轮：听提示后说一句回应`,
      voiceStatus: isFinished ? '沉浸引导完成' : '沉浸引导中：准备聆听下一句'
    })

    if (!isFinished) {
      this.scheduleGuideListening(2600)
    }
  },

  buildGuideTurnFallback(text, step) {
    const userText = String(text || '').trim()
    const guides = [
      `我听到了，「${userText || '这个感受'}」先被放在这里。现在请沿着这个感觉画三条很慢的线：一条代表此刻，一条代表你想要的安稳，一条代表下一口呼气。画好后，说一句：哪一条最接近你。`,
      '谢谢你回应我。接下来沿着刚才最有感觉的那条线，加一些圆点或小色块。每加一个点，就呼一口气。做完后，说一句：画面里哪里稍微松了一点。',
      '我继续听着。现在给画面找一个小小的安全角落，可以用框、圆圈或浅色把它圈出来。它不需要很大，只要能放下一点点自己。完成后，说一个名字给它。',
      '很好，我们先停在这里。看着这个名字，慢慢吸气，再呼气。今天这张画不需要被解释，它只是证明你刚刚陪了自己三分钟。'
    ]

    return guides[Math.min(Math.max(step, 0), guides.length - 1)]
  },

  async playGuideText(text) {
    const content = String(text || '').trim()
    if (!content) return

    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'voice.tts',
          data: { text: content }
        }
      })

      const audioUrl = res.result && res.result.audioUrl
      if (!audioUrl) return

      if (this.guideAudio) {
        this.guideAudio.stop()
        this.guideAudio.destroy()
      }

      this.guideAudio = wx.createInnerAudioContext()
      this.guideAudio.src = audioUrl
      this.guideAudio.play()
    } catch (err) {
      console.warn('[AI Chat] 引导语音播放失败，保留文字引导:', err)
    }
  },

  async onPlayGuide() {
    const text = this.data.currentGuideText || '先慢慢吸气，再把注意力放到手里的画笔上。'

    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'voice.tts',
          data: { text }
        }
      })

      const audioUrl = res.result && res.result.audioUrl
      if (audioUrl) {
        const audio = wx.createInnerAudioContext()
        audio.src = audioUrl
        audio.play()
        return
      }
    } catch (err) {
      console.log('[AI Chat] TTS 播放失败，显示文稿:', err)
    }

    wx.showModal({
      title: '语音引导文稿',
      content: text,
      showCancel: false
    })
  },

  // 点击快捷问题
  onQuickQuestion(e) {
    const question = e.currentTarget.dataset.question
    this.sendMessage(question)
  },

  // 发送消息
  onSend() {
    const { inputText } = this.data
    if (!inputText.trim()) return
    
    this.sendMessage(inputText)
    this.setData({ inputText: '' })
  },

  // 发送消息逻辑
  sendMessage(text, options = {}) {
    const { currentMode, modeMessages, modeMessageCounters, modeTypingStatus } = this.data
    const messageId = modeMessageCounters[currentMode]
    
    // 添加用户消息
    const userMessage = {
      id: messageId,
      type: 'user',
      text: text
    }
    
    // 更新当前模式的消息列表
    const currentMessages = modeMessages[currentMode]
    const newMessages = [...currentMessages, userMessage]
    
    // 更新数据
    const newModeMessages = { ...modeMessages }
    newModeMessages[currentMode] = newMessages
    
    const newCounters = { ...modeMessageCounters }
    newCounters[currentMode] = messageId + 1
    
    this.setData({
      messages: newMessages,
      modeMessages: newModeMessages,
      modeMessageCounters: newCounters,
      scrollToMessage: `msg-${messageId}`
    })
    
    // 显示正在输入（只在当前模式显示）
    setTimeout(() => {
      const newTypingStatus = { ...modeTypingStatus }
      newTypingStatus[currentMode] = true
      
      this.setData({ 
        isTyping: true,
        modeTypingStatus: newTypingStatus
      })
      this.scrollToBottom()
    }, 300)
    
    // 调用 RAG AI 服务器，传入发送时的模式
    this.callRAGService(text, currentMode, options)
  },

  addUserOnlyMessage(text, targetMode) {
    const mode = targetMode || this.data.currentMode
    const { currentMode, modeMessages, modeMessageCounters } = this.data
    const messageId = modeMessageCounters[mode]
    const userMessage = {
      id: messageId,
      type: 'user',
      text
    }

    const targetMessages = modeMessages[mode] || []
    const newMessages = [...targetMessages, userMessage]
    const newModeMessages = { ...modeMessages }
    newModeMessages[mode] = newMessages

    const newCounters = { ...modeMessageCounters }
    newCounters[mode] = messageId + 1

    const updateData = {
      modeMessages: newModeMessages,
      modeMessageCounters: newCounters
    }

    if (mode === currentMode) {
      updateData.messages = newMessages
      updateData.scrollToMessage = `msg-${messageId}`
    }

    this.setData(updateData)
    if (mode === currentMode) {
      setTimeout(() => this.scrollToBottom(), 80)
    }
  },

  setGuideTyping(mode, typing) {
    const newTypingStatus = { ...this.data.modeTypingStatus }
    newTypingStatus[mode] = typing

    const updateData = {
      modeTypingStatus: newTypingStatus
    }

    if (mode === this.data.currentMode) {
      updateData.isTyping = typing
    }

    this.setData(updateData)
  },

  // 调用 RAG AI 服务器（统一的AI服务接口）
  async callRAGService(userText, requestMode, options = {}) {
    // 使用请求时的模式，而不是当前显示的模式
    const mode = requestMode || this.data.currentMode

    try {
      console.log('[AI Chat] 调用 vivoAigcGateway 云函数')
      console.log('[AI Chat] 请求模式:', mode)

      const sceneMap = {
        comfort: 'voice_companion',
        therapist: 'voice_companion',
        companion: 'voice_companion'
      }
      const scene = options.scene || sceneMap[mode] || 'voice_companion'

      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'chat.complete',
          data: {
            scene,
            mode,
            inputType: options.inputType || 'text',
            intent: options.intent || '',
            prompt: userText,
            messages: this.buildChatHistory(mode, userText)
          }
        }
      })

      const result = res.result || {}
      console.log('[AI Chat] vivoAigcGateway 响应:', result)

      if (result.success === false) {
        throw new Error(result.message || '蓝心大模型调用失败')
      }

      if (result.reply) {
        // 回复添加到请求时的模式，而不是当前显示的模式
        this.addBotMessage(result.reply, mode, {
          guideText: result.audioText || result.guideText || '',
          isGuide: options.intent === 'three_minute_guide'
        })
        
        // 可选：显示检索来源（调试用）
        if (result.sources && result.sources.length > 0) {
          console.log('[AI Chat] 知识来源:', result.sources)
        }
      } else {
        console.error('[AI Chat] vivoAigcGateway 返回错误:', result)
        this.addBotMessage('抱歉，我现在有点忙，请稍后再试。如果你需要帮助，也可以切换到其他模式聊聊。', mode)
      }
      
    } catch (err) {
      if (options.intent === 'three_minute_guide') {
        console.warn('[AI Chat] 三分钟引导远端生成失败，使用本地引导:', err)
        const localGuide = this.buildLocalThreeMinuteGuide()
        this.addBotMessage(localGuide, mode, {
          guideText: localGuide,
          isGuide: true
        })
        return
      }

      console.error('[AI Chat] 调用 RAG 服务失败:', err)
      // 降级到本地回复 - 传入请求时的模式
      this.generateLocalReply(userText, mode)
    }
  },

  buildChatHistory(mode, latestUserText) {
    const messages = this.data.modeMessages[mode] || []
    let historyMessages = messages

    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.type === 'user' && lastMessage.text === latestUserText) {
      historyMessages = messages.slice(0, -1)
    }

    return historyMessages
      .filter(item => item && item.text)
      .slice(-8)
      .map(item => ({
        role: item.type === 'bot' ? 'assistant' : 'user',
        content: item.text
      }))
  },

  // 添加机器人消息
  addBotMessage(replyText, targetMode, extra = {}) {
    // 使用指定的模式，如果没有指定则使用当前模式
    const mode = targetMode || this.data.currentMode
    const { currentMode, modeMessages, modeMessageCounters, modeTypingStatus } = this.data
    const messageId = modeMessageCounters[mode]
    
    // 解析 Markdown 为富文本
    const richText = this.parseMarkdown(replyText)
    
    const botMessage = {
      id: messageId,
      type: 'bot',
      text: replyText,
      richText: richText
    }
    
    // 更新指定模式的消息列表
    const targetMessages = modeMessages[mode]
    const newMessages = [...targetMessages, botMessage]
    
    // 更新数据
    const newModeMessages = { ...modeMessages }
    newModeMessages[mode] = newMessages
    
    const newCounters = { ...modeMessageCounters }
    newCounters[mode] = messageId + 1
    
    // 更新该模式的加载状态
    const newTypingStatus = { ...modeTypingStatus }
    newTypingStatus[mode] = false
    
    // 判断是否需要更新当前显示的消息
    const updateData = {
      modeMessages: newModeMessages,
      modeMessageCounters: newCounters,
      modeTypingStatus: newTypingStatus
    }
    
    // 只有当目标模式是当前显示的模式时，才更新 messages 和 isTyping
    if (mode === currentMode) {
      updateData.messages = newMessages
      updateData.isTyping = false
      updateData.scrollToMessage = `msg-${messageId}`
      if (extra.guideText || extra.isGuide) {
        updateData.currentGuideText = extra.guideText || replyText
      }
    }
    
    this.setData(updateData)
    
    // 如果是当前模式，延迟滚动确保渲染完成
    if (mode === currentMode) {
      setTimeout(() => {
        this.scrollToBottom()
      }, 100)
    }
  },

  // 本地回复（降级方案）
  generateLocalReply(userText, targetMode) {
    const mode = targetMode || this.data.currentMode

    if (mode === 'companion') {
      this.addBotMessage(this.buildCompanionLocalReply(userText), targetMode)
      return
    }

    if (mode === 'comfort') {
      this.addBotMessage(this.buildComfortLocalReply(userText), targetMode)
      return
    }

    this.addBotMessage(this.buildTherapistLocalReply(userText), targetMode)
  },

  buildCompanionLocalReply(userText) {
    const text = String(userText || '').trim()
    if (/难过|不开心|低落|烦|焦虑|压力|累|崩溃|委屈/.test(text)) {
      return '听起来今天有点不容易。先别急着调整好，我陪你缓一会儿。'
    }
    if (/吃|美食|奶茶|咖啡|晚饭|午饭|夜宵/.test(text)) {
      return '这个话题我爱听。你现在更想吃热乎的，还是来点甜的？'
    }
    if (/剧|电影|歌|游戏|周末|计划/.test(text)) {
      return '听起来可以展开聊聊。你最近最上头的是哪一个？'
    }
    return '我在呢。你刚说这个还挺想听后续的，后来呢？'
  },

  buildComfortLocalReply(userText) {
    const text = String(userText || '').trim()
    if (/自杀|自残|伤害自己|不想活|活不下去|结束生命|伤害别人/.test(text)) {
      return '我听到了，这已经不是需要一个人硬扛的时刻。请先联系身边可信任的人，或立刻拨打当地紧急电话/心理危机援助热线，让真实的人陪在你身边。'
    }
    if (/焦虑|压力|累|疲惫|崩溃|烦/.test(text)) {
      return '我听到了，像是你已经绷了挺久。先不用急着解释原因，给自己一点点停下来的空间也可以。你愿意先说说，现在最压着你的那一小块是什么吗？'
    }
    if (/难过|低落|委屈|不开心|想哭/.test(text)) {
      return '这听起来挺难受的。你不用马上变好，也不用把话说得很完整，我会在这里陪你慢慢捋。此刻最想被接住的是哪一句话？'
    }
    return '我听到了。你可以不用整理得很清楚，先把最想说的那一小段放在这里就好，我会陪你慢慢听。'
  },

  buildTherapistLocalReply(userText) {
    const { replies } = this.data
    let replyText = replies.default
    const lowerText = userText.toLowerCase()
    
    // 根据用户输入匹配回复
    if (lowerText.includes('什么是艺术疗愈') || lowerText.includes('艺术疗愈是什么')) {
      replyText = replies.artTherapy
    } else if (lowerText.includes('活动') || lowerText.includes('有趣') || lowerText.includes('干什么') || lowerText.includes('方法')) {
      replyText = replies.activities
    } else if (lowerText.includes('心情不好') || lowerText.includes('不开心') || lowerText.includes('低落') || lowerText.includes('难过')) {
      replyText = replies.lowMood
    } else if (lowerText.includes('焦躁') || lowerText.includes('焦虑') || lowerText.includes('烦躁')) {
      replyText = replies.anxious
    } else if (lowerText.includes('压力') || lowerText.includes('累') || lowerText.includes('疲惫') || lowerText.includes('休息')) {
      replyText = replies.stressed
    }

    return replyText
  },

  buildLocalThreeMinuteGuide() {
    return [
      '先让自己坐稳一点，脚轻轻踩住地面。你可以慢慢吸气，再慢慢呼气。现在不需要把心情说清楚，也不需要画得好看，只要让手和呼吸一起动起来。',
      '如果身边有纸和笔，先选一个此刻最想靠近的颜色。吸气的时候，把笔放到纸上；呼气的时候，画一条很慢的线。线可以弯，可以断，也可以重复。它不需要代表任何东西，只是陪你把这一刻放下来。',
      '接下来，用同样的节奏继续画。每一次呼气，都让线条多走一点；每一次吸气，都看看手里的颜色。你可以画圆点、波浪、色块，或者一个小小的安全角落。哪里想重一点就重一点，哪里想轻一点就轻一点。',
      '最后，慢慢停下来，看一眼这张纸。不要解释它，只问自己：画面里有没有一个地方，比刚才更安静一点？如果愿意，给它取一个名字。这个名字可以很简单，比如“暂时放下”“一点光”或者“我在这里”。'
    ].join('\n\n')
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({
      scrollToMessage: 'scroll-bottom'
    })
  }
})
