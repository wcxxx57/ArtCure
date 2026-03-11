// profile/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    // 登录状态
    isLogin: false,
    
    // 用户信息
    userInfo: {
      avatar: '',
      nickname: ''
    },
    
    // 问卷完成状态
    hasCompletedSurvey: false,
    
    // 统计数据
    stats: {
      days: 0,
      sessions: 0,
      points: 0,
      totalHours: 0
    },
    
    // 当前选择的时间周期
    currentPeriod: '本周',
    
    // 心情曲线数据
    moodData: [],
    chartPoints: [],
    
    // 心情分析数据
    moodAnalysis: null,
    showMoodAnalysis: false
  },

  onLoad(options) {
    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = AuthService.isLoggedIn()
    
    this.setData({
      isLogin: isLogin
    })

    if (isLogin) {
      // 如果已登录，加载用户数据
      this.loadUserData()
    } else {
      // 未登录时重置数据
      this.resetUserData()
    }
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = AuthService.getUserInfo()
    
    if (userInfo) {
      // 检查问卷完成状态
      const hasCompletedSurvey = userInfo.hasCompletedSurvey || false
      
      this.setData({
        userInfo: {
          avatar: userInfo.avatar || '/images/avatar.png',
          nickname: userInfo.nickname || '疗愈用户'
        },
        hasCompletedSurvey: hasCompletedSurvey,
        stats: {
          days: userInfo.days || 0,
          sessions: userInfo.sessions || 0,
          points: userInfo.coins || 0,
          totalHours: userInfo.totalHours || 12
        }
      })
      
      // 加载心情数据
      this.loadMoodData()
    }
  },

  // 重置用户数据
  resetUserData() {
    this.setData({
      userInfo: {
        avatar: '',
        nickname: ''
      },
      stats: {
        days: 0,
        sessions: 0,
        points: 0,
        totalHours: 0
      }
    })
  },

  // 登录按钮点击
  onLoginTap() {
    wx.navigateTo({
      url: '/pages/user_login/index'
    })
  },

  // 用户头像区域点击（登录后）
  onUserHeaderTap() {
    if (this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/user-info/index'
      })
    }
  },
  
  // 设置按钮点击
  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/settings/index',
      fail: () => {
        wx.showToast({
          title: '设置页面开发中',
          icon: 'none'
        })
      }
    })
  },
  
  // 时间周期切换
  onPeriodChange(e) {
    const periods = ['本周', '本月']
    this.setData({
      currentPeriod: periods[e.detail.value]
    })
    // 重新加载心情数据
    this.loadMoodData()
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          AuthService.clearLoginState()
          this.resetUserData()
          this.setData({ isLogin: false })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 菜单项点击
  onMenuTap(e) {
    const page = e.currentTarget.dataset.page
    
    // 如果未登录，某些功能需要先登录
    if (!this.data.isLogin && this.needLogin(page)) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user_login/index'
            })
          }
        }
      })
      return
    }

    wx.navigateTo({
      url: page,
      fail: (err) => {
        wx.showToast({
          title: '页面开发中',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 问卷入口点击
  onSurveyTap() {
    wx.navigateTo({
      url: '/pages/onboarding-survey/index'
    })
  },

  // 判断是否需要登录
  needLogin(page) {
    const loginRequiredPages = [
      '/pages/my-orders/index',
      '/pages/my-appointments/index',
      '/pages/coin-detail/index',
      '/pages/settings/index'
    ]
    return loginRequiredPages.includes(page)
  },

  // 加载心情数据
  loadMoodData() {
    if (!this.data.isLogin) {
      return
    }

    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo.userId && !userInfo._id)) {
      return
    }

    // 使用 _id 或 userId，优先使用 _id
    const userId = userInfo._id || userInfo.userId
    const period = this.data.currentPeriod === '本周' ? 'week' : 'month'

    wx.cloud.callFunction({
      name: 'moodTracking',
      data: {
        action: 'getMoodHistory',
        userId: userId,
        period: period
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          moodData: res.result.records
        })
        this.generateChartPoints(res.result.records, period)
        this.generateMoodAnalysis(res.result.records)
      }
    }).catch(err => {
      console.error('获取心情数据失败:', err)
    })
  },

  // 生成图表点位
  generateChartPoints(records, period) {
    if (!records || records.length === 0) {
      this.setData({ chartPoints: [] })
      return
    }

    const points = []
    const now = new Date()
    
    if (period === 'week') {
      // 生成本周7天的点位
      for (let i = 0; i < 7; i++) {
        const date = new Date(now)
        const dayOfWeek = now.getDay() || 7
        date.setDate(now.getDate() - (dayOfWeek - 1) + i)
        date.setHours(0, 0, 0, 0)
        
        const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)
        
        // 查找当天的心情记录
        const dayRecord = records.find(record => {
          const recordDate = new Date(record.createTime)
          return recordDate >= date && recordDate < dayEnd
        })
        
        points.push({
          x: (i / 6) * 80 + 10, // 10% 到 90% 的位置
          y: dayRecord ? (dayRecord.moodValue / 5) * 60 + 20 : null, // 20% 到 80% 的位置
          value: dayRecord ? dayRecord.moodValue : null,
          label: dayRecord ? dayRecord.moodLabel : null,
          emoji: dayRecord ? dayRecord.moodEmoji : null,
          date: date.toLocaleDateString()
        })
      }
    } else {
      // 本月数据，取最近30天，每5天一个点
      for (let i = 0; i < 6; i++) {
        const endDate = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000)
        const startDate = new Date(endDate.getTime() - 5 * 24 * 60 * 60 * 1000)
        
        // 查找这5天内的平均心情
        const periodRecords = records.filter(record => {
          const recordDate = new Date(record.createTime)
          return recordDate >= startDate && recordDate <= endDate
        })
        
        let avgMood = null
        if (periodRecords.length > 0) {
          const sum = periodRecords.reduce((acc, record) => acc + record.moodValue, 0)
          avgMood = sum / periodRecords.length
        }
        
        points.unshift({
          x: (i / 5) * 80 + 10,
          y: avgMood ? (avgMood / 5) * 60 + 20 : null,
          value: avgMood ? Math.round(avgMood) : null,
          date: startDate.toLocaleDateString()
        })
      }
    }
    
    this.setData({ chartPoints: points })
  },

  // 生成心情分析
  generateMoodAnalysis(records) {
    if (!records || records.length < 2) {
      this.setData({ 
        moodAnalysis: null,
        showMoodAnalysis: false
      })
      return
    }

    const values = records.map(m => m.moodValue)
    const totalRecords = values.length
    
    // 计算整体平均值
    const avgMood = values.reduce((a, b) => a + b, 0) / values.length
    
    // 计算心情范围
    const minMood = Math.min(...values)
    const maxMood = Math.max(...values)
    
    // 按时间分析趋势（前半段 vs 后半段）
    const midPoint = Math.floor(values.length / 2)
    const earlierPeriod = values.slice(midPoint) // 时间较早的记录
    const recentPeriod = values.slice(0, midPoint) // 时间较近的记录
    
    const earlierAvg = earlierPeriod.length > 0 
      ? earlierPeriod.reduce((a, b) => a + b, 0) / earlierPeriod.length 
      : avgMood
    const recentAvg = recentPeriod.length > 0 
      ? recentPeriod.reduce((a, b) => a + b, 0) / recentPeriod.length 
      : avgMood
    
    const trendDiff = recentAvg - earlierAvg
    
    // 分析心情稳定性
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avgMood, 2), 0) / values.length
    const stability = variance < 0.5 ? 'stable' : variance < 1.5 ? 'moderate' : 'volatile'
    
    // 确定趋势
    let trend, description, trendIcon, trendColor
    if (Math.abs(trendDiff) < 0.3) {
      trend = 'stable'
      description = `心情较为稳定`
      trendIcon = '📊'
      trendColor = '#4CAF50'
    } else if (trendDiff > 0.5) {
      trend = 'improving'
      description = `心情逐渐好转`
      trendIcon = '📈'
      trendColor = '#2196F3'
    } else if (trendDiff < -0.5) {
      trend = 'declining'
      description = `心情有所波动`
      trendIcon = '📉'
      trendColor = '#FF9800'
    } else {
      trend = 'fluctuating'
      description = `心情轻微变化`
      trendIcon = '〰️'
      trendColor = '#9C27B0'
    }

    // 生成心情分布
    const moodDistribution = {
      1: values.filter(v => v === 1).length,
      2: values.filter(v => v === 2).length,
      3: values.filter(v => v === 3).length,
      4: values.filter(v => v === 4).length,
      5: values.filter(v => v === 5).length
    }

    const analysis = {
      totalRecords,
      avgMood: parseFloat(avgMood.toFixed(1)),
      moodRange: [minMood, maxMood],
      trend,
      description,
      trendIcon,
      trendColor,
      stability,
      stabilityText: stability === 'stable' ? '稳定' : stability === 'moderate' ? '中等波动' : '波动较大',
      trendDiff: parseFloat(trendDiff.toFixed(1)),
      earlierAvg: parseFloat(earlierAvg.toFixed(1)),
      recentAvg: parseFloat(recentAvg.toFixed(1)),
      moodDistribution
    }

    this.setData({
      moodAnalysis: analysis,
      showMoodAnalysis: true
    })
  },

  // 切换分析显示
  onToggleAnalysis() {
    this.setData({
      showMoodAnalysis: !this.data.showMoodAnalysis
    })
  }
})
