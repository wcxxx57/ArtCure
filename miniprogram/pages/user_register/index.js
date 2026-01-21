// user_register/index.js
const ValidationService = require('../../utils/validation.js')
const { ErrorCodes } = require('../../utils/errorCodes.js')

Page({
  data: {
    registrationType: 'email',
    account: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
    passwordStrength: 0,
    passwordStrengthText: '弱',
    showPassword: false,
    countdown: 0,
    isLoading: false
  },

  // 切换注册方式
  switchRegistrationType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      registrationType: type,
      account: '',
      verificationCode: ''
    })
  },

  // 账号输入处理
  onAccountInput(e) {
    this.setData({
      account: e.detail.value
    })
  },

  // 验证码输入处理
  onCodeInput(e) {
    this.setData({
      verificationCode: e.detail.value
    })
  },

  // 密码输入处理
  onPasswordInput(e) {
    const password = e.detail.value
    const strength = ValidationService.checkPasswordStrength(password)
    const strengthText = ValidationService.getPasswordStrengthText(strength)
    
    this.setData({
      password,
      passwordStrength: strength,
      passwordStrengthText: strengthText
    })
  },

  // 确认密码输入处理
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
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
    const { account, registrationType } = this.data
    
    if (!account) {
      wx.showToast({
        title: ErrorCodes.ACCOUNT_REQUIRED.message,
        icon: 'none'
      })
      return false
    }
    
    if (registrationType === 'email' && !ValidationService.isValidEmail(account)) {
      wx.showToast({
        title: '请输入正确的邮箱格式',
        icon: 'none'
      })
      return false
    }
    
    if (registrationType === 'phone' && !ValidationService.isValidPhone(account)) {
      wx.showToast({
        title: '请输入正确的手机号格式',
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 发送验证码
  sendVerificationCode() {
    // 验证账号
    if (!this.validateAccount()) {
      return
    }
    
    const { account, registrationType } = this.data
    
    // 调用云函数发送验证码
    wx.cloud.callFunction({
      name: 'sendVerificationCode',
      data: {
        account,
        type: registrationType
      }
    }).then(res => {
      console.log('发送验证码成功:', res)
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success'
        })
        
        // 开始倒计时
        this.startCountdown()
      } else {
        wx.showToast({
          title: res.result.message || '发送失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('发送验证码失败:', err)
      wx.showToast({
        title: '发送失败，请稍后重试',
        icon: 'none'
      })
    })
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ countdown: 60 })
    
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1
      
      if (countdown <= 0) {
        clearInterval(timer)
        this.setData({ countdown: 0 })
      } else {
        this.setData({ countdown })
      }
    }, 1000)
  },

  // 检查密码匹配
  checkPasswordMatch() {
    const { password, confirmPassword } = this.data
    
    if (password !== confirmPassword) {
      wx.showToast({
        title: ErrorCodes.PASSWORD_MISMATCH.message,
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 处理注册
  handleRegister() {
    const { account, verificationCode, password, confirmPassword, registrationType } = this.data
    
    // 验证账号
    if (!this.validateAccount()) {
      return
    }
    
    // 验证验证码
    if (!verificationCode) {
      wx.showToast({
        title: ErrorCodes.CODE_REQUIRED.message,
        icon: 'none'
      })
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
    
    // 验证确认密码
    if (!confirmPassword) {
      wx.showToast({
        title: '请输入确认密码',
        icon: 'none'
      })
      return
    }
    
    if (!this.checkPasswordMatch()) {
      return
    }
    
    // 开始注册
    this.setData({ isLoading: true })
    
    // 调用云函数注册
    wx.cloud.callFunction({
      name: 'register',
      data: {
        account,
        password,
        verificationCode,
        type: registrationType
      }
    }).then(res => {
      console.log('注册成功:', res)
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })
        
        // 跳转到登录页面
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '注册失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('注册失败:', err)
      wx.showToast({
        title: '注册失败，请稍后重试',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ isLoading: false })
    })
  },

  // 跳转到登录页面
  navigateToLogin() {
    wx.navigateBack()
  }
})
