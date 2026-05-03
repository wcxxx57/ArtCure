// activity-detail/index.js
const { sampleActivities } = require('../../utils/sampleActivities.js')

Page({
  data: {
    activity: {}
  },

  onLoad(options) {
    this.loadActivity(options.id)
  },

  loadActivity(id) {
    const activity = sampleActivities.find(a => a._id === id)
    if (activity) {
      activity.timeText = this.formatTime(activity.startTime)
      this.setData({ activity })
    }
  },

  onConsult() {
    const { resourceId, therapistName } = this.data.activity
    if (resourceId) {
      wx.navigateTo({
        url: `/pages/therapist-chat/index?resourceId=${resourceId}&resourceName=${encodeURIComponent(therapistName || '疗愈师')}`
      })
    }
  },

  onBook() {
    const activity = this.data.activity
    wx.navigateTo({
      url: `/pages/activity-booking/index?activityId=${activity._id}`
    })
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  onBack() {
    wx.navigateBack()
  }
})
