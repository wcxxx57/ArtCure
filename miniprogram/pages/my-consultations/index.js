// my-consultations/index.js
Page({
  data: {
    conversations: []
  },

  onLoad() {
    this.loadConversations()
  },

  onShow() {
    this.loadConversations()
  },

  async loadConversations() {
    wx.showLoading({ title: '加载中...' })

    const res = await wx.cloud.callFunction({
      name: 'chatMessage',
      data: { action: 'getUserConversations' }
    })

    wx.hideLoading()

    if (res.result.success) {
      const avatarEmojis = ['🎨', '🎵', '🧘', '💃', '🌿', '🔮', '💬', '✨']
      const conversations = res.result.conversations.map((c, index) => ({
        ...c,
        timeText: this.formatTime(c.lastMessageTime),
        avatarEmoji: avatarEmojis[index % avatarEmojis.length]
      }))
      this.setData({ conversations })
    }
  },

  onConversationTap(e) {
    const conv = e.currentTarget.dataset.conv
    wx.navigateTo({
      url: `/pages/therapist-chat/index?resourceId=${conv.resourceId}&resourceName=${encodeURIComponent(conv.resourceName || '疗愈师')}`
    })
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
    return `${date.getMonth() + 1}-${date.getDate()}`
  },

  onBack() {
    wx.navigateBack()
  }
})
