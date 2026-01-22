// 更新用户信息云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { avatar, nickname } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 构建更新数据
    const updateData = {
      updatedAt: new Date()
    }
    
    if (avatar) {
      updateData.avatar = avatar
    }
    
    if (nickname) {
      updateData.nickname = nickname
    }
    
    // 更新用户信息
    const result = await db.collection('users')
      .where({
        _openid: wxContext.OPENID
      })
      .update({
        data: updateData
      })
    
    if (result.stats.updated > 0) {
      return {
        code: 0,
        message: '更新成功'
      }
    } else {
      return {
        code: 1001,
        message: '未找到用户信息'
      }
    }
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      code: 1000,
      message: '更新失败，请稍后重试'
    }
  }
}
