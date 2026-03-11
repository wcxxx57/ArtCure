// 心情打卡云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId } = event

  try {
    switch (action) {
      // 保存心情打卡
      case 'saveMood':
        return await saveMood(event)
      
      // 获取今日心情
      case 'getTodayMood':
        return await getTodayMood(userId)
      
      // 获取心情历史（用于曲线图）
      case 'getMoodHistory':
        return await getMoodHistory(event)
      
      // 获取连续打卡天数
      case 'getStreak':
        return await getStreak(userId)
      
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('心情打卡云函数错误:', err)
    return { success: false, message: err.message }
  }
}

// 保存心情打卡
async function saveMood(event) {
  const { userId, moodValue, moodLabel, moodEmoji } = event
  
  if (!userId || !moodValue) {
    return { success: false, message: '参数不完整' }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  try {
    // 检查今天是否已打卡
    const existingRecord = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(today).and(_.lt(todayEnd))
      })
      .get()

    if (existingRecord.data.length > 0) {
      // 更新今天的记录
      await db.collection('mood_records')
        .doc(existingRecord.data[0]._id)
        .update({
          data: {
            moodValue,
            moodLabel,
            moodEmoji,
            updateTime: now
          }
        })
      
      // 异步触发AI推荐生成（不等待结果）
      triggerRecommendationGeneration(userId, { moodValue, moodLabel, moodEmoji })
      
      return { 
        success: true, 
        message: '心情更新成功',
        isUpdate: true
      }
    } else {
      // 创建新记录
      await db.collection('mood_records')
        .add({
          data: {
            userId,
            moodValue,
            moodLabel,
            moodEmoji,
            createTime: now,
            updateTime: now
          }
        })
      
      // 异步触发AI推荐生成（不等待结果）
      triggerRecommendationGeneration(userId, { moodValue, moodLabel, moodEmoji })
      
      return { 
        success: true, 
        message: '心情记录成功',
        isUpdate: false
      }
    }
  } catch (err) {
    console.error('保存心情失败:', err)
    return { success: false, message: '保存失败' }
  }
}

// 获取今日心情
async function getTodayMood(userId) {
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  try {
    const result = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(today).and(_.lt(todayEnd))
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()

    if (result.data.length > 0) {
      return {
        success: true,
        hasMood: true,
        mood: result.data[0]
      }
    } else {
      return {
        success: true,
        hasMood: false
      }
    }
  } catch (err) {
    console.error('获取今日心情失败:', err)
    return { success: false, message: '获取失败' }
  }
}

// 获取心情历史
async function getMoodHistory(event) {
  const { userId, period = 'week' } = event
  
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  const now = new Date()
  let startDate

  // 根据周期计算开始日期
  if (period === 'week') {
    // 本周（从周一开始）
    const dayOfWeek = now.getDay() || 7 // 周日为0，转换为7
    startDate = new Date(now.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
    startDate.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    // 本月
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    // 最近7天
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    startDate.setHours(0, 0, 0, 0)
  }

  try {
    const result = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(startDate)
      })
      .orderBy('createTime', 'asc')
      .get()

    return {
      success: true,
      records: result.data,
      period: period
    }
  } catch (err) {
    console.error('获取心情历史失败:', err)
    return { success: false, message: '获取失败' }
  }
}

// 获取连续打卡天数
async function getStreak(userId) {
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  try {
    // 获取最近30天的记录
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const result = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(thirtyDaysAgo)
      })
      .orderBy('createTime', 'desc')
      .get()

    if (result.data.length === 0) {
      return { success: true, streak: 0 }
    }

    // 计算连续天数
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let checkDate = new Date(today)
    
    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(checkDate)
      const dayEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      
      const hasRecord = result.data.some(record => {
        const recordDate = new Date(record.createTime)
        return recordDate >= dayStart && recordDate < dayEnd
      })
      
      if (hasRecord) {
        streak++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
      } else {
        break
      }
    }

    return { success: true, streak }
  } catch (err) {
    console.error('获取连续打卡天数失败:', err)
    return { success: false, message: '获取失败' }
  }
}

// 异步触发推荐生成（智能触发策略）
async function triggerRecommendationGeneration(userId, moodData) {
  try {
    // 1. 检查是否需要触发AI生成
    const shouldTrigger = await shouldTriggerAIGeneration(userId, moodData)
    
    if (!shouldTrigger.trigger) {
      console.log('跳过AI生成:', shouldTrigger.reason)
      return
    }
    
    // 2. 异步调用推荐生成
    setTimeout(() => {
      cloud.callFunction({
        name: 'moodRecommendation',
        data: {
          action: 'generateAI',
          userId: userId,
          moodData: moodData
        }
      }).then(res => {
        console.log('推荐生成触发成功:', res)
      }).catch(err => {
        console.error('推荐生成触发失败:', err)
      })
    }, 0)
    
  } catch (error) {
    console.error('触发推荐生成检查失败:', error)
  }
}

// 智能判断是否需要触发AI生成
async function shouldTriggerAIGeneration(userId, moodData) {
  try {
    // 1. 检查今日是否已生成过AI推荐
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    
    const todayGenerated = await db.collection('mood_recommendations')
      .where({
        userId: userId,
        generateTime: _.gte(today).and(_.lt(todayEnd)),
        tokenUsed: true // 只检查使用了AI token的记录
      })
      .count()
    
    if (todayGenerated.total >= 1) {
      return {
        trigger: false,
        reason: '今日已生成AI推荐，每日限制1次'
      }
    }
    
    // 2. 检查用户是否有足够的心情记录（至少3天的记录才生成AI推荐）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentMoods = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(sevenDaysAgo)
      })
      .count()
    
    if (recentMoods.total < 3) {
      return {
        trigger: false,
        reason: '心情记录不足，需要至少3天的记录才能生成AI推荐'
      }
    }
    
    // 3. 检查是否有有效的AI推荐缓存
    const now = new Date()
    const validCache = await db.collection('mood_recommendations')
      .where({
        userId: userId,
        status: 'ready',
        expireTime: _.gte(now),
        tokenUsed: true
      })
      .orderBy('generateTime', 'desc')
      .limit(1)
      .get()
    
    if (validCache.data.length > 0) {
      return {
        trigger: false,
        reason: '已有有效的AI推荐缓存'
      }
    }
    
    return {
      trigger: true,
      reason: '满足AI推荐生成条件：今日未生成、有足够心情记录、无有效缓存'
    }
    
  } catch (error) {
    console.error('检查触发条件失败:', error)
    return {
      trigger: false,
      reason: '检查失败，跳过生成'
    }
  }
}
