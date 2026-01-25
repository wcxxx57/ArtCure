// healing-plan/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    // 我的进行中计划
    myPlans: [
      { 
        id: 1, 
        title: '七天绘画疗愈', 
        emoji: '🎨', 
        bgColor: '#FEE5E6',
        progress: 71,
        currentDay: 5,
        totalDays: 7
      },
      { 
        id: 2, 
        title: '30天正念冥想', 
        emoji: '🧘', 
        bgColor: '#E3F2FD',
        progress: 10,
        currentDay: 3,
        totalDays: 30
      }
    ],
    
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
    if (isLoggedIn) {
      this.loadMyPlans()
    } else {
      this.setData({ myPlans: [] })
    }
  },
  
  // 加载我的计划
  loadMyPlans() {
    // TODO: 从云数据库加载用户计划
    // wx.cloud.callFunction({
    //   name: 'plan',
    //   data: { action: 'getUserPlans' }
    // })
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
    wx.showToast({
      title: `继续「${plan.title}」`,
      icon: 'none'
    })
    // TODO: 跳转到计划详情/今日任务页
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
    
    wx.showModal({
      title: plan.title,
      content: '是否加入该疗愈计划？',
      confirmText: '加入',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已加入计划',
            icon: 'success'
          })
          // TODO: 调用云函数加入计划
        }
      }
    })
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
