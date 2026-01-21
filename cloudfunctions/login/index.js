// 登录云函数代码示例
// 文件路径: cloudfunctions/login/index.js
// 需要先安装依赖: npm install bcryptjs jsonwebtoken

const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// JWT密钥（生产环境应该使用环境变量）
const JWT_SECRET = 'your-secret-key-change-in-production'

exports.main = async (event, context) => {
  const { account, password } = event
  
  try {
    // 1. 识别账号类型
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)
    const isPhone = /^1[3-9]\d{9}$/.test(account)
    
    if (!isEmail && !isPhone) {
      return {
        code: 2001,
        message: '账号格式不正确'
      }
    }
    
    // 2. 查询用户
    const query = isEmail ? { email: account } : { phone: account }
    const userRes = await db.collection('users').where(query).get()
    
    if (userRes.data.length === 0) {
      return {
        code: 2002,
        message: '账号不存在'
      }
    }
    
    const user = userRes.data[0]
    
    // 3. 检查账号状态
    if (user.status === 'locked') {
      return {
        code: 2004,
        message: '账号已被锁定'
      }
    }
    
    // 4. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return {
        code: 3003,
        message: '密码错误'
      }
    }
    
    // 5. 生成token
    const token = jwt.sign(
      { userId: user._id, openid: user._openid },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    // 6. 更新最后登录时间
    await db.collection('users').doc(user._id).update({
      data: {
        lastLoginAt: new Date()
      }
    })
    
    // 7. 返回用户信息和token
    return {
      code: 0,
      message: '登录成功',
      data: {
        token,
        userInfo: {
          _id: user._id,
          email: user.email,
          phone: user.phone,
          nickname: user.nickname,
          avatar: user.avatar,
          coins: user.coins
        }
      }
    }
    
  } catch (error) {
    console.error('登录失败:', error)
    return {
      code: 1000,
      message: '登录失败，请稍后重试'
    }
  }
}
