// plan-detail/index.js
Page({
  data: {
    planId: '',
    planInfo: {
      name: '',
      emoji: '',
      bgColor: '',
      currentDay: 0,
      totalDays: 0,
      streak: 0,
      todayChecked: false
    },
    todayTask: {
      title: '',
      typeIcon: '',
      typeName: '',
      duration: 0,
      description: '',
      started: false
    },
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    currentMonth: '',
    calendarDays: []
  },

  onLoad(options) {
    if (options.planId) {
      this.setData({ planId: options.planId })
      this.loadPlanDetail()
    }
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  // 加载计划详情
  loadPlanDetail() {
    const userInfo = require('../../utils/auth.js').getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/user_login/index'
        })
      }, 1500)
      return
    }

    wx.showLoading({ title: '加载中...' })

    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'getPlanDetail',
        planId: this.data.planId,
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        const { planInfo, todayTask, checkInRecords } = res.result.data
        
        this.setData({
          planInfo: planInfo,
          todayTask: todayTask
        })
        
        this.generateCalendar(checkInRecords)
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载计划详情失败:', err)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    })
  },

  // 生成日历
  generateCalendar(checkInRecords) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 设置月份标题
    this.setData({
      currentMonth: `${year}年${month + 1}月`
    })

    // 获取本月第一天和最后一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 获取第一天是星期几
    const firstDayWeek = firstDay.getDay()
    
    // 生成日历数组
    const days = []
    
    // 填充空白
    for (let i = 0; i < firstDayWeek; i++) {
      days.push({ day: '', disabled: true })
    }
    
    // 填充日期
    const today = now.getDate()
    const checkInDates = checkInRecords.map(record => {
      const date = new Date(record.checkInDate)
      return date.getDate()
    })
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        day: i,
        isToday: i === today,
        checked: checkInDates.includes(i),
        disabled: false
      })
    }
    
    this.setData({
      calendarDays: days
    })
  },

  // 开始任务
  onStartTask() {
    wx.showModal({
      title: '开始任务',
      content: '确认已完成今日任务？',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'todayTask.started': true
          })
          wx.showToast({
            title: '任务已完成',
            icon: 'success'
          })
        }
      }
    })
  },

  // 打卡
  onCheckIn() {
    if (!this.data.todayTask.started) {
      wx.showToast({
        title: '请先完成任务',
        icon: 'none'
      })
      return
    }

    const userInfo = require('../../utils/auth.js').getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '打卡中...' })

    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'checkIn',
        planId: this.data.planId,
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        // 显示打卡成功动画
        wx.showToast({
          title: '打卡成功！',
          icon: 'success',
          duration: 2000
        })
        
        // 更新页面状态
        this.setData({
          'planInfo.todayChecked': true,
          'planInfo.currentDay': this.data.planInfo.currentDay + 1,
          'planInfo.streak': this.data.planInfo.streak + 1,
          'todayTask.started': false  // 重置任务状态
        })
        
        // 重新加载日历
        setTimeout(() => {
          this.loadPlanDetail()
        }, 500)
      } else {
        wx.showToast({
          title: res.result.message || '打卡失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('打卡失败:', err)
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'none'
      })
    })
  },

  // 调整计划
  onAdjustPlan() {
    wx.navigateTo({
      url: `/pages/plan-edit/index?planId=${this.data.planId}`
    })
  }
})
