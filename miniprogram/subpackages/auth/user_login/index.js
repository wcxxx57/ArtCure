// user_login/index.js
const ValidationService = require('../../../utils/validation.js')
const AuthService = require('../../../utils/auth.js')
const { ErrorCodes } = require('../../../utils/errorCodes.js')

Page({
  data: {
    account: '',
    password: '',
    accountType: '',
    accountTypeText: '',
    showPassword: false,
    isLoading: false
  },

  onLoad(options) {
    // 检查是否已登录
    if (AuthService.isLoggedIn()) {
      wx.switchTab({
        url: '/pages/profile/index'
      })
    }
  },

  // 账号输入处理
  onAccountInput(e) {
    const account = e.detail.value
    this.setData({ account })
    
    // 识别账号类型
    const accountType = ValidationService.detectAccountType(account)
    let accountTypeText = ''
    
    if (accountType === 'email') {
      accountTypeText = '✓ 邮箱格式'
    } else if (accountType === 'phone') {
      accountTypeText = '✓ 手机号格式'
    }
    
    this.setData({
      accountType,
      accountTypeText
    })
  },

  // 密码输入处理
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 切换密码显示/隐藏
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  // 验证账号
  validateAccount() {
    const { account } = this.data
    
    if (!account) {
      wx.showToast({
        title: ErrorCodes.ACCOUNT_REQUIRED.message,
        icon: 'none'
      })
      return false
    }
    
    const accountType = ValidationService.detectAccountType(account)
    if (!accountType) {
      wx.showToast({
        title: ErrorCodes.INVALID_ACCOUNT.message,
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 处理登录
  handleLogin() {
    const { account, password } = this.data
    
    // 验证账号
    if (!this.validateAccount()) {
      return
    }
    
    // 验证密码
    if (!password) {
      wx.showToast({
        title: ErrorCodes.PASSWORD_REQUIRED.message,
        icon: 'none'
      })
      return
    }
    
    if (!ValidationService.isValidPassword(password)) {
      wx.showToast({
        title: ErrorCodes.INVALID_PASSWORD.message,
        icon: 'none'
      })
      return
    }
    
    // 开始登录
    this.setData({ isLoading: true })
    
    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'login',
      data: {
        account,
        password
      }
    }).then(res => {
      console.log('登录成功:', res)
      
      if (res.result.code === 0) {
        // 保存登录状态
        AuthService.saveLoginState(res.result.data.userInfo, res.result.data.token)
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 跳转到个人信息页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/profile/index'
          })
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '登录失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('登录失败:', err)
      wx.showToast({
        title: '登录失败，请稍后重试',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ isLoading: false })
    })
  },

  // 跳转到注册页面
  navigateToRegister() {
    wx.navigateTo({
      url: '/subpackages/auth/user_register/index'
    })
  }
})
