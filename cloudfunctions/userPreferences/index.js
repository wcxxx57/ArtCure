// cloudfunctions/userPreferences/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'savePreferences':
        return await savePreferences(event)
      case 'getPreferences':
        return await getPreferences(event)
      case 'updatePreferences':
        return await updatePreferences(event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('用户偏好错误:', error)
    return { success: false, message: error.message }
  }
}

// 保存用户偏好
async function savePreferences(event) {
  const { userId, preferences } = event

  if (!userId || !preferences) {
    return { success: false, message: '参数不完整' }
  }

  try {
    console.log('保存用户偏好，用户ID:', userId, '偏好:', preferences)

    // 检查是否已存在
    const existing = await db.collection('user_preferences')
      .where({ userId: userId })
      .get()

    const now = new Date()
    const preferenceData = {
      userId: userId,
      artForms: preferences.artForms || [],
      helpNeeds: preferences.helpNeeds || [],
      activityFormats: preferences.activityFormats || [],
      isCompleted: true,
      completedAt: now,
      updatedAt: now,
      version: 1
    }

    let result
    if (existing.data.length > 0) {
      // 更新现有记录
      result = await db.collection('user_preferences')
        .doc(existing.data[0]._id)
        .update({
          data: preferenceData
        })
      console.log('更新用户偏好成功')
    } else {
      // 创建新记录
      result = await db.collection('user_preferences')
        .add({
          data: preferenceData
        })
      console.log('创建用户偏好成功，记录ID:', result._id)
    }

    // 更新用户表的标记
    await db.collection('users')
      .where({ _id: userId })
      .update({
        data: {
          hasCompletedSurvey: true,
          surveyCompletedAt: now
        }
      })

    return {
      success: true,
      message: '偏好保存成功',
      data: preferenceData
    }

  } catch (error) {
    console.error('保存用户偏好失败:', error)
    return {
      success: false,
      message: '保存失败: ' + error.message
    }
  }
}

// 获取用户偏好
async function getPreferences(event) {
  const { userId } = event

  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  try {
    const result = await db.collection('user_preferences')
      .where({ userId: userId })
      .get()

    if (result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      }
    } else {
      return {
        success: false,
        message: '未找到用户偏好'
      }
    }

  } catch (error) {
    console.error('获取用户偏好失败:', error)
    return {
      success: false,
      message: '获取失败: ' + error.message
    }
  }
}

// 更新用户偏好
async function updatePreferences(event) {
  const { userId, preferences } = event

  if (!userId || !preferences) {
    return { success: false, message: '参数不完整' }
  }

  try {
    const existing = await db.collection('user_preferences')
      .where({ userId: userId })
      .get()

    if (existing.data.length === 0) {
      return { success: false, message: '用户偏好不存在' }
    }

    const updateData = {
      ...preferences,
      updatedAt: new Date()
    }

    await db.collection('user_preferences')
      .doc(existing.data[0]._id)
      .update({
        data: updateData
      })

    return {
      success: true,
      message: '偏好更新成功'
    }

  } catch (error) {
    console.error('更新用户偏好失败:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message
    }
  }
}
