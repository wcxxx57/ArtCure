// healing-activities/index.js
Page({
  data: {
    activeTab: 'all',
    activities: []
  },

  onLoad() {
    this.loadActivities()
  },

  async loadActivities() {
    const res = await wx.cloud.callFunction({
      name: 'healingActivities',
      data: { action: 'getActivities', category: this.data.activeTab }
    })

    if (res.result.success) {
      const activities = res.result.activities.map(a => ({
        ...a,
        timeText: this.formatTime(a.startTime)
      }))
      this.setData({ activities })
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.loadActivities()
  },

  onActivityTap(e) {
    wx.navigateTo({ url: `/pages/activity-detail/index?id=${e.currentTarget.dataset.id}` })
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  onBack() {
    wx.navigateBack()
  }
})
