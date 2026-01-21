// profile/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    // 登录状态
    isLogin: false,
    
    // 用户信息
    userInfo: {
      avatar: '',
      nickname: '',
      desc: ''
    },
    
    // 统计数据
    stats: {
      days: 0,
      sessions: 0,
      points: 0
    }
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
    }
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = AuthService.getUserInfo()
    
    if (userInfo) {
      this.setData({
        userInfo: {
          avatar: userInfo.avatar || '/miniprogram/images/avatar.png',
          nickname: userInfo.nickname || '疗愈用户',
          desc: '坚持疗愈，遇见更好的自己'
        },
        stats: {
          days: userInfo.days || 0,
          sessions: userInfo.sessions || 0,
          points: userInfo.coins || 0
        }
      })
    }
  },

  // 登录按钮点击
  onLoginTap() {
    wx.navigateTo({
      url: '/pages/user_login/index'
    })
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          AuthService.clearLoginState()
          this.checkLoginStatus()
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
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.navigateTo({
      url: page,
      fail: (err) => {
        wx.showToast({
          title: '页面暂未开放',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 判断是否需要登录
  needLogin(page) {
    const loginRequiredPages = [
      '/pages/my-plan/index',
      '/pages/my-records/index',
      '/pages/my-favorites/index'
    ]
    return loginRequiredPages.includes(page)
  }
})
