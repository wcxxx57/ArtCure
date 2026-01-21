// auth.js - 认证服务模块

const AuthService = {
  // 存储键名
  STORAGE_KEYS: {
    TOKEN: 'userToken',
    USER_INFO: 'userInfo',
    LOGIN_TIME: 'loginTime'
  },

  /**
   * 保存登录状态
   * @param {object} userInfo - 用户信息
   * @param {string} token - 用户token
   */
  saveLoginState(userInfo, token) {
    try {
      wx.setStorageSync(this.STORAGE_KEYS.TOKEN, token)
      wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, userInfo)
      wx.setStorageSync(this.STORAGE_KEYS.LOGIN_TIME, Date.now())
      console.log('登录状态已保存')
    } catch (error) {
      console.error('保存登录状态失败:', error)
    }
  },

  /**
   * 获取登录状态
   * @returns {object|null} 登录信息
   */
  getLoginState() {
    try {
      const token = wx.getStorageSync(this.STORAGE_KEYS.TOKEN)
      const userInfo = wx.getStorageSync(this.STORAGE_KEYS.USER_INFO)
      const loginTime = wx.getStorageSync(this.STORAGE_KEYS.LOGIN_TIME)

      if (!token || !userInfo) {
        return null
      }

      // 检查token是否过期（7天）
      const now = Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (now - loginTime > sevenDays) {
        this.clearLoginState()
        return null
      }

      return {
        token,
        userInfo,
        loginTime
      }
    } catch (error) {
      console.error('获取登录状态失败:', error)
      return null
    }
  },

  /**
   * 清除登录状态
   */
  clearLoginState() {
    try {
      wx.removeStorageSync(this.STORAGE_KEYS.TOKEN)
      wx.removeStorageSync(this.STORAGE_KEYS.USER_INFO)
      wx.removeStorageSync(this.STORAGE_KEYS.LOGIN_TIME)
      console.log('登录状态已清除')
    } catch (error) {
      console.error('清除登录状态失败:', error)
    }
  },

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    const loginState = this.getLoginState()
    return loginState !== null
  },

  /**
   * 获取用户信息
   * @returns {object|null} 用户信息
   */
  getUserInfo() {
    const loginState = this.getLoginState()
    return loginState ? loginState.userInfo : null
  },

  /**
   * 获取用户Token
   * @returns {string|null} Token
   */
  getToken() {
    const loginState = this.getLoginState()
    return loginState ? loginState.token : null
  },

  /**
   * 更新用户信息
   * @param {object} userInfo - 新的用户信息
   */
  updateUserInfo(userInfo) {
    try {
      const token = this.getToken()
      if (token) {
        wx.setStorageSync(this.STORAGE_KEYS.USER_INFO, userInfo)
        console.log('用户信息已更新')
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
    }
  }
}

module.exports = AuthService
