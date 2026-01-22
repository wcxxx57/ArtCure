// 发送验证码云函数
// 支持邮件和短信发送

const cloud = require('wx-server-sdk')
const nodemailer = require('nodemailer')
const config = require('./config')
const { getVerificationEmailHtml, getVerificationEmailText } = require('./emailTemplate')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 生成随机6位验证码
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 检查发送频率限制
 */
async function checkRateLimit(account) {
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 查询最近的发送记录
  const recentCodes = await db.collection('verification_codes')
    .where({
      account: account,
      createdAt: _.gte(oneDayAgo)
    })
    .orderBy('createdAt', 'desc')
    .get()

  const records = recentCodes.data

  // 检查每分钟限制
  const lastMinuteCount = records.filter(r => new Date(r.createdAt) >= oneMinuteAgo).length
  if (lastMinuteCount >= config.verification.rateLimit.perMinute) {
    return {
      allowed: false,
      message: '发送过于频繁，请1分钟后再试'
    }
  }

  // 检查每小时限制
  const lastHourCount = records.filter(r => new Date(r.createdAt) >= oneHourAgo).length
  if (lastHourCount >= config.verification.rateLimit.perHour) {
    return {
      allowed: false,
      message: '发送次数过多，请1小时后再试'
    }
  }

  // 检查每天限制
  if (records.length >= config.verification.rateLimit.perDay) {
    return {
      allowed: false,
      message: '今日发送次数已达上限，请明天再试'
    }
  }

  return { allowed: true }
}

/**
 * 发送邮件验证码
 */
async function sendEmailCode(email, code) {
  try {
    // 创建邮件传输器
    const transporter = nodemailer.createTransport(config.email.smtp)

    // 邮件选项
    const mailOptions = {
      from: `"${config.email.from.name}" <${config.email.from.address}>`,
      to: email,
      subject: '【疗愈小程序】验证码',
      text: getVerificationEmailText(code, 5),
      html: getVerificationEmailHtml(code, 5)
    }

    // 发送邮件
    const info = await transporter.sendMail(mailOptions)
    console.log('邮件发送成功:', info.messageId)
    
    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error) {
    console.error('邮件发送失败:', error)
    throw error
  }
}

/**
 * 发送短信验证码（待实现）
 */
async function sendSmsCode(phone, code) {
  // TODO: 实现短信发送逻辑
  console.log('短信发送功能待实现:', phone, code)
  throw new Error('短信发送功能暂未开通')
}

/**
 * 主函数
 */
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
    
    // 2. 检查发送频率限制
    const rateLimitCheck = await checkRateLimit(account)
    if (!rateLimitCheck.allowed) {
      return {
        code: 4001,
        message: rateLimitCheck.message
      }
    }
    
    // 3. 生成验证码
    const code = generateCode()
    
    // 4. 发送验证码
    let sendResult
    if (type === 'email') {
      sendResult = await sendEmailCode(account, code)
    } else if (type === 'phone') {
      sendResult = await sendSmsCode(account, code)
    }
    
    // 5. 设置过期时间
    const expiresAt = new Date(Date.now() + config.verification.expiresIn)
    
    // 6. 保存到数据库
    await db.collection('verification_codes').add({
      data: {
        account: account,
        code: code,
        type: type,
        purpose: 'register',
        expiresAt: expiresAt,
        createdAt: new Date(),
        used: false,
        messageId: sendResult.messageId || null
      }
    })
    
    // 7. 返回成功信息
    return {
      code: 0,
      message: type === 'email' ? '验证码已发送到您的邮箱' : '验证码已发送到您的手机'
    }
    
  } catch (error) {
    console.error('发送验证码失败:', error)
    return {
      code: 1000,
      message: '发送失败，请稍后重试',
      error: error.message
    }
  }
}
