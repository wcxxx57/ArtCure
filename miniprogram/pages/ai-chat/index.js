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
        greeting: '嗨，我是小云。这里是你的专属树洞，想说什么都可以，我会一直陪着你，静静地听。💙',
        style: 'gentle' // 温柔、倾听、安慰
      },
      therapist: {
        name: '疗愈师模式 · 专业陪伴',
        greeting: '你好，我是小云疗愈师。我会运用艺术疗愈的专业知识，帮助你探索内心、缓解情绪。有什么想和我聊聊的吗？🌿',
        style: 'professional' // 专业、引导、建议
      },
      companion: {
        name: '日常陪伴 · 轻松聊天',
        greeting: '哈喽～我是小云！今天过得怎么样呀？有什么开心的事想分享吗？或者只是想找人聊聊天也可以哦～ ☕',
        style: 'casual' // 轻松、活泼、朋友感
      }
    },
    
    // 当前显示的消息列表
    messages: [],
    
    // 各模式独立的聊天记录
    modeMessages: {
      comfort: [
        { id: 1, type: 'bot', text: '嗨，我是小云。这里是你的专属树洞，想说什么都可以，我会一直陪着你，静静地听。💙' }
      ],
      therapist: [
        { id: 1, type: 'bot', text: '你好，我是小云疗愈师。我会运用艺术疗愈的专业知识，帮助你探索内心、缓解情绪。有什么想和我聊聊的吗？🌿' }
      ],
      companion: [
        { id: 1, type: 'bot', text: '哈喽～我是小云！今天过得怎么样呀？有什么开心的事想分享吗？或者只是想找人聊聊天也可以哦～ ☕' }
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
    
    // 滚动到的消息ID
    scrollToMessage: '',
    
    // 是否正在输入
    isTyping: false,
    
    // 快捷问题列表
    quickQuestions: [
      '今天有点难过...',
      '感觉很累，想休息',
      '心里有些话想说',
      '最近压力好大',
      '需要一些安慰'
    ],
    
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

  onLoad(options) {
    // 初始化当前模式的消息
    this.setData({
      messages: this.data.modeMessages[this.data.currentMode],
      quickQuestions: this.data.modeQuickQuestions[this.data.currentMode]
    })
  },

  onShow() {
    // 页面显示
  },

  // 切换模式
  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.currentMode) return
    
    const { modeConfig, modeQuickQuestions, modeMessages } = this.data
    const config = modeConfig[mode]
    
    // 切换到对应模式的聊天记录
    this.setData({
      currentMode: mode,
      currentModeName: config.name,
      quickQuestions: modeQuickQuestions[mode],
      messages: modeMessages[mode]
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
  sendMessage(text) {
    const { currentMode, modeMessages, modeMessageCounters } = this.data
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
    
    // 显示正在输入
    setTimeout(() => {
      this.setData({ isTyping: true })
      this.scrollToBottom()
    }, 300)
    
    // 模拟 AI 回复
    setTimeout(() => {
      this.generateReply(text)
    }, 1000 + Math.random() * 1000)
  },

  // 生成 AI 回复
  generateReply(userText) {
    const { currentMode, modeMessages, modeMessageCounters, replies } = this.data
    const messageId = modeMessageCounters[currentMode]
    
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
    
    const botMessage = {
      id: messageId,
      type: 'bot',
      text: replyText
    }
    
    // 更新当前模式的消息列表
    const currentMessages = modeMessages[currentMode]
    const newMessages = [...currentMessages, botMessage]
    
    // 更新数据
    const newModeMessages = { ...modeMessages }
    newModeMessages[currentMode] = newMessages
    
    const newCounters = { ...modeMessageCounters }
    newCounters[currentMode] = messageId + 1
    
    this.setData({
      messages: newMessages,
      modeMessages: newModeMessages,
      modeMessageCounters: newCounters,
      isTyping: false,
      scrollToMessage: `msg-${messageId}`
    })
    
    // 延迟滚动确保渲染完成
    setTimeout(() => {
      this.scrollToBottom()
    }, 100)
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({
      scrollToMessage: 'scroll-bottom'
    })
  }
})
