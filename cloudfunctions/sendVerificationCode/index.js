// 发送验证码云函数代码示例
// 文件路径: cloudfunctions/sendVerificationCode/index.js
// 开发阶段使用固定验证码123456，不实际发送邮件/短信

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 固定验证码（开发阶段）
const FIXED_CODE = '123456'

exports.main = async (event, context) => {
  const { account, type } = event
  
  try {
    // 1. 验证账号格式
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)
    const isPhone = /^1[3-9]\d{9}$/.test(account)
    
    if (type === 'email' && !isEmail) {
      return {
        code: 2001,
        message: '邮箱格式不正确'
      }
    }
    
    if (type === 'phone' && !isPhone) {
      return {
        code: 2001,
        message: '手机号格式不正确'
      }
    }
    
    // 2. 生成验证码（开发阶段使用固定验证码）
    const code = FIXED_CODE
    
    // 3. 设置过期时间（5分钟后）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    
    // 4. 保存到数据库
    await db.collection('verification_codes').add({
      data: {
        account: account,
        code: code,
        type: type,
        purpose: 'register',
        expiresAt: expiresAt,
        createdAt: new Date(),
        used: false
      }
    })
    
    // 5. 返回成功信息（开发阶段不实际发送）
    return {
      code: 0,
      message: '验证码已发送（开发阶段请使用: 123456）',
      data: {
        // 开发阶段可以返回验证码，生产环境应该删除
        code: code
      }
    }
    
  } catch (error) {
    console.error('发送验证码失败:', error)
    return {
      code: 1000,
      message: '发送失败，请稍后重试'
    }
  }
}

// 生产环境实现说明：
// 1. 安装邮件服务依赖: npm install nodemailer
// 2. 或安装短信服务SDK（如阿里云、腾讯云短信服务）
// 3. 生成随机6位验证码: Math.floor(100000 + Math.random() * 900000).toString()
// 4. 实现发送频率限制（每小时3次，每天10次）
// 5. 实际发送邮件或短信
// 6. 不要在返回数据中包含验证码
