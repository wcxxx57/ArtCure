// utils/auth.js
const AUTH_KEY = 'user_auth'
const TOKEN_KEY = 'user_token'

const AuthService = {
  // 保存登录状态
  saveLoginState(userInfo, token) {
    try {
      wx.setStorageSync(AUTH_KEY, userInfo)
      wx.setStorageSync(TOKEN_KEY, token)
      return true
    } catch (e) {
      console.error('保存登录状态失败:', e)
      return false
    }
  },

  // 获取用户信息
  getUserInfo() {
    try {
      return wx.getStorageSync(AUTH_KEY)
    } catch (e) {
      console.error('获取用户信息失败:', e)
      return null
    }
  },

  // 获取token
  getToken() {
    try {
      return wx.getStorageSync(TOKEN_KEY)
    } catch (e) {
      console.error('获取token失败:', e)
      return null
    }
  },

  // 检查是否已登录
  isLoggedIn() {
    const userInfo = this.getUserInfo()
    const token = this.getToken()
    return !!(userInfo && token)
  },

  // 更新用户信息
  updateUserInfo(userInfo) {
    try {
      wx.setStorageSync(AUTH_KEY, userInfo)
      return true
    } catch (e) {
      console.error('更新用户信息失败:', e)
      return false
    }
  },

  // 清除登录状态
  clearLoginState() {
    try {
      wx.removeStorageSync(AUTH_KEY)
      wx.removeStorageSync(TOKEN_KEY)
      return true
    } catch (e) {
      console.error('清除登录状态失败:', e)
      return false
    }
  }
}

module.exports = AuthService
