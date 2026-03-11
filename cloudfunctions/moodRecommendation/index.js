// cloudfunctions/moodRecommendation/index.js
// 基于心情的AI推荐云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// AI服务配置
const AI_CONFIG = {
  url: 'http://agent_learning.zzz4ai.com/v1/workflows/run',
  apiKey: 'app-qWoGWrs93RdsLCirf5N4VtsS'
}

// 缓存有效期（2天）
const CACHE_EXPIRE_DAYS = 2

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'getRecommendation':
        return await getRecommendation(event)
      case 'generateAI':
        return await generateAIRecommendation(event)
      case 'refreshCache':
        return await refreshUserCache(event)
      case 'batchGenerate':
        return await batchGenerateRecommendations(event)
      case 'testDB':
        return await testDatabaseConnection(event)
      case 'forceGenerateAI':
        return await forceGenerateAI(event)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('心情推荐错误:', error)
    return { success: false, message: error.message }
  }
}

// 强制生成AI推荐（测试用）
async function forceGenerateAI(event) {
  const { userId } = event
  
  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }
  
  try {
    console.log('强制生成AI推荐，用户ID:', userId)
    
    // 构造测试心情数据
    const testMoodData = {
      moodValue: 3,
      moodLabel: '一般',
      moodEmoji: '😐'
    }
    
    // 直接调用生成函数，跳过限制检查
    const result = await generateAIRecommendationForce(userId, testMoodData)
    
    return result
    
  } catch (error) {
    console.error('强制生成AI推荐失败:', error)
    return {
      success: false,
      message: '强制生成失败: ' + error.message
    }
  }
}

// 强制生成AI推荐（跳过限制检查）
async function generateAIRecommendationForce(userId, moodData) {
  console.log('开始强制生成AI推荐，用户ID:', userId, '心情数据:', moodData)

  try {
    // 1. 获取用户最近心情历史
    const moodHistory = await getUserMoodHistory(userId)
    console.log('获取到心情历史记录数:', moodHistory.length)
    
    // 如果没有历史记录，创建一些测试数据
    if (moodHistory.length === 0) {
      console.log('没有心情历史，使用测试数据')
      const testHistory = [
        { moodValue: 3, moodLabel: '一般', createTime: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        { moodValue: 2, moodLabel: '低落', createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { moodValue: 4, moodLabel: '平静', createTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      ]
      moodHistory.push(...testHistory)
    }
    
    // 2. 分析心情趋势
    const moodAnalysis = analyzeMoodTrend(moodHistory)
    console.log('心情趋势分析:', moodAnalysis)
    
    // 3. 构建AI请求
    const aiPrompt = buildAIPrompt(moodData, moodHistory, moodAnalysis)
    console.log('构建AI提示词完成')
    
    // 4. 调用AI生成推荐
    const aiRecommendations = await callAIForRecommendation(aiPrompt)
    console.log('AI推荐生成完成:', aiRecommendations)
    
    // 5. 保存到缓存
    const expireTime = new Date()
    expireTime.setDate(expireTime.getDate() + CACHE_EXPIRE_DAYS)
    
    const recommendationData = {
      userId: userId,
      moodValue: moodData.moodValue,
      moodLabel: moodData.moodLabel,
      moodHistory: moodHistory.map(m => m.moodValue),
      moodTrend: moodAnalysis.trend,
      recommendations: aiRecommendations,
      generateTime: new Date(),
      expireTime: expireTime,
      status: 'ready',
      tokenUsed: true, // 标记使用了AI token
      testGenerated: true // 标记为测试生成
    }
    
    console.log('准备保存推荐数据到数据库:', recommendationData)
    
    const saveResult = await db.collection('mood_recommendations').add({
      data: recommendationData
    })
    
    console.log('推荐数据保存成功，记录ID:', saveResult._id)
    
    return {
      success: true,
      message: 'AI推荐强制生成成功',
      recommendations: aiRecommendations,
      source: 'force-ai',
      saveId: saveResult._id
    }

  } catch (error) {
    console.error('强制生成AI推荐失败:', error)
    
    // 失败时返回规则推荐
    const fallbackRecommendations = getRuleBasedRecommendations(moodData.moodValue)
    
    return {
      success: true,
      source: 'fallback',
      recommendations: fallbackRecommendations,
      message: 'AI服务暂时不可用，为你提供了基础推荐'
    }
  }
}
async function testDatabaseConnection(event) {
  const { userId } = event
  
  try {
    console.log('测试数据库连接，用户ID:', userId)
    
    // 测试写入
    const testData = {
      userId: userId || 'test-user',
      testField: 'test-value',
      createTime: new Date(),
      status: 'test'
    }
    
    const writeResult = await db.collection('mood_recommendations').add({
      data: testData
    })
    
    console.log('测试写入成功，记录ID:', writeResult._id)
    
    // 测试读取
    const readResult = await db.collection('mood_recommendations')
      .where({
        userId: userId || 'test-user',
        status: 'test'
      })
      .get()
    
    console.log('测试读取成功，记录数:', readResult.data.length)
    
    // 清理测试数据
    if (writeResult._id) {
      await db.collection('mood_recommendations').doc(writeResult._id).remove()
      console.log('测试数据清理完成')
    }
    
    return {
      success: true,
      message: '数据库连接测试成功',
      writeId: writeResult._id,
      readCount: readResult.data.length
    }
    
  } catch (error) {
    console.error('数据库连接测试失败:', error)
    return {
      success: false,
      message: '数据库连接测试失败: ' + error.message
    }
  }
}

// 获取推荐（优先缓存）
async function getRecommendation(event) {
  const { userId } = event

  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  console.log('获取推荐请求，用户ID:', userId)

  try {
    // 1. 查找有效缓存
    const now = new Date()
    const cacheResult = await db.collection('mood_recommendations')
      .where({
        userId: userId,
        status: 'ready',
        expireTime: _.gte(now)
      })
      .orderBy('generateTime', 'desc')
      .limit(1)
      .get()

    console.log('缓存查询结果:', cacheResult.data.length, '条记录')

    if (cacheResult.data.length > 0) {
      // 返回缓存的推荐
      const cachedRecommendation = cacheResult.data[0]
      console.log('返回缓存推荐，来源:', cachedRecommendation.tokenUsed ? 'AI' : '规则')
      
      return {
        success: true,
        source: cachedRecommendation.tokenUsed ? 'cache-ai' : 'cache-rule',
        recommendations: cachedRecommendation.recommendations.slice(0, 1), // 只返回第一个
        moodInfo: {
          moodValue: cachedRecommendation.moodValue,
          moodLabel: cachedRecommendation.moodLabel
        }
      }
    }

    // 2. 无缓存，返回规则推荐（只返回1个）
    console.log('无缓存，返回规则推荐')
    const ruleRecommendations = getRuleBasedRecommendations(null)
    
    return {
      success: true,
      source: 'rule',
      recommendations: ruleRecommendations, // 现在getRuleBasedRecommendations已经只返回1个
      message: '正在为你生成个性化推荐...'
    }

  } catch (error) {
    console.error('获取推荐失败:', error)
    return { success: false, message: '获取推荐失败' }
  }
}

// 生成AI推荐
async function generateAIRecommendation(event) {
  const { userId, moodData } = event

  if (!userId || !moodData) {
    return { success: false, message: '参数不完整' }
  }

  console.log('开始生成AI推荐，用户ID:', userId, '心情数据:', moodData)

  try {
    // 1. 检查是否真的需要生成新推荐
    const shouldGenerate = await shouldGenerateNewRecommendation(userId, moodData)
    if (!shouldGenerate.generate) {
      console.log('跳过AI生成:', shouldGenerate.reason)
      return {
        success: true,
        source: 'skipped',
        message: shouldGenerate.reason,
        recommendations: getRuleBasedRecommendations(moodData.moodValue)
      }
    }

    console.log('满足生成条件，开始AI推荐生成')

    // 2. 获取用户最近心情历史
    const moodHistory = await getUserMoodHistory(userId)
    console.log('获取到心情历史记录数:', moodHistory.length)
    
    // 3. 分析心情趋势
    const moodAnalysis = analyzeMoodTrend(moodHistory)
    console.log('心情趋势分析:', moodAnalysis)
    
    // 4. 构建AI请求
    const aiPrompt = buildAIPrompt(moodData, moodHistory, moodAnalysis)
    console.log('构建AI提示词完成')
    
    // 5. 调用AI生成推荐
    const aiRecommendations = await callAIForRecommendation(aiPrompt)
    console.log('AI推荐生成完成:', aiRecommendations)
    
    // 6. 保存到缓存
    const expireTime = new Date()
    expireTime.setDate(expireTime.getDate() + CACHE_EXPIRE_DAYS)
    
    const recommendationData = {
      userId: userId,
      moodValue: moodData.moodValue,
      moodLabel: moodData.moodLabel,
      moodHistory: moodHistory.map(m => m.moodValue),
      moodTrend: moodAnalysis.trend,
      recommendations: aiRecommendations,
      generateTime: new Date(),
      expireTime: expireTime,
      status: 'ready',
      tokenUsed: true // 标记使用了AI token
    }
    
    console.log('准备保存推荐数据到数据库:', recommendationData)
    
    const saveResult = await db.collection('mood_recommendations').add({
      data: recommendationData
    })
    
    console.log('推荐数据保存成功，记录ID:', saveResult._id)
    
    return {
      success: true,
      message: 'AI推荐生成成功',
      recommendations: aiRecommendations,
      source: 'ai'
    }

  } catch (error) {
    console.error('生成AI推荐失败:', error)
    
    // 失败时返回规则推荐
    const fallbackRecommendations = getRuleBasedRecommendations(moodData.moodValue)
    
    return {
      success: true,
      source: 'fallback',
      recommendations: fallbackRecommendations,
      message: 'AI服务暂时不可用，为你提供了基础推荐'
    }
  }
}

// 检查是否需要生成新推荐
async function shouldGenerateNewRecommendation(userId, moodData) {
  try {
    const now = new Date()
    
    // ===== 测试模式：临时禁用每日调用限制 =====
    // TODO: 测试完成后恢复此限制
    const TESTING_MODE = false // 设置为 false 恢复限制
    
    if (!TESTING_MODE) {
      // 1. 检查今日AI调用次数限制（每日1次）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      
      const todayAIUsage = await db.collection('mood_recommendations')
        .where({
          userId: userId,
          generateTime: _.gte(today).and(_.lt(todayEnd)),
          tokenUsed: true
        })
        .count()
      
      // 每用户每日最多1次AI调用
      if (todayAIUsage.total >= 1) {
        return {
          generate: false,
          reason: '今日AI调用次数已达上限（1次/日）'
        }
      }
    } else {
      console.log('⚠️ 测试模式：已禁用每日调用次数限制')
    }
    
    // 2. 检查是否有足够的心情数据（降低到1条记录即可测试）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const moodRecords = await db.collection('mood_records')
      .where({
        userId: userId,
        createTime: _.gte(sevenDaysAgo)
      })
      .count()
    
    const minRecords = TESTING_MODE ? 1 : 3 // 测试模式只需1条记录
    
    if (moodRecords.total < minRecords) {
      return {
        generate: false,
        reason: `心情记录不足，需要至少${minRecords}天的记录`
      }
    }
    
    return {
      generate: true,
      reason: TESTING_MODE 
        ? '测试模式：满足生成条件' 
        : '满足生成条件：今日未调用AI且有足够心情数据'
    }
    
  } catch (error) {
    console.error('检查生成条件失败:', error)
    return {
      generate: false,
      reason: '检查失败'
    }
  }
}

// 刷新用户缓存
async function refreshUserCache(event) {
  const { userId } = event

  if (!userId) {
    return { success: false, message: '用户ID不能为空' }
  }

  try {
    // 获取最新心情数据
    const latestMood = await db.collection('mood_records')
      .where({ userId: userId })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()

    if (latestMood.data.length === 0) {
      return { success: false, message: '暂无心情数据' }
    }

    const moodData = {
      moodValue: latestMood.data[0].moodValue,
      moodLabel: latestMood.data[0].moodLabel
    }

    // 重新生成推荐
    return await generateAIRecommendation({ userId, moodData })

  } catch (error) {
    console.error('刷新缓存失败:', error)
    return { success: false, message: '刷新失败' }
  }
}

// 获取用户心情历史（近7天所有记录）
async function getUserMoodHistory(userId) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const result = await db.collection('mood_records')
    .where({
      userId: userId,
      createTime: _.gte(sevenDaysAgo)
    })
    .orderBy('createTime', 'desc')
    .get() // 获取所有记录，不限制数量

  return result.data
}

// 分析心情趋势（基于所有7天记录）
function analyzeMoodTrend(moodHistory) {
  if (moodHistory.length < 2) {
    return { 
      trend: 'insufficient', 
      description: '数据不足，需要更多心情记录',
      details: {
        totalRecords: moodHistory.length,
        avgMood: 0,
        moodRange: [0, 0]
      }
    }
  }

  const values = moodHistory.map(m => m.moodValue)
  const totalRecords = values.length
  
  // 计算整体平均值
  const avgMood = values.reduce((a, b) => a + b, 0) / values.length
  
  // 计算心情范围
  const minMood = Math.min(...values)
  const maxMood = Math.max(...values)
  const moodRange = maxMood - minMood
  
  // 按时间分析趋势（前半段 vs 后半段）
  const midPoint = Math.floor(values.length / 2)
  const earlierPeriod = values.slice(midPoint) // 时间较早的记录
  const recentPeriod = values.slice(0, midPoint) // 时间较近的记录
  
  const earlierAvg = earlierPeriod.length > 0 
    ? earlierPeriod.reduce((a, b) => a + b, 0) / earlierPeriod.length 
    : avgMood
  const recentAvg = recentPeriod.length > 0 
    ? recentPeriod.reduce((a, b) => a + b, 0) / recentPeriod.length 
    : avgMood
  
  const trendDiff = recentAvg - earlierAvg
  
  // 分析心情稳定性
  const variance = values.reduce((acc, val) => acc + Math.pow(val - avgMood, 2), 0) / values.length
  const stability = variance < 0.5 ? 'stable' : variance < 1.5 ? 'moderate' : 'volatile'
  
  // 确定趋势
  let trend, description
  if (Math.abs(trendDiff) < 0.3) {
    trend = 'stable'
    description = `心情较为稳定，平均${avgMood.toFixed(1)}分`
  } else if (trendDiff > 0.5) {
    trend = 'improving'
    description = `心情逐渐好转，从${earlierAvg.toFixed(1)}分提升到${recentAvg.toFixed(1)}分`
  } else if (trendDiff < -0.5) {
    trend = 'declining'
    description = `心情有所下降，从${earlierAvg.toFixed(1)}分降到${recentAvg.toFixed(1)}分`
  } else {
    trend = 'fluctuating'
    description = `心情有轻微波动，整体平均${avgMood.toFixed(1)}分`
  }
  
  return {
    trend,
    description,
    details: {
      totalRecords,
      avgMood: parseFloat(avgMood.toFixed(1)),
      moodRange: [minMood, maxMood],
      stability,
      trendDiff: parseFloat(trendDiff.toFixed(1)),
      earlierAvg: parseFloat(earlierAvg.toFixed(1)),
      recentAvg: parseFloat(recentAvg.toFixed(1))
    }
  }
}

// 构建AI提示词（基于7天完整数据）
function buildAIPrompt(currentMood, moodHistory, moodAnalysis) {
  const moodLabels = {
    1: '焦虑',
    2: '低落', 
    3: '一般',
    4: '平静',
    5: '开心'
  }

  // 构建详细的心情历史描述
  const historyByDay = {}
  const now = new Date()
  
  moodHistory.forEach(record => {
    const recordDate = new Date(record.createTime)
    const daysAgo = Math.floor((now - recordDate) / (24 * 60 * 60 * 1000))
    const dayKey = daysAgo === 0 ? '今天' : `${daysAgo}天前`
    
    if (!historyByDay[dayKey]) {
      historyByDay[dayKey] = []
    }
    historyByDay[dayKey].push({
      mood: moodLabels[record.moodValue],
      value: record.moodValue,
      time: recordDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    })
  })

  // 生成心情历史文本
  let historyText = ''
  Object.keys(historyByDay).sort((a, b) => {
    if (a === '今天') return -1
    if (b === '今天') return 1
    return parseInt(a) - parseInt(b)
  }).forEach(day => {
    const dayMoods = historyByDay[day]
    if (dayMoods.length === 1) {
      historyText += `${day}: ${dayMoods[0].mood}(${dayMoods[0].value}分); `
    } else {
      const moodSummary = dayMoods.map(m => `${m.time}${m.mood}(${m.value}分)`).join('、')
      historyText += `${day}: ${moodSummary}; `
    }
  })

  // 构建心情模式分析
  const { details } = moodAnalysis
  const patternText = `整体趋势：${moodAnalysis.description}。平均心情${details.avgMood}分，心情波动范围${details.moodRange[0]}-${details.moodRange[1]}分，情绪${details.stability === 'stable' ? '稳定' : details.stability === 'moderate' ? '中等波动' : '波动较大'}。`

  return {
    currentMood: currentMood.moodLabel,
    moodValue: currentMood.moodValue,
    totalRecords: details.totalRecords,
    moodHistory: historyText,
    trendAnalysis: patternText,
    avgMood: details.avgMood,
    moodStability: details.stability,
    requirement: `用户近7天共有${details.totalRecords}次心情记录，当前心情是${currentMood.moodLabel}(${currentMood.moodValue}分)。${patternText}详细记录：${historyText}请基于用户的完整心情模式，为用户推荐1个最适合的疗愈计划。计划需包含：标题、简短描述（30字内）、推荐理由（结合用户心情模式，50字内）、计划天数（7或14天）、每日时长（10-30分钟）。请特别关注用户的心情趋势和稳定性，选择最符合用户当前状态的计划。`
  }
}

// 调用AI服务生成推荐
async function callAIForRecommendation(promptData) {
  try {
    const aiRequestData = {
      inputs: {
        mood_analysis: {
          currentMood: promptData.currentMood,
          moodValue: promptData.moodValue,
          moodHistory: promptData.moodHistory,
          trendAnalysis: promptData.trendAnalysis,
          requirement: promptData.requirement
        }
      },
      response_mode: 'blocking',
      user: `mood-user-${Date.now()}`
    }

    console.log('AI请求数据:', JSON.stringify(aiRequestData, null, 2))
    const aiResponse = await callAIService(aiRequestData)
    console.log('AI原始响应:', aiResponse)
    
    // 解析AI返回的推荐
    let recommendations = []
    
    try {
      const parsedData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
      console.log('解析后的AI数据:', parsedData)
      
      // 尝试多种数据格式
      if (parsedData.data?.outputs?.recommendation) {
        // 单个推荐格式
        recommendations = [parsedData.data.outputs.recommendation]
      } else if (parsedData.data?.outputs?.recommendations) {
        // 多个推荐格式
        recommendations = Array.isArray(parsedData.data.outputs.recommendations) 
          ? parsedData.data.outputs.recommendations.slice(0, 1) // 只取第一个
          : [parsedData.data.outputs.recommendations]
      } else if (parsedData.recommendation) {
        recommendations = [parsedData.recommendation]
      } else if (parsedData.recommendations && Array.isArray(parsedData.recommendations)) {
        recommendations = parsedData.recommendations.slice(0, 1) // 只取第一个
      } else if (parsedData.data?.outputs?.text) {
        // 如果返回的是文本，尝试解析
        console.log('AI返回文本格式，尝试解析:', parsedData.data.outputs.text)
        recommendations = parseTextRecommendations(parsedData.data.outputs.text, promptData.moodValue)
      } else {
        console.log('未识别的AI响应格式，使用规则推荐')
        recommendations = getRuleBasedRecommendations(promptData.moodValue)
      }
    } catch (parseError) {
      console.error('解析AI推荐失败:', parseError)
      recommendations = getRuleBasedRecommendations(promptData.moodValue)
    }

    // 确保推荐格式正确
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      console.log('AI推荐格式不正确或为空，使用规则推荐')
      recommendations = getRuleBasedRecommendations(promptData.moodValue)
    } else {
      // 只保留第一个推荐
      recommendations = recommendations.slice(0, 1)
      
      // 验证推荐格式
      const recommendation = recommendations[0]
      if (!recommendation.title || !recommendation.description) {
        console.log('AI推荐缺少必要字段，使用规则推荐')
        recommendations = getRuleBasedRecommendations(promptData.moodValue)
      } else {
        // 补充缺失的字段
        if (!recommendation.icon) recommendation.icon = '🌟'
        if (!recommendation.bgColor) recommendation.bgColor = '#E8F8F5'
        if (!recommendation.days) recommendation.days = 7
        if (!recommendation.duration) recommendation.duration = 15
        if (!recommendation.themes) recommendation.themes = ['AI推荐']
        if (!recommendation.reason) recommendation.reason = recommendation.description
      }
    }

    console.log('最终推荐结果:', recommendations)
    return recommendations

  } catch (error) {
    console.error('AI推荐调用失败:', error)
    // 返回规则推荐作为降级方案
    return getRuleBasedRecommendations(promptData.moodValue)
  }
}

// 调用AI服务（复用planGenerator的逻辑）
async function callAIService(data) {
  const https = require('https')
  const http = require('http')

  return new Promise((resolve, reject) => {
    const url = new URL(AI_CONFIG.url)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const requestBody = JSON.stringify(data)

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 60000
    }

    const req = client.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(responseData)
            resolve(jsonData)
          } catch (e) {
            resolve(responseData)
          }
        } else {
          reject(new Error(`AI服务返回错误: ${res.statusCode}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('AI请求超时'))
    })

    req.write(requestBody)
    req.end()
  })
}

// 解析文本格式的推荐
function parseTextRecommendations(text, moodValue) {
  // 简单的文本解析逻辑，实际可以更复杂
  const ruleRecs = getRuleBasedRecommendations(moodValue)
  return ruleRecs
}

// 规则推荐（降级方案）- 只返回1个推荐，包含任务列表
function getRuleBasedRecommendations(moodValue) {
  const recommendations = {
    1: { // 焦虑
      title: '呼吸放松练习',
      description: '通过深呼吸缓解焦虑情绪',
      reason: '呼吸练习能快速平复焦虑，帮助你找回内心的平静',
      days: 7,
      duration: 15,
      icon: '🌬️',
      bgColor: '#E3F2FD',
      themes: ['焦虑缓解', '呼吸练习'],
      tasks: [
        { day: 1, title: '学习基础呼吸法', content: '练习4-7-8呼吸法，吸气4秒，屏息7秒，呼气8秒', duration: 10, typeIcon: '🌬️', typeName: '呼吸练习' },
        { day: 2, title: '深度腹式呼吸', content: '专注腹部起伏，感受呼吸的节奏', duration: 15, typeIcon: '🌬️', typeName: '呼吸练习' },
        { day: 3, title: '呼吸冥想结合', content: '在呼吸练习中加入简单的正念觉察', duration: 15, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 4, title: '情境呼吸练习', content: '在感到焦虑时立即使用呼吸技巧', duration: 15, typeIcon: '🌬️', typeName: '呼吸练习' },
        { day: 5, title: '延长练习时间', content: '将呼吸练习时间延长到20分钟', duration: 20, typeIcon: '🌬️', typeName: '呼吸练习' },
        { day: 6, title: '呼吸与放松', content: '结合肌肉放松，边呼吸边放松身体', duration: 15, typeIcon: '🤸', typeName: '身体放松' },
        { day: 7, title: '总结与巩固', content: '回顾一周练习，制定持续计划', duration: 15, typeIcon: '✍️', typeName: '总结回顾' }
      ]
    },
    2: { // 低落
      title: '温暖音乐疗愈',
      description: '用音乐唤醒内心的温暖',
      reason: '温暖的音乐能提升情绪，带来积极的心理暗示',
      days: 7,
      duration: 20,
      icon: '🎵',
      bgColor: '#FFE5F0',
      themes: ['音乐疗愈', '情绪提升'],
      tasks: [
        { day: 1, title: '选择治愈音乐', content: '挑选3-5首让你感到温暖的音乐', duration: 20, typeIcon: '🎵', typeName: '音乐疗愈' },
        { day: 2, title: '专注聆听', content: '闭眼聆听音乐，感受每个音符的情感', duration: 20, typeIcon: '🎵', typeName: '音乐疗愈' },
        { day: 3, title: '音乐与回忆', content: '让音乐唤起美好的回忆和感受', duration: 20, typeIcon: '💭', typeName: '回忆疗愈' },
        { day: 4, title: '跟随节拍', content: '轻轻摆动身体，与音乐产生共鸣', duration: 20, typeIcon: '🎵', typeName: '音乐疗愈' },
        { day: 5, title: '音乐日记', content: '记录音乐带给你的感受和变化', duration: 20, typeIcon: '✍️', typeName: '书写疗愈' },
        { day: 6, title: '分享音乐', content: '与朋友分享你喜欢的治愈音乐', duration: 20, typeIcon: '🎵', typeName: '音乐分享' },
        { day: 7, title: '创建播放列表', content: '制作专属的情绪疗愈音乐列表', duration: 20, typeIcon: '🎵', typeName: '音乐疗愈' }
      ]
    },
    3: { // 一般
      title: '日常正念练习',
      description: '在日常生活中保持觉察',
      reason: '正念生活能帮助你更好地享受当下，提升生活质量',
      days: 14,
      duration: 15,
      icon: '🧘',
      bgColor: '#E8F8F5',
      themes: ['正念练习', '日常觉察'],
      tasks: [
        { day: 1, title: '正念呼吸入门', content: '专注于呼吸，观察气息的进出', duration: 15, typeIcon: '🧘', typeName: '正念冥想' },
        { day: 2, title: '身体扫描', content: '从头到脚感受身体各部位的感觉', duration: 15, typeIcon: '🧘', typeName: '正念冥想' },
        { day: 3, title: '正念行走', content: '慢慢行走，感受每一步的接触', duration: 15, typeIcon: '🍃', typeName: '正念行走' },
        { day: 4, title: '正念饮食', content: '专注品尝食物的味道和质感', duration: 15, typeIcon: '🍃', typeName: '正念生活' },
        { day: 5, title: '情绪观察', content: '觉察情绪的起伏，不做判断', duration: 15, typeIcon: '💭', typeName: '情绪觉察' },
        { day: 6, title: '思维观察', content: '观察思维的流动，如云朵飘过', duration: 15, typeIcon: '💭', typeName: '思维觉察' },
        { day: 7, title: '正念休息', content: '在休息时保持觉察和放松', duration: 15, typeIcon: '🧘', typeName: '正念练习' },
        { day: 8, title: '正念工作', content: '在工作中保持专注和觉察', duration: 15, typeIcon: '📝', typeName: '正念工作' },
        { day: 9, title: '正念沟通', content: '与他人交流时保持全然的关注', duration: 15, typeIcon: '💭', typeName: '正念沟通' },
        { day: 10, title: '正念听音乐', content: '专注聆听音乐，感受声音的层次', duration: 15, typeIcon: '🎵', typeName: '正念聆听' },
        { day: 11, title: '正念观察', content: '观察周围环境，保持好奇心', duration: 15, typeIcon: '🍃', typeName: '正念观察' },
        { day: 12, title: '正念感恩', content: '觉察生活中值得感恩的事物', duration: 15, typeIcon: '✍️', typeName: '感恩练习' },
        { day: 13, title: '正念放松', content: '结合正念与深度放松技巧', duration: 15, typeIcon: '🧘', typeName: '正念放松' },
        { day: 14, title: '正念生活', content: '将正念融入日常生活的每个时刻', duration: 15, typeIcon: '🍃', typeName: '正念生活' }
      ]
    },
    4: { // 平静
      title: '深度冥想进阶',
      description: '探索更深层的内在平静',
      reason: '在平静的基础上，深化冥想练习，获得更深的洞察',
      days: 14,
      duration: 30,
      icon: '🧘',
      bgColor: '#E8F8F5',
      themes: ['深度冥想', '自我探索'],
      tasks: [
        { day: 1, title: '冥想姿势调整', content: '找到最舒适稳定的冥想姿势', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 2, title: '专注力训练', content: '练习长时间专注于单一对象', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 3, title: '呼吸深度观察', content: '深入观察呼吸的细微变化', duration: 30, typeIcon: '🌬️', typeName: '呼吸练习' },
        { day: 4, title: '内在声音聆听', content: '静心聆听内在的声音和感受', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 5, title: '思维间隙体验', content: '体验思维之间的宁静间隙', duration: 30, typeIcon: '💭', typeName: '思维觉察' },
        { day: 6, title: '身心合一练习', content: '感受身体与心灵的深度连接', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 7, title: '慈悲冥想', content: '培养对自己和他人的慈悲心', duration: 30, typeIcon: '💖', typeName: '慈悲练习' },
        { day: 8, title: '觉知扩展', content: '将觉知扩展到更广阔的空间', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 9, title: '无念状态', content: '尝试进入无念的宁静状态', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 10, title: '内观智慧', content: '通过内观获得深层的智慧洞察', duration: 30, typeIcon: '💭', typeName: '内观练习' },
        { day: 11, title: '能量感知', content: '感知身体内的能量流动', duration: 30, typeIcon: '✨', typeName: '能量练习' },
        { day: 12, title: '超越自我', content: '体验超越个人小我的广阔意识', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 13, title: '整合练习', content: '整合所有学到的冥想技巧', duration: 30, typeIcon: '🧘', typeName: '冥想练习' },
        { day: 14, title: '持续修行', content: '制定长期的冥想修行计划', duration: 30, typeIcon: '✍️', typeName: '计划制定' }
      ]
    },
    5: { // 开心
      title: '创意表达工作坊',
      description: '用创造力表达快乐',
      reason: '在快乐的状态下创作，能产生更多灵感和成就感',
      days: 7,
      duration: 30,
      icon: '🎨',
      bgColor: '#F3E5F5',
      themes: ['创意表达', '快乐分享'],
      tasks: [
        { day: 1, title: '创意启发', content: '收集各种创意灵感，制作灵感板', duration: 30, typeIcon: '🎨', typeName: '创意启发' },
        { day: 2, title: '自由绘画', content: '不设限制地自由绘画，表达内心感受', duration: 30, typeIcon: '🎨', typeName: '绘画创作' },
        { day: 3, title: '色彩探索', content: '用不同颜色表达不同的情绪和感受', duration: 30, typeIcon: '🎨', typeName: '色彩练习' },
        { day: 4, title: '文字创作', content: '写下快乐的诗歌或短文', duration: 30, typeIcon: '✍️', typeName: '文字创作' },
        { day: 5, title: '手工制作', content: '制作一件有意义的手工艺品', duration: 30, typeIcon: '🎨', typeName: '手工创作' },
        { day: 6, title: '创意分享', content: '与朋友分享你的创意作品', duration: 30, typeIcon: '💬', typeName: '创意分享' },
        { day: 7, title: '创意展示', content: '整理作品，制作个人创意作品集', duration: 30, typeIcon: '📚', typeName: '作品整理' }
      ]
    }
  }

  const recommendation = recommendations[moodValue] || recommendations[3]
  return [recommendation] // 返回数组格式，但只包含1个推荐
}

// 批量生成推荐（定时任务用）
async function batchGenerateRecommendations(event) {
  const { limit = 10 } = event
  
  try {
    // 1. 找出需要更新推荐的活跃用户
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    // 获取最近3天有心情记录的用户
    const activeUsers = await db.collection('mood_records')
      .where({
        createTime: _.gte(threeDaysAgo)
      })
      .field({
        userId: true,
        moodValue: true,
        moodLabel: true,
        createTime: true
      })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()
    
    // 按用户分组，获取每个用户最新的心情
    const userMoodMap = new Map()
    activeUsers.data.forEach(record => {
      if (!userMoodMap.has(record.userId)) {
        userMoodMap.set(record.userId, {
          moodValue: record.moodValue,
          moodLabel: record.moodLabel,
          createTime: record.createTime
        })
      }
    })
    
    // 2. 筛选出需要生成推荐的用户
    const usersToGenerate = []
    const now = new Date()
    
    for (const [userId, moodData] of userMoodMap) {
      // 检查是否有有效推荐
      const existingRecommendation = await db.collection('mood_recommendations')
        .where({
          userId: userId,
          status: 'ready',
          expireTime: _.gte(now)
        })
        .limit(1)
        .get()
      
      // 检查今日是否已生成AI推荐
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      
      const todayAIGenerated = await db.collection('mood_recommendations')
        .where({
          userId: userId,
          generateTime: _.gte(today).and(_.lt(todayEnd)),
          tokenUsed: true
        })
        .count()
      
      // 只有无有效推荐且今日未生成AI推荐的用户才加入队列
      if (existingRecommendation.data.length === 0 && todayAIGenerated.total === 0) {
        usersToGenerate.push({ userId, moodData })
      }
    }
    
    // 3. 限制批量生成数量
    const limitedUsers = usersToGenerate.slice(0, limit)
    
    // 4. 批量生成推荐
    const results = []
    for (const user of limitedUsers) {
      try {
        const result = await generateAIRecommendation({
          userId: user.userId,
          moodData: user.moodData
        })
        results.push({
          userId: user.userId,
          success: result.success,
          source: result.source || 'ai'
        })
        
        // 添加延迟避免频繁调用AI
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`为用户 ${user.userId} 生成推荐失败:`, error)
        results.push({
          userId: user.userId,
          success: false,
          error: error.message
        })
      }
    }
    
    return {
      success: true,
      message: `批量生成完成，处理了 ${results.length} 个用户`,
      results: results,
      totalActiveUsers: userMoodMap.size,
      usersNeedingRecommendations: usersToGenerate.length
    }
    
  } catch (error) {
    console.error('批量生成推荐失败:', error)
    return {
      success: false,
      message: '批量生成失败',
      error: error.message
    }
  }
}
