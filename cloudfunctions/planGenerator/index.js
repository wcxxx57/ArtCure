// cloudfunctions/planGenerator/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// AI服务配置
const AI_CONFIG = {
  url: 'http://agent_learning.zzz4ai.com/v1/workflows/run',
  apiKey: 'app-qWoGWrs93RdsLCirf5N4VtsS'
}

exports.main = async (event, context) => {
  console.log('云函数被调用，接收到的event:', JSON.stringify(event))
  
  const { action } = event

  console.log('解析出的action:', action)

  try {
    switch (action) {
      case 'generatePlan':
        return await generatePlan(event)
      default:
        console.error('未知操作，action值为:', action)
        return { code: 4000, message: '未知操作', receivedAction: action, eventKeys: Object.keys(event) }
    }
  } catch (error) {
    console.error('计划生成器错误:', error)
    return { code: 5000, message: '服务器错误', error: error.message }
  }
}

// 生成疗愈计划
async function generatePlan(event) {
  const { planName, totalDays, dailyDuration, themes, requirement } = event

  try {
    console.log('开始生成疗愈计划...')
    console.log('输入参数:', { planName, totalDays, dailyDuration, themes, requirement })

    // 构建AI请求数据 - 符合API格式要求
    const aiRequestData = {
      inputs: {
        user_requirement: {
          planName: planName,
          totalDays: totalDays,
          dailyDuration: dailyDuration || 15,
          themes: themes || [],
          requirement: requirement
        }
      },
      response_mode: 'blocking',
      user: `user-${Date.now()}`  // 使用时间戳生成唯一用户ID
    }

    // 调用AI服务
    const aiResponse = await callAIService(aiRequestData)
    
    console.log('AI返回原始数据:', aiResponse)

    // 解析AI返回的任务
    let tasks = []
    try {
      // 尝试解析JSON
      const parsedData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse
      
      // 支持多种返回格式
      // 格式1: data.outputs.structured_output.tasks (Dify workflow格式)
      if (parsedData.data?.outputs?.structured_output?.tasks) {
        tasks = parsedData.data.outputs.structured_output.tasks
      }
      // 格式2: 直接在根级别
      else if (parsedData.tasks && Array.isArray(parsedData.tasks)) {
        tasks = parsedData.tasks
      }
      
    } catch (parseError) {
      console.error('解析AI返回数据失败:', parseError)
      return {
        code: 5003,
        message: 'AI返回数据格式错误',
        error: parseError.message
      }
    }

    // 验证任务数据
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return {
        code: 5004,
        message: 'AI未生成有效任务',
        data: { aiResponse }
      }
    }

    // 处理任务数据，添加图标和确保格式正确
    const processedTasks = tasks.map((task, index) => {
      return {
        day: task.day || (index + 1),
        title: task.title || `第${index + 1}天任务`,
        typeIcon: selectTaskIcon(task.typeName),
        typeName: task.typeName || '疗愈练习',
        duration: dailyDuration || 15,
        description: task.description || '',
        expanded: false
      }
    })

    // 构建完整的计划数据
    const plan = {
      name: planName,
      emoji: selectEmoji(themes),
      bgColor: selectColor(themes),
      totalDays: totalDays,
      tasks: processedTasks
    }

    console.log('最终生成的计划:', plan)

    return {
      code: 0,
      message: '生成成功',
      data: plan
    }

  } catch (error) {
    console.error('生成计划失败:', error)
    return {
      code: 5001,
      message: 'AI生成失败',
      error: error.message
    }
  }
}

// 调用AI服务
async function callAIService(data) {
  const https = require('https')
  const http = require('http')

  return new Promise((resolve, reject) => {
    const url = new URL(AI_CONFIG.url)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    // 构建请求体
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
      timeout: 60000 // 60秒超时
    }

    console.log('发送AI请求:', options)

    const req = client.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        console.log('AI响应状态码:', res.statusCode)
        console.log('AI响应数据:', responseData)

        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(responseData)
            resolve(jsonData)
          } catch (e) {
            resolve(responseData)
          }
        } else {
          reject(new Error(`AI服务返回错误: ${res.statusCode} - ${responseData}`))
        }
      })
    })

    req.on('error', (error) => {
      console.error('AI请求错误:', error)
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

// 根据主题选择emoji
function selectEmoji(themes) {
  if (!themes || themes.length === 0) return '✨'
  
  const emojiMap = {
    '焦虑缓解': '🌊',
    '睡眠改善': '🌙',
    '情绪管理': '💭',
    '压力释放': '🎨',
    '正念冥想': '🧘',
    '自我成长': '🌱'
  }
  
  return emojiMap[themes[0]] || '✨'
}

// 根据主题选择颜色
function selectColor(themes) {
  if (!themes || themes.length === 0) return '#E3F2FD'
  
  const colorMap = {
    '焦虑缓解': '#E3F2FD',
    '睡眠改善': '#F3E5F5',
    '情绪管理': '#FFF8DC',
    '压力释放': '#FFE5F0',
    '正念冥想': '#E8F8F5',
    '自我成长': '#F0F4C3'
  }
  
  return colorMap[themes[0]] || '#E3F2FD'
}

// 根据任务类型选择图标
function selectTaskIcon(typeName) {
  if (!typeName) return '✨'
  
  const iconMap = {
    '冥想': '🧘',
    '呼吸': '🧘',
    '正念': '🧘',
    '书写': '✍️',
    '日记': '✍️',
    '绘画': '🎨',
    '艺术': '🎨',
    '思考': '💭',
    '觉察': '💭',
    '观察': '💭',
    '放松': '🌙',
    '休息': '🌙',
    '睡眠': '🌙',
    '音乐': '🎵',
    '运动': '🤸',
    '伸展': '🤸',
    '阅读': '📖',
    '感恩': '🙏',
    '身体': '🧘',
    '扫描': '🧘'
  }
  
  // 查找匹配的关键词
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (typeName.includes(keyword)) {
      return icon
    }
  }
  
  return '✨'
}
