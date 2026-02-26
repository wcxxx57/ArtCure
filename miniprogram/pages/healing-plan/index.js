// healing-plan/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    isLogin: false,
    // 我的进行中计划（从数据库加载）
    myPlans: [],
    
    // 经典方案
    classicPlans: [
      { id: 1, title: '7天焦虑缓解计划', emoji: '🌊', bgColor: '#E3F2FD', tags: ['绘画', '冥想'] },
      { id: 2, title: '睡前情绪清理', emoji: '🌙', bgColor: '#F3E5F5', tags: ['白噪音', '书写'] },
      { id: 3, title: '14天正念入门', emoji: '🍃', bgColor: '#E8F8F5', tags: ['呼吸', '冥想'] },
      { id: 4, title: '音乐疗愈之旅', emoji: '🎵', bgColor: '#FFF8DC', tags: ['音乐', '放松'] }
    ]
  },

  onLoad(options) {
    this.checkLoginAndLoadPlans()
  },
  
  onShow() {
    this.checkLoginAndLoadPlans()
  },
  
  // 检查登录并加载计划
  checkLoginAndLoadPlans() {
    const isLoggedIn = AuthService.isLoggedIn()
    this.setData({ isLogin: isLoggedIn })
    if (isLoggedIn) {
      this.loadMyPlans()
    } else {
      this.setData({ myPlans: [] })
    }
  },
  
  // 我的计划入口点击
  onMyPlansEntryTap() {
    wx.navigateTo({
      url: '/pages/my-plans/index'
    })
  },
  
  // 加载我的计划
  loadMyPlans() {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo) {
      this.setData({ myPlans: [] })
      return
    }

    wx.cloud.callFunction({
      name: 'planManagement',
      data: { 
        action: 'getUserPlans',
        userId: userInfo._id
      }
    }).then(res => {
      if (res.result.code === 0) {
        const { ongoingPlans } = res.result.data
        
        // 只显示前3个进行中的计划
        const displayPlans = ongoingPlans.slice(0, 3).map(plan => {
          const progress = Math.round((plan.currentDay / plan.totalDays) * 100)
          return {
            ...plan,
            id: plan._id,
            title: plan.name,
            progress: progress,
            displayDay: plan.currentDay  // 已完成的天数
          }
        })
        
        this.setData({
          myPlans: displayPlans
        })
      } else {
        console.error('加载计划失败:', res.result.message)
        this.setData({ myPlans: [] })
      }
    }).catch(err => {
      console.error('加载计划失败:', err)
      this.setData({ myPlans: [] })
    })
  },

  // AI 推荐点击
  onAIRecommendTap() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后开启计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    wx.showToast({
      title: 'AI计划功能开发中',
      icon: 'none'
    })
  },
  
  // 我的计划点击
  onMyPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    wx.navigateTo({
      url: `/pages/plan-detail/index?planId=${plan._id}`
    })
  },
  
  // 经典方案点击
  onClassicPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后加入计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    // 根据计划ID跳转到对应的模板页
    const templateMap = {
      1: 'anxiety-7days',      // 7天焦虑缓解计划
      2: 'sleep-emotion',       // 睡前情绪清理
      3: 'mindfulness-14days',  // 14天正念入门
      4: 'music-healing'        // 音乐疗愈之旅
    }
    
    const templateId = templateMap[plan.id]
    if (templateId) {
      wx.navigateTo({
        url: `/pages/plan-template/index?templateId=${templateId}`
      })
    } else {
      wx.showToast({
        title: '该计划开发中',
        icon: 'none'
      })
    }
  },
  
  // 定制计划点击
  onCustomPlanTap() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后定制计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    wx.showToast({
      title: '定制功能开发中',
      icon: 'none'
    })
    // TODO: 跳转到 AI 定制计划页面
  }
})
