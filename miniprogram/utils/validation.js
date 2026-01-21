// validation.js - 验证工具模块

const ValidationService = {
  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    if (!email) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * 验证手机号格式（中国大陆）
   * @param {string} phone - 手机号
   * @returns {boolean} 是否有效
   */
  isValidPhone(phone) {
    if (!phone) return false
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {number} 强度等级 0-3
   */
  checkPasswordStrength(password) {
    if (!password) return 0
    
    let strength = 0
    
    // 长度检查
    if (password.length >= 6) strength++
    if (password.length >= 10) strength++
    
    // 包含大小写字母
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    
    // 包含数字
    if (/\d/.test(password)) strength++
    
    // 包含特殊字符
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    
    // 最高3级
    return Math.min(strength, 3)
  },

  /**
   * 验证密码格式
   * @param {string} password - 密码
   * @returns {boolean} 是否有效
   */
  isValidPassword(password) {
    if (!password) return false
    return password.length >= 6 && password.length <= 20
  },

  /**
   * 识别账号类型
   * @param {string} account - 账号
   * @returns {string|null} 'email' | 'phone' | null
   */
  detectAccountType(account) {
    if (!account) return null
    
    if (this.isValidEmail(account)) return 'email'
    if (this.isValidPhone(account)) return 'phone'
    
    return null
  },

  /**
   * 获取密码强度文本
   * @param {number} strength - 强度等级
   * @returns {string} 强度描述
   */
  getPasswordStrengthText(strength) {
    const texts = ['弱', '中', '强', '很强']
    return texts[strength] || '弱'
  },

  /**
   * 获取密码强度颜色
   * @param {number} strength - 强度等级
   * @returns {string} 颜色值
   */
  getPasswordStrengthColor(strength) {
    const colors = ['#FF6B6B', '#FFA500', '#51CF66', '#2ECC71']
    return colors[strength] || '#FF6B6B'
  }
}

module.exports = ValidationService
