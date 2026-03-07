// healing-hall-ai-advisor/index.js
// AI 资源顾问页面

const WELCOME_MESSAGE = '你好,我是**艺哟**！\n我现在是你的**专属艺术疗愈资源顾问**，专门帮你找到最适合的疗愈资源的！\n\n我深入洞察了小红书、大众点评等**多方疗愈资源**，并和这些优秀的疗愈机构取得了**独家合作**！\n\n你可以告诉我**你的需求**，比如：想体验的疗愈类型（绘画、颂钵、冥想等）、预算范围、地点偏好、其他特殊要求等，我会为你推荐最合适的选项，并提供详细的预约信息哦！'

const SAMPLE_RESOURCES = {
  art_therapy_1: {
    title: '流体画工作坊 · 静安',
    therapy_medium: '流体画',
    price_text: '¥168/次',
    address_text: '静安区南京西路',
    district: '静安',
    description: '零基础友好、预约制、小班教学。流体画是一种很放松的艺术形式，通过颜色流动释放情绪。这个工作坊的老师很专业，适合初学者。',
    mood_tags: ['放松', '释放情绪', '初学者友好'],
    feature_tags: ['小班教学', '预约制', '零基础'],
    contact_info: { wechat: 'liutihuihe2024' },
    source_platform: '小红书'
  },
  art_therapy_2: {
    title: '曼陀罗绘画疗愈 · 徐汇',
    therapy_medium: '曼陀罗绘画',
    price_text: '¥280/小时',
    address_text: '徐汇区衡山路',
    district: '徐汇',
    description: '一对一、定制方案、心理学指导。曼陀罗绘画能帮助整理思绪、缓解焦虑。一对一的形式更能根据你的需求调整。',
    mood_tags: ['缓解焦虑', '整理思绪', '冥想'],
    feature_tags: ['一对一', '定制方案', '心理学指导'],
    contact_info: { phone: '13800138000' },
    source_platform: '大众点评'
  },
  art_therapy_3: {
    title: '艺术疗愈工作室 · 浦东',
    therapy_medium: '综合艺术',
    price_text: '¥150-300',
    address_text: '浦东新区世纪大道',
    district: '浦东',
    description: '性价比高、环境舒适、多种课程。这个工作室提供多种艺术疗愈课程，你可以根据心情选择。',
    mood_tags: ['放松', '多选择'],
    feature_tags: ['性价比高', '环境舒适', '多种课程'],
    contact_info: { wechat: 'art_healing_studio' },
    source_platform: '小红书'
  },
  cost_effective_1: {
    title: '舞动疗愈初体验 · 普陀',
    therapy_medium: '舞动疗愈',
    price_text: '¥99/次',
    address_text: '普陀区真北路',
    district: '普陀',
    description: '舞动疗愈不需要舞蹈基础，通过自由的身体表达释放压力。这个价格在上海很难找到！',
    mood_tags: ['释放压力', '身体表达', '初学者友好'],
    feature_tags: ['最便宜', '零基础', '释放情绪'],
    contact_info: { wechat: 'dance_healing' },
    source_platform: '小红书'
  },
  cost_effective_2: {
    title: '冥想放松课 · 长宁',
    therapy_medium: '冥想',
    price_text: '¥120/次',
    address_text: '长宁区延安西路',
    district: '长宁',
    description: '冥想是最经济的疗愈方式，这个课程包含引导冥想和茶歇，很值。',
    mood_tags: ['放松', '冥想', '平静'],
    feature_tags: ['性价比最高', '效果显著', '可重复参加'],
    contact_info: { wechat: 'meditation_relax' },
    source_platform: '大众点评'
  },
  singing_bowl_1: {
    title: '颂钵冥想 · 徐汇疗愈空间',
    therapy_medium: '颂钵冥想',
    price_text: '¥180/1.5小时',
    address_text: '徐汇区老小区',
    district: '徐汇',
    description: 'Luna是专业的颂钵疗愈师，1.5小时的体验包括呼吸引导和颂钵疗愈，很多人都被疗愈哭了。',
    mood_tags: ['深度放松', '冥想', '疗愈'],
    feature_tags: ['专业颂钵师', '深度放松', '小众体验'],
    therapist_name: 'Luna',
    therapist_intro: '专业颂钵疗愈师',
    contact_info: { wechat: 'luna_singing_bowl' },
    source_platform: '小红书'
  },
  weekend_1: {
    title: '周末艺术工作坊 · 浦东',
    therapy_medium: '流体画/曼陀罗',
    price_text: '¥120',
    address_text: '浦东新区世纪大道',
    district: '浦东',
    description: '周末下午参加，可以完全放松身心，为新一周充电。轻松氛围，适合放松。',
    mood_tags: ['放松', '周末活动'],
    feature_tags: ['周末固定开课', '轻松氛围', '适合放松'],
    contact_info: { wechat: 'weekend_art' },
    source_platform: '小红书'
  }
}

const SAMPLE_REPLIES = {
  drawing: {
    text: '你好！我先按“绘画疗愈、初次体验、好上手”这个方向，帮你筛了 3 个比较稳妥的选择。\n\n# 推荐资源\n\n- **流体画工作坊 · 静安**\n类型：工作坊 | 疗愈方式：##流体画##\n价格：%%¥168/次%% | 地址：静安区南京西路\n特色：零基础友好、预约制、小班教学\n推荐理由：更偏“释放”和“放松”，适合最近压力大、想先轻一点进入疗愈体验的人。\n\n- **曼陀罗绘画疗愈 · 徐汇**\n类型：1v1定制 | 疗愈方式：##曼陀罗绘画##\n价格：%%¥280/小时%% | 地址：徐汇区衡山路\n特色：一对一、定制方案、心理学指导\n推荐理由：更适合最近情绪比较乱、希望被温和带领着往内探索的人。\n\n- **艺术疗愈工作室 · 浦东**\n类型：工作室 | 疗愈方式：##综合艺术##\n价格：%%¥150-300%% | 地址：浦东新区世纪大道\n特色：性价比高、环境舒适、多种课程\n推荐理由：如果你还没完全确定想做哪一种媒介，这类综合型工作室会更灵活。\n\n你可以直接看下面的资源卡片，我把可预约的信息也一起整理好了。',
    recommendationIds: ['art_therapy_1', 'art_therapy_2', 'art_therapy_3']
  },
  budget: {
    text: '如果你更看重性价比，我会优先推荐“单次价格友好、体验门槛低、反馈稳定”的项目。\n\n# 经济实惠的选择\n\n- **舞动疗愈初体验 · 普陀**\n价格：%%¥99/次%% | 类型：工作坊\n疗愈方式：##舞动疗愈##\n特色：**最便宜的选择**、零基础、释放情绪\n推荐理由：适合想通过身体动起来把压力甩出去的人，门槛低，体验感很直接。\n\n- **冥想放松课 · 长宁**\n价格：%%¥120/次%% | 类型：工作坊\n疗愈方式：##冥想##\n特色：**性价比最高**、效果显著、可重复参加\n推荐理由：如果你近期焦虑、睡不好，冥想课通常是投入低、复购高的一类。\n\n如果你愿意，我下一轮还可以继续按“200 元以内”“适合下班后去”“更适合女生独自参加”继续细分。',
    recommendationIds: ['cost_effective_1', 'cost_effective_2']
  },
  singingBowl: {
    text: '如果你在找颂钵类资源，我建议优先看“带引导、时长够、老师稳定”的项目，而不是只看价格。\n\n# 颂钵疗愈工作室\n\n- **颂钵冥想 · 徐汇疗愈空间**\n类型：工作坊 | 疗愈方式：##颂钵冥想##\n价格：%%¥180/1.5小时%% | 地址：徐汇区老小区\n特色：**专业颂钵师**、深度放松、小众体验\n推荐理由：这一类更偏向“身心整体沉下来”的体验，适合最近很疲惫、想系统放松的人。\n\n下方卡片里我保留了微信信息，方便你直接收藏和预约。',
    recommendationIds: ['singing_bowl_1']
  },
  weekend: {
    text: '周末适合选那种节奏没那么赶、氛围舒服、结束后状态会明显变好的项目。\n\n# 周末疗愈活动\n\n- **周末艺术工作坊 · 浦东**\n时间：**周六下午 2-4 点** | 价格：%%¥120%%\n疗愈方式：##流体画/曼陀罗轮换##\n特色：周末固定开课、轻松氛围、适合放松\n推荐理由：如果你想在周末把工作脑切换掉，这种半天体验式课程是比较轻松、不费力的入门方案。\n\n如果你告诉我你更偏浦西还是浦东、预算上限多少，我还能继续帮你收窄范围。',
    recommendationIds: ['weekend_1']
  }
}

function pickSampleReply(userText) {
  if (userText.includes('性价比') || userText.includes('便宜')) {
    return SAMPLE_REPLIES.budget
  }

  if (userText.includes('颂钵') || userText.includes('音疗')) {
    return SAMPLE_REPLIES.singingBowl
  }

  if (userText.includes('周末')) {
    return SAMPLE_REPLIES.weekend
  }

  return SAMPLE_REPLIES.drawing
}

Page({
  data: {
    // 消息列表
    messages: [
      {
        id: 1,
        type: 'bot',
        text: WELCOME_MESSAGE,
        richText: ''
      }
    ],
    
    // 消息ID计数器
    messageCounter: 2,
    
    // 输入框内容
    inputText: '',
    
    // 滚动到的消息ID
    scrollToMessage: '',
    
    // 是否正在输入
    isTyping: false,
    
    // 快捷问题
    quickQuestions: [
      '绘画疗愈去哪体验比较好？',
      '推荐一些性价比较高的疗愈活动',
      '静安区有哪些颂钵疗愈工作室？',
      '适合周末体验的艺术疗愈活动'
    ],
    
    // 对话历史（用于上下文）
    chatHistory: [],
    
    // 资源缓存（用于存储资源数据以便点击详情时使用）
    resourceCache: SAMPLE_RESOURCES
  },

  onLoad(options) {
    // 页面加载
    this.parseWelcomeMessage()
  },

  onShow() {
    // 页面显示 - 恢复对话
    this.restoreConversation()
  },

  onHide() {
    // 页面隐藏 - 保存对话
    this.saveConversation()
  },

  // 解析欢迎消息为富文本
  parseWelcomeMessage() {
    const messages = this.data.messages
    if (messages.length > 0 && messages[0].type === 'bot') {
      messages[0].richText = this.parseMarkdown(messages[0].text)
      this.setData({ messages })
    }
  },

  // Markdown 转 HTML（支持多种格式和交互）
  parseMarkdown(text) {
    if (!text) return text

    const { cleanText } = this.extractLegacyActionMarkup(text)
    let html = cleanText
      .replace(/\r\n/g, '\n')
      .replace(/^\s{2,}/gm, '')
      .trim()
    
    // 转义 HTML
    html = html.replace(/&/g, '&amp;')
    html = html.replace(/</g, '&lt;')
    html = html.replace(/>/g, '&gt;')
    
    // 加粗蓝色 **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:bold;color:#1976D2;">$1</span>')
    
    // 红色强调 ~~text~~
    html = html.replace(/~~(.+?)~~/g, '<span style="color:#E53935;font-weight:bold;">$1</span>')
    
    // 绿色标签 ##text##
    html = html.replace(/##(.+?)##/g, '<span style="color:#43A047;background:#E8F5E9;padding:4rpx 8rpx;border-radius:4rpx;">$1</span>')
    
    // 橙色标签 %%text%%
    html = html.replace(/%%(.+?)%%/g, '<span style="color:#FB8C00;background:#FFF3E0;padding:4rpx 8rpx;border-radius:4rpx;">$1</span>')
    
    // 标题 # text
    html = html.replace(/^\s*#\s+(.+)$/gm, '<div style="font-size:32rpx;font-weight:bold;color:#1976D2;margin:12rpx 0;">$1</div>')
    
    // 列表项 • item 或 - item
    html = html.replace(/^\s*[•\-]\s+(.+)$/gm, '<div style="margin:8rpx 0;padding-left:16rpx;position:relative;"><span style="position:absolute;left:0;color:#42A5F5;">•</span><span style="margin-left:20rpx;">$1</span></div>')
    
    // 联系方式处理 - 微信 或 电话
    html = html.replace(/^\s*微信[:：]?\s*([A-Za-z0-9_-]+)\s*$/gm, '<div style="margin:10rpx 0;"><span style="display:inline-block;background:#EAF4FF;color:#1E88E5;padding:8rpx 16rpx;border-radius:999rpx;font-weight:600;">微信：$1</span></div>')
    
    html = html.replace(/^\s*电话[:：]?\s*([0-9\-+]+)\s*$/gm, '<div style="margin:10rpx 0;"><span style="display:inline-block;background:#FFF4E8;color:#EF8A22;padding:8rpx 16rpx;border-radius:999rpx;font-weight:600;">电话：$1</span></div>')
    
    // 换行
    html = html.replace(/\n\n/g, '<br/><br/>')
    html = html.replace(/\n/g, '<br/>')
    
    return html
  },

  extractLegacyActionMarkup(text) {
    const resourceIds = []
    const cleanText = (text || '').replace(/<span[^>]*class="detail-btn"[^>]*data-resource-id="([^"]+)"[^>]*>.*?<\/span>/g, (_, resourceId) => {
      resourceIds.push(resourceId)
      return ''
    }).replace(/\n{3,}/g, '\n\n')

    return { cleanText, resourceIds }
  },

  getRecommendationCards(resourceIds = []) {
    const resourceCache = this.data.resourceCache || SAMPLE_RESOURCES
    return resourceIds.map((resourceId) => {
      const resource = resourceCache[resourceId]
      if (!resource) return null
      return {
        id: resourceId,
        ...resource
      }
    }).filter(Boolean)
  },

  normalizeBotMessage(message) {
    if (!message || message.type !== 'bot') {
      return message
    }

    const { cleanText, resourceIds } = this.extractLegacyActionMarkup(message.text)
    return {
      ...message,
      text: cleanText,
      richText: this.parseMarkdown(cleanText),
      recommendations: Array.isArray(message.recommendations) && message.recommendations.length
        ? message.recommendations
        : this.getRecommendationCards(resourceIds)
    }
  },

  // 导航到资源详情页
  navigateToResourceDetail(resource) {
    const resourceStr = encodeURIComponent(JSON.stringify(resource))
    wx.navigateTo({
      url: `/pages/resource-detail/index?resource=${resourceStr}`,
      fail: (err) => {
        console.error('导航失败:', err)
        wx.showToast({
          title: '打开详情失败',
          icon: 'none'
        })
      }
    })
  },

  // 处理复制按钮点击
  onCopyContact(e) {
    const text = e.currentTarget.dataset.text
    if (!text) return
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success',
          duration: 1500
        })
      }
    })
  },

  // 处理拨打电话按钮点击
  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return
    
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        })
      }
    })
  },

  // 消息点击处理 - 处理复制和拨打电话
  onMessageTap(e) {
    const target = e.target
    
    // 处理复制按钮
    if (target.dataset.text) {
      wx.setClipboardData({
        data: target.dataset.text,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success',
            duration: 1500
          })
        }
      })
      return
    }
    
    // 处理拨打电话按钮
    if (target.dataset.phone) {
      wx.makePhoneCall({
        phoneNumber: target.dataset.phone,
        fail: () => {
          wx.showToast({
            title: '拨打失败',
            icon: 'none'
          })
        }
      })
      return
    }
    
    // 处理查看详情按钮
    if (target.dataset.resourceId) {
      const resourceId = target.dataset.resourceId
      const resource = this.data.resourceCache && this.data.resourceCache[resourceId]
      if (resource) {
        this.navigateToResourceDetail(resource)
      }
      return
    }
  },

  // 关闭页面
  onClose() {
    wx.navigateBack({
      fail: () => {
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

  onOpenRecommendation(e) {
    const resourceId = e.currentTarget.dataset.resourceId
    const resource = (this.data.resourceCache || {})[resourceId]
    if (!resource) {
      wx.showToast({
        title: '资源信息不存在',
        icon: 'none'
      })
      return
    }

    this.navigateToResourceDetail({ id: resourceId, ...resource })
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
    const { messageCounter, messages, chatHistory } = this.data
    
    // 添加用户消息
    const userMessage = {
      id: messageCounter,
      type: 'user',
      text: text
    }
    
    const newMessages = [...messages, userMessage]
    
    this.setData({
      messages: newMessages,
      messageCounter: messageCounter + 1,
      scrollToMessage: `msg-${messageCounter}`
    })
    
    // 显示正在输入
    setTimeout(() => {
      this.setData({ isTyping: true })
      this.scrollToBottom()
    }, 300)
    
    // 调用云函数
    this.callAIService(text)
  },

  // 调用 AI 服务
  async callAIService(userText) {
    try {
      console.log('[AI Advisor] 调用云函数 askAI')
      
      const res = await wx.cloud.callFunction({
        name: 'askAI',
        data: {
          query: userText,
          mode: 'resource_advisor',
          chatHistory: this.data.chatHistory.slice(-6)
        },
        timeout: 15000
      })
      
      console.log('[AI Advisor] 云函数响应:', res)
      
      if (res.result && res.result.success) {
        this.addBotMessage(res.result.reply)
      } else {
        // 使用样例回答
        this.useSampleResponse(userText)
      }
      
    } catch (err) {
      console.error('[AI Advisor] 调用失败:', err)
      // 使用样例回答
      this.useSampleResponse(userText)
    }
  },

  // 使用样例回答（当服务器不可用时）
  useSampleResponse(userText) {
    this.addBotMessage(pickSampleReply(userText))
  },

  // 添加机器人消息
  addBotMessage(replyPayload) {
    const { messageCounter, messages, chatHistory } = this.data
    const replyText = typeof replyPayload === 'string' ? replyPayload : replyPayload.text
    const recommendationIds = typeof replyPayload === 'string'
      ? []
      : (replyPayload.recommendationIds || [])
    
    // 解析 Markdown
    const richText = this.parseMarkdown(replyText)
    
    const botMessage = {
      id: messageCounter,
      type: 'bot',
      text: replyText,
      richText: richText,
      recommendations: this.getRecommendationCards(recommendationIds)
    }
    
    const newMessages = [...messages, botMessage]
    
    // 更新对话历史
    const newHistory = [
      ...chatHistory,
      { role: 'user', content: messages[messages.length - 1].text },
      { role: 'assistant', content: replyText }
    ]
    
    this.setData({
      messages: newMessages,
      messageCounter: messageCounter + 1,
      isTyping: false,
      chatHistory: newHistory.slice(-12), // 保留最近12条
      scrollToMessage: `msg-${messageCounter}`
    })
    
    setTimeout(() => {
      this.scrollToBottom()
    }, 100)
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({
      scrollToMessage: 'scroll-bottom'
    })
  },

  // 保存对话
  saveConversation() {
    try {
      wx.setStorageSync('ai_advisor_messages', this.data.messages)
      wx.setStorageSync('ai_advisor_history', this.data.chatHistory)
      wx.setStorageSync('ai_advisor_counter', this.data.messageCounter)
    } catch (e) {
      console.log('保存对话失败:', e)
    }
  },

  // 恢复对话
  restoreConversation() {
    try {
      const messages = wx.getStorageSync('ai_advisor_messages')
      const chatHistory = wx.getStorageSync('ai_advisor_history')
      const messageCounter = wx.getStorageSync('ai_advisor_counter')
      
      if (messages && messages.length > 0) {
        const normalizedMessages = messages.map((message) => this.normalizeBotMessage(message))
        this.setData({
          messages: normalizedMessages,
          chatHistory: chatHistory || [],
          messageCounter: messageCounter || normalizedMessages.length + 1
        })
      }
    } catch (e) {
      console.log('恢复对话失败:', e)
    }
  },

  // 清空对话
  onClearConversation() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [
              {
                id: 1,
                type: 'bot',
                text: WELCOME_MESSAGE,
                richText: this.parseMarkdown(WELCOME_MESSAGE),
                recommendations: []
              }
            ],
            messageCounter: 2,
            chatHistory: []
          })
          
          // 清除存储
          wx.removeStorageSync('ai_advisor_messages')
          wx.removeStorageSync('ai_advisor_history')
          wx.removeStorageSync('ai_advisor_counter')
          
          wx.showToast({
            title: '对话已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 复制文本
  onCopyText(e) {
    const text = e.currentTarget.dataset.text
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 拨打电话
  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        })
      }
    })
  }
})
