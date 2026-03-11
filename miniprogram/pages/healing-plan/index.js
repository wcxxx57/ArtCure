// healing-plan/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    isLogin: false,
    // 我的进行中计划（从数据库加载）
    myPlans: [],
    
    // AI推荐计划
    recommendations: [],
    recommendationSource: '', // cache/rule/ai
    showRecommendations: false,
    
    // 经典方案
    classicPlans: [
      { id: 1, title: '7天焦虑缓解计划', emoji: '🌊', bgColor: '#E3F2FD', tags: ['绘画', '冥想'] },
      { id: 2, title: '睡前情绪清理', emoji: '🌙', bgColor: '#F3E5F5', tags: ['白噪音', '书写'] },
      { id: 3, title: '14天正念入门', emoji: '🍃', bgColor: '#E8F8F5', tags: ['呼吸', '冥想'] },
      { id: 4, title: '音乐疗愈之旅', emoji: '🎵', bgColor: '#FFF8DC', tags: ['音乐', '放松'] }
    ]
  },

  onLoad(options) {
    this.checkLoginAndLoadPlans()
  },
  
  onShow() {
    this.checkLoginAndLoadPlans()
  },
  
  // 检查登录并加载计划
  checkLoginAndLoadPlans() {
    const isLoggedIn = AuthService.isLoggedIn()
    this.setData({ isLogin: isLoggedIn })
    if (isLoggedIn) {
      this.loadMyPlans()
      this.loadRecommendations()
    } else {
      this.setData({ 
        myPlans: [],
        recommendations: [],
        showRecommendations: false
      })
    }
  },
  
  // 我的计划入口点击
  onMyPlansEntryTap() {
    wx.navigateTo({
      url: '/pages/my-plans/index'
    })
  },
  
  // 加载我的计划
  loadMyPlans() {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo) {
      this.setData({ myPlans: [] })
      return
    }

    wx.cloud.callFunction({
      name: 'planManagement',
      data: { 
        action: 'getUserPlans',
        userId: userInfo._id
      }
    }).then(res => {
      if (res.result.code === 0) {
        const { ongoingPlans } = res.result.data
        
        // 只显示前3个进行中的计划
        const displayPlans = ongoingPlans.slice(0, 3).map(plan => {
          const progress = Math.round((plan.currentDay / plan.totalDays) * 100)
          return {
            ...plan,
            id: plan._id,
            title: plan.name,
            progress: progress,
            displayDay: plan.currentDay  // 已完成的天数
          }
        })
        
        this.setData({
          myPlans: displayPlans
        })
      } else {
        console.error('加载计划失败:', res.result.message)
        this.setData({ myPlans: [] })
      }
    }).catch(err => {
      console.error('加载计划失败:', err)
      this.setData({ myPlans: [] })
    })
  },

  // AI 推荐点击
  onAIRecommendTap() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后开启计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    wx.showToast({
      title: 'AI计划功能开发中',
      icon: 'none'
    })
  },
  
  // 我的计划点击
  onMyPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    wx.navigateTo({
      url: `/pages/plan-detail/index?planId=${plan._id}`
    })
  },
  
  // 经典方案点击
  onClassicPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后加入计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    // 根据计划ID跳转到对应的模板页
    const templateMap = {
      1: 'anxiety-7days',      // 7天焦虑缓解计划
      2: 'sleep-emotion',       // 睡前情绪清理
      3: 'mindfulness-14days',  // 14天正念入门
      4: 'music-healing'        // 音乐疗愈之旅
    }
    
    const templateId = templateMap[plan.id]
    if (templateId) {
      wx.navigateTo({
        url: `/pages/plan-template/index?templateId=${templateId}`
      })
    } else {
      wx.showToast({
        title: '该计划开发中',
        icon: 'none'
      })
    }
  },
  
  // 定制计划点击
  onCustomPlanTap() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后定制计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    // 跳转到AI定制计划页面
    wx.navigateTo({
      url: '/pages/plan-custom/index'
    })
  },

  // 加载AI推荐
  loadRecommendations() {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo._id && !userInfo.userId)) {
      console.log('用户未登录，跳过推荐加载')
      return
    }

    const userId = userInfo._id || userInfo.userId
    console.log('开始加载推荐，用户ID:', userId)

    wx.cloud.callFunction({
      name: 'moodRecommendation',
      data: {
        action: 'getRecommendation',
        userId: userId
      }
    }).then(res => {
      console.log('推荐加载结果:', res)
      if (res.result && res.result.success) {
        const recommendations = res.result.recommendations || []
        console.log('获取到推荐:', recommendations.length, '个')
        this.setData({
          recommendations: recommendations,
          recommendationSource: res.result.source,
          showRecommendations: recommendations.length > 0
        })
        
        if (recommendations.length === 0) {
          console.log('推荐为空，来源:', res.result.source)
        }
      } else {
        console.error('推荐加载失败:', res.result)
        // 显示规则推荐作为降级
        this.showFallbackRecommendations()
      }
    }).catch(err => {
      console.error('加载推荐失败:', err)
      // 显示规则推荐作为降级
      this.showFallbackRecommendations()
    })
  },

  // 显示降级推荐
  showFallbackRecommendations() {
    const fallbackRecommendation = {
      title: '呼吸放松练习',
      description: '通过深呼吸缓解压力',
      reason: '呼吸练习能快速平复情绪，帮助你找回内心的平静',
      days: 7,
      duration: 15,
      icon: '🌬️',
      bgColor: '#E3F2FD',
      themes: ['呼吸练习', '压力缓解'],
      tasks: [
        { day: 1, title: '学习基础呼吸法', content: '练习4-7-8呼吸法，吸气4秒，屏息7秒，呼气8秒', duration: 10 },
        { day: 2, title: '深度腹式呼吸', content: '专注腹部起伏，感受呼吸的节奏', duration: 15 },
        { day: 3, title: '呼吸冥想结合', content: '在呼吸练习中加入简单的正念觉察', duration: 15 },
        { day: 4, title: '情境呼吸练习', content: '在感到焦虑时立即使用呼吸技巧', duration: 15 },
        { day: 5, title: '延长练习时间', content: '将呼吸练习时间延长到20分钟', duration: 20 },
        { day: 6, title: '呼吸与放松', content: '结合肌肉放松，边呼吸边放松身体', duration: 15 },
        { day: 7, title: '总结与巩固', content: '回顾一周练习，制定持续计划', duration: 15 }
      ]
    }
    
    this.setData({
      recommendations: [fallbackRecommendation],
      recommendationSource: 'fallback',
      showRecommendations: true
    })
    
    console.log('显示降级推荐')
  },

  // 推荐计划点击
  onRecommendationTap(e) {
    const recommendation = e.currentTarget.dataset.recommendation
    
    console.log('点击推荐计划:', recommendation)
    
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/user_login/index' })
          }
        }
      })
      return
    }
    
    // 处理任务数据，将content字段映射为description字段
    let tasks = []
    if (recommendation.tasks && Array.isArray(recommendation.tasks)) {
      tasks = recommendation.tasks.map(task => ({
        day: task.day,
        title: task.title,
        typeIcon: task.typeIcon || '🧘',
        typeName: task.typeName || '疗愈练习',
        duration: task.duration || recommendation.duration || 15,
        description: task.content || task.description || '' // 映射content到description
      }))
    }
    
    console.log('处理后的任务列表:', tasks)
    
    // 构建完整的计划数据
    const planData = {
      name: recommendation.title,
      emoji: recommendation.icon,
      bgColor: recommendation.bgColor,
      totalDays: recommendation.days,
      duration: recommendation.duration,
      description: recommendation.description,
      reason: recommendation.reason,
      themes: recommendation.themes || [],
      tasks: tasks,
      source: 'recommendation'
    }

    console.log('跳转到计划编辑页面，数据:', planData)

    // 跳转到编辑页面让用户预览和修改
    wx.navigateTo({
      url: `/pages/plan-edit/index?isNewPlan=true&planData=${encodeURIComponent(JSON.stringify(planData))}`
    })
  },

  // 刷新推荐
  onRefreshRecommendations() {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo._id && !userInfo.userId)) {
      return
    }

    const userId = userInfo._id || userInfo.userId

    wx.showLoading({
      title: '刷新中...'
    })

    wx.cloud.callFunction({
      name: 'moodRecommendation',
      data: {
        action: 'refreshCache',
        userId: userId
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.success) {
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        })
        this.loadRecommendations()
      } else {
        wx.showToast({
          title: res.result.message || '刷新失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('刷新推荐失败:', err)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    })
  },

  // 测试AI推荐生成
  onTestAIGeneration() {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo._id && !userInfo.userId)) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const userId = userInfo._id || userInfo.userId

    wx.showLoading({
      title: '生成中...'
    })

    wx.cloud.callFunction({
      name: 'moodRecommendation',
      data: {
        action: 'forceGenerateAI',
        userId: userId
      }
    }).then(res => {
      wx.hideLoading()
      console.log('测试AI生成结果:', res)
      
      if (res.result.success) {
        wx.showToast({
          title: '生成成功',
          icon: 'success'
        })
        // 重新加载推荐
        setTimeout(() => {
          this.loadRecommendations()
        }, 1000)
      } else {
        wx.showToast({
          title: res.result.message || '生成失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('测试AI生成失败:', err)
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      })
    })
  }
})
