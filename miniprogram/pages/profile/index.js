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
    
    // 统计数据
    stats: {
      days: 0,
      sessions: 0,
      points: 0,
      totalHours: 0
    },
    
    // 当前选择的时间周期
    currentPeriod: '本周'
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
      this.setData({
        userInfo: {
          avatar: userInfo.avatar || '/images/avatar.png',
          nickname: userInfo.nickname || '疗愈用户'
        },
        stats: {
          days: userInfo.days || 0,
          sessions: userInfo.sessions || 0,
          points: userInfo.coins || 0,
          totalHours: userInfo.totalHours || 12
        }
      })
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
    // TODO: 加载对应周期的心情数据
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

  // 判断是否需要登录
  needLogin(page) {
    const loginRequiredPages = [
      '/pages/my-orders/index',
      '/pages/my-appointments/index',
      '/pages/coin-detail/index',
      '/pages/settings/index'
    ]
    return loginRequiredPages.includes(page)
  }
})
