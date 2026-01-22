// 注册云函数代码示例
// 文件路径: cloudfunctions/register/index.js
// 需要先安装依赖: npm install bcryptjs

const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { account, password, verificationCode, type } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 1. 验证验证码 - 先查询记录（不包含过期条件）
    const codeRes = await db.collection('verification_codes')
      .where({
        account: account,
        code: verificationCode,
        used: false
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
    
    if (codeRes.data.length === 0) {
      return {
        code: 4003,
        message: '验证码错误'
      }
    }
    
    // 手动检查验证码是否过期
    const codeRecord = codeRes.data[0]
    const now = new Date()
    const expiresAt = new Date(codeRecord.expiresAt)
    
    if (now > expiresAt) {
      return {
        code: 4003,
        message: '验证码已过期，请重新获取'
      }
    }
    
    // 2. 检查账号是否已存在
    const query = type === 'email' ? { email: account } : { phone: account }
    const existRes = await db.collection('users').where(query).get()
    
    if (existRes.data.length > 0) {
      return {
        code: 2003,
        message: '该账号已被注册'
      }
    }
    
    // 3. 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 4. 创建用户记录
    const userData = {
      _openid: wxContext.OPENID,
      password: hashedPassword,
      nickname: '疗愈用户',
      avatar: '/miniprogram/images/avatar.png',
      coins: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    }
    
    // 根据注册类型设置email或phone
    if (type === 'email') {
      userData.email = account
    } else {
      userData.phone = account
    }
    
    const addRes = await db.collection('users').add({
      data: userData
    })
    
    // 5. 标记验证码为已使用
    await db.collection('verification_codes')
      .doc(codeRecord._id)
      .update({
        data: {
          used: true,
          usedAt: new Date()
        }
      })
    
    // 6. 返回成功信息
    return {
      code: 0,
      message: '注册成功',
      data: {
        userId: addRes._id
      }
    }
    
  } catch (error) {
    console.error('注册失败:', error)
    return {
      code: 1000,
      message: '注册失败，请稍后重试'
    }
  }
}
