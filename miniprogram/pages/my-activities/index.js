// my-activities/index.js
const { sampleActivities } = require('../../utils/sampleActivities.js')

Page({
  data: {
    activeTab: 'all',
    bookings: []
  },

  onLoad() {
    this.loadBookings()
  },

  onShow() {
    this.loadBookings()
  },

  async loadBookings() {
    const res = await wx.cloud.callFunction({
      name: 'healingActivities',
      data: { action: 'getMyBookings' }
    })

    if (res.result.success) {
      const bookings = res.result.bookings.map(b => {
        const activity = sampleActivities.find(a => a._id === b.activityId)
        return {
          ...b,
          activityTitle: activity ? activity.title : '活动',
          timeText: activity ? this.formatTime(activity.startTime) : '',
          totalPrice: activity ? activity.price * b.participants : 0,
          statusText: this.getStatusText(b.status)
        }
      })
      this.setData({ bookings: this.filterBookings(bookings) })
    }
  },

  filterBookings(bookings) {
    if (this.data.activeTab === 'all') return bookings
    return bookings.filter(b => b.status === this.data.activeTab)
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.loadBookings()
  },

  getStatusText(status) {
    const map = { pending: '待支付', paid: '已支付', completed: '已完成' }
    return map[status] || status
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  onConsult(e) {
    const activityId = e.currentTarget.dataset.id
    const activity = sampleActivities.find(a => a._id === activityId)
    if (activity) {
      wx.navigateTo({
        url: `/pages/therapist-chat/index?resourceId=${activity.resourceId}&resourceName=${encodeURIComponent(activity.therapistName)}`
      })
    }
  },

  onPay(e) {
    wx.showToast({ title: '跳转支付', icon: 'none' })
  },

  onFeedback(e) {
    wx.navigateTo({ url: `/pages/activity-feedback/index?bookingId=${e.currentTarget.dataset.id}` })
  },

  onBack() {
    wx.navigateBack()
  }
})
