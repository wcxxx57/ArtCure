// 修改密码云函数
const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { oldPassword, newPassword } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 1. 查询用户信息
    const userRes = await db.collection('users')
      .where({
        _openid: wxContext.OPENID
      })
      .get()
    
    if (userRes.data.length === 0) {
      return {
        code: 1001,
        message: '用户不存在'
      }
    }
    
    const user = userRes.data[0]
    
    // 2. 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    
    if (!isPasswordValid) {
      return {
        code: 4001,
        message: '旧密码错误'
      }
    }
    
    // 3. 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // 4. 更新密码
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      })
    
    return {
      code: 0,
      message: '密码修改成功'
    }
    
  } catch (error) {
    console.error('修改密码失败:', error)
    return {
      code: 1000,
      message: '修改失败，请稍后重试'
    }
  }
}
