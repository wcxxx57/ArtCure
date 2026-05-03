// activity-booking/index.js
const { sampleActivities } = require('../../utils/sampleActivities.js')

Page({
  data: {
    activity: {},
    participants: 1,
    phone: '',
    note: '',
    totalPrice: 0
  },

  onLoad(options) {
    const activity = sampleActivities.find(a => a._id === options.activityId)
    if (activity) {
      this.setData({
        activity,
        totalPrice: activity.price
      })
    }
  },

  onParticipantsChange(e) {
    const participants = parseInt(e.detail.value) || 1
    this.setData({
      participants,
      totalPrice: this.data.activity.price * participants
    })
  },

  onPhoneChange(e) {
    this.setData({ phone: e.detail.value })
  },

  onNoteChange(e) {
    this.setData({ note: e.detail.value })
  },

  async onSubmit() {
    if (!this.data.phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    const res = await wx.cloud.callFunction({
      name: 'healingActivities',
      data: {
        action: 'bookActivity',
        activityId: this.data.activity._id,
        participants: this.data.participants,
        phone: this.data.phone,
        note: this.data.note
      }
    })

    if (res.result.success) {
      this.requestPayment(res.result.bookingId)
    }
  },

  async requestPayment(bookingId) {
    // 调用支付云函数
    const payRes = await wx.cloud.callFunction({
      name: 'wxPay',
      data: {
        orderId: bookingId,
        amount: this.data.totalPrice * 100, // 转为分
        description: this.data.activity.title
      }
    })

    if (payRes.result.payment) {
      wx.requestPayment({
        ...payRes.result.payment,
        success: () => {
          wx.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            wx.navigateTo({ url: '/pages/my-activities/index' })
          }, 1500)
        },
        fail: () => {
          wx.showToast({ title: '支付取消', icon: 'none' })
        }
      })
    }
  },

  onBack() {
    wx.navigateBack()
  }
})
