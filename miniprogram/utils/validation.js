// utils/validation.js
const ValidationService = {
  // 邮箱验证
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // 手机号验证（中国大陆）
  isValidPhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  // 密码验证（6-20位）
  isValidPassword(password) {
    if (!password || password.length < 6 || password.length > 20) {
      return false
    }
    return true
  },

  // 检测账号类型
  detectAccountType(account) {
    if (this.isValidEmail(account)) {
      return 'email'
    } else if (this.isValidPhone(account)) {
      return 'phone'
    }
    return null
  },

  // 检查密码强度
  checkPasswordStrength(password) {
    if (!password) return 0
    
    let strength = 0
    
    // 长度
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    
    // 包含小写字母
    if (/[a-z]/.test(password)) strength++
    
    // 包含大写字母
    if (/[A-Z]/.test(password)) strength++
    
    // 包含数字
    if (/\d/.test(password)) strength++
    
    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
    
    // 返回强度等级 0-3
    if (strength <= 2) return 1  // 弱
    if (strength <= 4) return 2  // 中
    return 3  // 强
  },

  // 获取密码强度文本
  getPasswordStrengthText(strength) {
    const texts = ['弱', '弱', '中', '强']
    return texts[strength] || '弱'
  }
}

module.exports = ValidationService
