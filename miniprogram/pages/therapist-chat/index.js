// therapist-chat/index.js
Page({
  data: {
    resourceId: '',
    resourceName: '',
    conversationId: '',
    messages: [],
    inputText: '',
    scrollToView: '',
    pollingTimer: null
  },

  onLoad(options) {
    const { resourceId, resourceName } = options
    this.setData({
      resourceId,
      resourceName: decodeURIComponent(resourceName || '疗愈师')
    })
    this.initConversation()
  },

  onUnload() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer)
    }
  },

  async initConversation() {
    const res = await wx.cloud.callFunction({
      name: 'chatMessage',
      data: { action: 'getConversation', resourceId: this.data.resourceId }
    })

    if (res.result.success && res.result.conversation) {
      this.setData({ conversationId: res.result.conversation._id })
      await this.loadMessages()
    }

    this.startPolling()
  },

  async loadMessages() {
    const res = await wx.cloud.callFunction({
      name: 'chatMessage',
      data: { action: 'getHistory', conversationId: this.data.conversationId, limit: 50 }
    })

    if (res.result.success) {
      const messages = res.result.messages.map(m => ({
        ...m,
        timeText: this.formatTime(m.timestamp)
      }))
      this.setData({ messages })
      this.scrollToBottom()
    }
  },

  startPolling() {
    this.data.pollingTimer = setInterval(() => {
      if (this.data.conversationId) {
        this.loadMessages()
      }
    }, 3000)
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  async onSend() {
    const text = this.data.inputText.trim()
    if (!text) return

    this.setData({ inputText: '' })

    const res = await wx.cloud.callFunction({
      name: 'chatMessage',
      data: {
        action: 'sendMessage',
        conversationId: this.data.conversationId,
        resourceId: this.data.resourceId,
        resourceName: this.data.resourceName,
        message: text,
        messageType: 'text'
      }
    })

    if (res.result.success) {
      if (!this.data.conversationId) {
        this.setData({ conversationId: res.result.conversationId })
      }
      await this.loadMessages()
    }
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      success: async (res) => {
        wx.showLoading({ title: '上传中...' })
        const filePath = res.tempFilePaths[0]
        const cloudPath = `chat-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath })

        const sendRes = await wx.cloud.callFunction({
          name: 'chatMessage',
          data: {
            action: 'sendMessage',
            conversationId: this.data.conversationId,
            resourceId: this.data.resourceId,
            resourceName: this.data.resourceName,
            message: '[图片]',
            messageType: 'image',
            imageUrl: uploadRes.fileID
          }
        })

        wx.hideLoading()

        if (sendRes.result.success) {
          if (!this.data.conversationId) {
            this.setData({ conversationId: sendRes.result.conversationId })
          }
          await this.loadMessages()
        }
      }
    })
  },

  onPreviewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url], current: e.currentTarget.dataset.url })
  },

  scrollToBottom() {
    if (this.data.messages.length > 0) {
      this.setData({ scrollToView: `msg-${this.data.messages.length - 1}` })
    }
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (date.toDateString() === now.toDateString()) {
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  onBack() {
    wx.navigateBack()
  }
})
