// plan-custom/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    // 表单数据
    planName: '',
    selectedDays: 7,
    selectedDuration: 15,
    selectedThemes: [],
    requirement: '',
    
    // 选项
    daysOptions: [7, 14, 21, 30],
    durationOptions: [10, 15, 20, 30],
    themeOptions: [
      { id: 1, name: '焦虑缓解', selected: false },
      { id: 2, name: '睡眠改善', selected: false },
      { id: 3, name: '情绪管理', selected: false },
      { id: 4, name: '压力释放', selected: false },
      { id: 5, name: '正念冥想', selected: false },
      { id: 6, name: '自我成长', selected: false }
    ],
    
    // 状态
    isGenerating: false
  },

  onLoad(options) {
    // 检查登录状态
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
    }
  },

  // 计划名称输入
  onPlanNameInput(e) {
    this.setData({
      planName: e.detail.value
    })
  },

  // 选择天数
  onDaysSelect(e) {
    const days = e.currentTarget.dataset.days
    this.setData({
      selectedDays: days
    })
  },

  // 选择时长
  onDurationSelect(e) {
    const duration = e.currentTarget.dataset.duration
    this.setData({
      selectedDuration: duration
    })
  },

  // 选择主题
  onThemeToggle(e) {
    const index = e.currentTarget.dataset.index
    const themeOptions = this.data.themeOptions
    themeOptions[index].selected = !themeOptions[index].selected
    
    // 更新选中的主题列表
    const selectedThemes = themeOptions
      .filter(theme => theme.selected)
      .map(theme => theme.name)
    
    this.setData({
      themeOptions,
      selectedThemes
    })
  },

  // 需求输入
  onRequirementInput(e) {
    this.setData({
      requirement: e.detail.value
    })
  },

  // 生成计划
  onGeneratePlan() {
    const { planName, selectedDays, selectedDuration, selectedThemes, requirement } = this.data

    // 验证输入
    if (!planName || planName.trim() === '') {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      })
      return
    }

    if (!requirement || requirement.trim() === '') {
      wx.showToast({
        title: '请描述您的需求',
        icon: 'none'
      })
      return
    }

    if (requirement.length < 10) {
      wx.showToast({
        title: '需求描述至少10个字',
        icon: 'none'
      })
      return
    }

    // 开始生成
    this.setData({ isGenerating: true })

    wx.showLoading({
      title: 'AI生成中...',
      mask: true
    })

    // 调用云函数生成计划
    wx.cloud.callFunction({
      name: 'planGenerator',
      data: {
        action: 'generatePlan',
        planName: planName.trim(),
        totalDays: selectedDays,
        dailyDuration: selectedDuration,
        themes: selectedThemes,
        requirement: requirement.trim()
      }
    }).then(res => {
      wx.hideLoading()
      console.log('AI生成结果:', res)

      if (res.result.code === 0) {
        // 生成成功，跳转到编辑页面
        const plan = res.result.data
        
        wx.showToast({
          title: '生成成功',
          icon: 'success',
          duration: 1500
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/plan-edit/index?isNewPlan=true&planData=${encodeURIComponent(JSON.stringify(plan))}`
          })
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || 'AI生成失败',
          icon: 'none',
          duration: 3000
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('调用云函数失败:', err)
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none',
        duration: 3000
      })
    }).finally(() => {
      this.setData({ isGenerating: false })
    })
  },

  // 返回
  onBack() {
    wx.navigateBack()
  }
})
