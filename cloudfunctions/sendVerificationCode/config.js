// 邮件服务配置
// 注意：生产环境应该使用云开发的环境变量存储敏感信息

module.exports = {
  // 邮件服务配置
  email: {
    // SMTP服务器配置
    smtp: {
      host: 'smtp.qq.com',
      port: 465,
      secure: true, // 使用SSL
      auth: {
        user: '1258196984@qq.com', // 发件人邮箱
        pass: 'qdcijrtfekyvigfb' // 邮箱授权码（不是邮箱密码）
      }
    },
    // 发件人信息
    from: {
      name: '疗愈小程序',
      address: '1258196984@qq.com'
    }
  },

  // 验证码配置
  verification: {
    codeLength: 6, // 验证码长度
    expiresIn: 5 * 60 * 1000, // 过期时间（5分钟）
    
    // 发送频率限制
    rateLimit: {
      perMinute: 1, // 每分钟最多发送次数
      perHour: 3, // 每小时最多发送次数
      perDay: 10 // 每天最多发送次数
    }
  }
}
