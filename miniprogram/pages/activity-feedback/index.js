// activity-feedback/index.js
Page({
  data: {
    bookingId: '',
    rating: 0,
    feedback: ''
  },

  onLoad(options) {
    this.setData({ bookingId: options.bookingId })
  },

  onRatingTap(e) {
    this.setData({ rating: e.currentTarget.dataset.rating })
  },

  onFeedbackInput(e) {
    this.setData({ feedback: e.detail.value })
  },

  async onSubmit() {
    if (this.data.rating === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' })
      return
    }

    const res = await wx.cloud.callFunction({
      name: 'healingActivities',
      data: {
        action: 'submitFeedback',
        bookingId: this.data.bookingId,
        rating: this.data.rating,
        feedback: this.data.feedback
      }
    })

    if (res.result.success) {
      wx.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  onBack() {
    wx.navigateBack()
  }
})
