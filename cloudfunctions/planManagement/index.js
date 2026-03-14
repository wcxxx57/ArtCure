// cloudfunctions/planManagement/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId } = event
  
  // 验证 userId 是否存在
  if (!userId) {
    return { code: 4001, message: '用户未登录' }
  }

  try {
    switch (action) {
      case 'getUserPlans':
        return await getUserPlans(userId)
      case 'getPlanDetail':
        return await getPlanDetail(event.planId, userId)
      case 'createPlanFromTemplate':
        return await createPlanFromTemplate(event, userId)
      case 'createPlan':
        return await createPlan(event, userId)
      case 'checkIn':
        return await checkIn(event.planId, userId)
      case 'updatePlan':
        return await updatePlan(event, userId)
      case 'deletePlan':
        return await deletePlan(event.planId, userId)
      case 'getTemplateParticipants':
        return await getTemplateParticipants(event.templateName)
      default:
        return { code: 4000, message: '未知操作' }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return { code: 5000, message: '服务器错误', error: error.message }
  }
}

// 获取用户计划
async function getUserPlans(userId) {
  try {
    // 查询进行中的计划
    const ongoingResult = await db.collection('user_plans')
      .where({
        userId: userId,
        status: 'ongoing'
      })
      .orderBy('createdAt', 'desc')
      .get()

    // 查询已完成的计划
    const completedResult = await db.collection('user_plans')
      .where({
        userId: userId,
        status: 'completed'
      })
      .orderBy('completedAt', 'desc')
      .limit(10)
      .get()

    // 获取该用户所有计划的ID列表
    const userPlanIds = [
      ...ongoingResult.data.map(p => p._id),
      ...completedResult.data.map(p => p._id)
    ]

    // 根据计划ID查询打卡记录（这样可以兼容旧数据）
    let totalCheckIns = 0
    if (userPlanIds.length > 0) {
      const checkInResult = await db.collection('check_in_records')
        .where({
          planId: _.in(userPlanIds)
        })
        .count()
      totalCheckIns = checkInResult.total
    }

    // 计算统计数据
    const stats = {
      ongoing: ongoingResult.data.length,
      completed: completedResult.data.length,
      totalDays: totalCheckIns  // 使用该用户所有计划的打卡记录总数
    }

    // 处理进行中的计划，添加今日打卡状态
    const today = new Date().toDateString()
    const processedOngoing = ongoingResult.data.map(plan => {
      const lastCheckIn = plan.lastCheckIn ? new Date(plan.lastCheckIn).toDateString() : null
      return {
        ...plan,
        todayChecked: lastCheckIn === today
      }
    })

    // 处理已完成的计划，格式化完成日期
    const processedCompleted = completedResult.data.map(plan => {
      const completedDate = new Date(plan.completedAt)
      return {
        ...plan,
        completedDate: `${completedDate.getFullYear()}-${completedDate.getMonth() + 1}-${completedDate.getDate()}`
      }
    })

    return {
      code: 0,
      message: '获取成功',
      data: {
        ongoingPlans: processedOngoing,
        completedPlans: processedCompleted,
        stats: stats
      }
    }
  } catch (error) {
    console.error('获取用户计划失败:', error)
    return { code: 5001, message: '获取失败', error: error.message }
  }
}

// 获取计划详情
async function getPlanDetail(planId, userId) {
  try {
    // 查询计划
    const planResult = await db.collection('user_plans')
      .doc(planId)
      .get()

    if (!planResult.data || planResult.data.userId !== userId) {
      return { code: 4004, message: '计划不存在或无权访问' }
    }

    const plan = planResult.data

    // 获取今日任务（currentDay为0时显示第1天任务，currentDay为1时显示第2天任务）
    const todayTaskIndex = plan.currentDay  // currentDay就是下一个要做的任务索引
    const todayTask = plan.tasks[todayTaskIndex] || {}

    // 查询打卡记录
    const checkInResult = await db.collection('check_in_records')
      .where({
        userId: userId,
        planId: planId
      })
      .orderBy('checkInDate', 'desc')
      .get()

    // 检查今日是否已打卡
    const today = new Date().toDateString()
    const lastCheckIn = plan.lastCheckIn ? new Date(plan.lastCheckIn).toDateString() : null
    const todayChecked = lastCheckIn === today

    // 计算连续打卡天数
    let streak = 0
    const sortedRecords = checkInResult.data.sort((a, b) => b.checkInDate - a.checkInDate)
    let currentDate = new Date()
    
    for (const record of sortedRecords) {
      const recordDate = new Date(record.checkInDate)
      const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24))
      
      if (diffDays === streak) {
        streak++
        currentDate = recordDate
      } else {
        break
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        planInfo: {
          ...plan,
          streak: streak,
          todayChecked: todayChecked
        },
        todayTask: {
          ...todayTask,
          started: false
        },
        checkInRecords: checkInResult.data
      }
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    return { code: 5002, message: '获取失败', error: error.message }
  }
}

// 从推荐创建计划
async function createPlan(event, userId) {
  try {
    const { planData } = event
    const now = Date.now()

    console.log('创建计划，用户ID:', userId, '计划数据:', planData)

    // 验证必要字段
    if (!planData.name || !planData.totalDays) {
      return { code: 4001, message: '计划名称和天数不能为空' }
    }

    // 处理任务列表
    let tasks = []
    if (planData.tasks && Array.isArray(planData.tasks)) {
      tasks = planData.tasks.map((task, index) => ({
        day: task.day || (index + 1),
        title: task.title || `第${task.day || (index + 1)}天任务`,
        typeIcon: task.typeIcon || '🧘',
        typeName: task.typeName || '疗愈活动',
        duration: task.duration || planData.duration || 15,
        description: task.description || task.content || '',
        completed: false
      }))
    } else {
      // 如果没有提供任务，生成默认任务
      for (let i = 1; i <= planData.totalDays; i++) {
        tasks.push({
          day: i,
          title: `第${i}天：${planData.name}`,
          typeIcon: '🧘',
          typeName: '疗愈活动',
          duration: planData.duration || 15,
          description: planData.description || '继续你的疗愈之旅',
          completed: false
        })
      }
    }

    console.log('处理后的任务列表:', tasks)

    // 创建用户计划
    const result = await db.collection('user_plans').add({
      data: {
        userId: userId,
        name: planData.name,
        emoji: planData.emoji || '🌟',
        bgColor: planData.bgColor || '#E8F8F5',
        totalDays: planData.totalDays,
        currentDay: 0,  // 还没开始第1天
        tasks: tasks,
        status: 'ongoing',
        startDate: now,
        lastCheckIn: null,
        checkInDays: [],
        createdAt: now,
        source: planData.source || 'recommendation', // 记录来源
        description: planData.description || '',
        reason: planData.reason || '',
        themes: planData.themes || [],
        duration: planData.duration || 15
      }
    })

    console.log('计划创建成功，ID:', result._id)

    return {
      code: 0,
      message: '计划创建成功',
      data: {
        planId: result._id
      }
    }
  } catch (error) {
    console.error('创建计划失败:', error)
    return { code: 5003, message: '创建计划失败', error: error.message }
  }
}

// 从模板创建计划
async function createPlanFromTemplate(event, userId) {
  try {
    const { templateInfo, tasks } = event
    const now = Date.now()

    // 创建用户计划
    const result = await db.collection('user_plans').add({
      data: {
        userId: userId,
        name: templateInfo.name,
        emoji: templateInfo.emoji,
        bgColor: templateInfo.bgColor,
        totalDays: templateInfo.totalDays,
        currentDay: 0,  // 改为0，表示还没开始第1天
        tasks: tasks,
        status: 'ongoing',
        startDate: now,
        lastCheckIn: null,
        checkInDays: [],
        createdAt: now,
        templateName: templateInfo.templateName || templateInfo.name  // 记录模板名称用于统计
      }
    })

    return {
      code: 0,
      message: '创建成功',
      data: {
        planId: result._id
      }
    }
  } catch (error) {
    console.error('创建计划失败:', error)
    return { code: 5003, message: '创建失败', error: error.message }
  }
}

// 删除计划
async function deletePlan(planId, userId) {
  try {
    // 验证权限
    const planResult = await db.collection('user_plans')
      .doc(planId)
      .get()

    if (!planResult.data || planResult.data.userId !== userId) {
      return { code: 4004, message: '计划不存在或无权访问' }
    }

    // 删除计划
    await db.collection('user_plans')
      .doc(planId)
      .remove()

    // 删除相关的打卡记录
    await db.collection('check_in_records')
      .where({
        userId: userId,
        planId: planId
      })
      .remove()

    return {
      code: 0,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除计划失败:', error)
    return { code: 5006, message: '删除失败', error: error.message }
  }
}

// 获取模板参与人数
async function getTemplateParticipants(templateName) {
  try {
    // 统计所有同名计划的数量（不依赖 templateName 字段）
    const result = await db.collection('user_plans')
      .where({
        name: templateName  // 直接用计划名称统计
      })
      .count()

    return {
      code: 0,
      message: '获取成功',
      data: {
        participants: result.total
      }
    }
  } catch (error) {
    console.error('获取参与人数失败:', error)
    return { code: 5007, message: '获取失败', error: error.message }
  }
}

// 打卡
async function checkIn(planId, userId) {
  try {
    // 查询计划
    const planResult = await db.collection('user_plans')
      .doc(planId)
      .get()

    if (!planResult.data || planResult.data.userId !== userId) {
      return { code: 4004, message: '计划不存在或无权访问' }
    }

    const plan = planResult.data

    // 检查今日是否已打卡
    const today = new Date().toDateString()
    const lastCheckIn = plan.lastCheckIn ? new Date(plan.lastCheckIn).toDateString() : null
    
    if (lastCheckIn === today) {
      return { code: 4001, message: '今日已打卡' }
    }

    const now = Date.now()

    // 创建打卡记录（记录的是完成的天数，currentDay+1）
    await db.collection('check_in_records').add({
      data: {
        userId: userId,
        planId: planId,
        day: plan.currentDay + 1,  // 打卡时记录完成的是第几天
        checkInDate: now,
        createdAt: now
      }
    })

    // 更新计划
    const updateData = {
      lastCheckIn: now,
      checkInDays: _.push(now),
      currentDay: _.inc(1)  // 打卡后 currentDay +1
    }

    // 如果完成了所有天数，标记为已完成
    if (plan.currentDay + 1 >= plan.totalDays) {
      updateData.status = 'completed'
      updateData.completedAt = now
    }

    await db.collection('user_plans')
      .doc(planId)
      .update({
        data: updateData
      })

    return {
      code: 0,
      message: '打卡成功'
    }
  } catch (error) {
    console.error('打卡失败:', error)
    return { code: 5004, message: '打卡失败', error: error.message }
  }
}

// 更新计划
async function updatePlan(event, userId) {
  try {
    const { planId, updates } = event

    // 验证权限
    const planResult = await db.collection('user_plans')
      .doc(planId)
      .get()

    if (!planResult.data || planResult.data.userId !== userId) {
      return { code: 4004, message: '计划不存在或无权访问' }
    }

    // 更新计划
    await db.collection('user_plans')
      .doc(planId)
      .update({
        data: updates
      })

    return {
      code: 0,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新计划失败:', error)
    return { code: 5005, message: '更新失败', error: error.message }
  }
}
