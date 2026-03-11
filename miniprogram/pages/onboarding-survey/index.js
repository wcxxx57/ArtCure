// pages/onboarding-survey/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    currentStep: 1,
    totalSteps: 3,
    
    // 用户选择
    selectedArtForms: [],
    selectedHelpNeeds: [],
    selectedFormats: [],
    
    // 第一步：艺术形式选项
    artFormOptions: [
      { id: 'painting', name: '绘画创作', emoji: '🎨', desc: '涂鸦、水彩、曼陀罗等' },
      { id: 'music', name: '音乐疗愈', emoji: '🎵', desc: '聆听、演奏、唱歌' },
      { id: 'writing', name: '文字表达', emoji: '📖', desc: '写作、诗歌、日记' },
      { id: 'drama', name: '戏剧表演', emoji: '🎭', desc: '角色扮演、即兴表演' },
      { id: 'dance', name: '舞蹈律动', emoji: '💃', desc: '自由舞动、舞蹈疗愈' },
      { id: 'meditation', name: '冥想正念', emoji: '🧘', desc: '呼吸练习、身体扫描' },
      { id: 'video', name: '影像艺术', emoji: '🎬', desc: '观影、摄影、视频创作' },
      { id: 'handcraft', name: '手工制作', emoji: '✋', desc: '陶艺、编织、折纸' }
    ],
    
    // 第二步：期望帮助选项
    helpNeedOptions: [
      { id: 'relaxation', name: '纯粹放松', emoji: '😌', desc: '没有特定困扰，想要放松身心' },
      { id: 'anxiety', name: '缓解焦虑', emoji: '😰', desc: '减轻紧张、担忧、不安情绪' },
      { id: 'mood', name: '改善情绪', emoji: '😔', desc: '走出低落、抑郁状态' },
      { id: 'sleep', name: '改善睡眠', emoji: '🌙', desc: '缓解失眠、提升睡眠质量' },
      { id: 'confidence', name: '增强自信', emoji: '💪', desc: '提升自我价值感和自信心' },
      { id: 'stress', name: '减轻压力', emoji: '🧠', desc: '应对工作、学习、生活压力' },
      { id: 'expression', name: '情绪表达', emoji: '💭', desc: '学会识别和表达情绪' },
      { id: 'exploration', name: '自我探索', emoji: '🌱', desc: '更好地了解自己' },
      { id: 'social', name: '社交支持', emoji: '🤝', desc: '希望与他人连接和交流' }
    ],
    
    // 第三步：活动形式选项
    formatOptions: [
      { id: 'home', name: '独自在家体验', emoji: '🏠', desc: '按照指引自己完成，时间灵活' },
      { id: 'online', name: '线上课程/视频', emoji: '📱', desc: '观看教学视频，跟随练习' },
      { id: 'offline', name: '线下沙龙/工作坊', emoji: '👥', desc: '与他人一起参与，有专业指导' },
      { id: 'oneOnOne', name: '一对一指导', emoji: '💬', desc: '获得个性化的专业支持' }
    ]
  },

  onLoad(options) {
    // 检查是否已登录
    if (!AuthService.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/user_login/index'
      })
    }
  },

  // 选择艺术形式
  onArtFormTap(e) {
    const { id } = e.currentTarget.dataset
    let selected = [...this.data.selectedArtForms]
    let options = this.data.artFormOptions.map(opt => ({...opt}))
    
    const index = selected.indexOf(id)
    if (index > -1) {
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }
    
    // 更新选项的selected状态
    options.forEach(opt => {
      opt.selected = selected.indexOf(opt.id) > -1
    })
    
    this.setData({ 
      selectedArtForms: selected,
      artFormOptions: options
    })
  },

  // 选择帮助需求
  onHelpNeedTap(e) {
    const { id } = e.currentTarget.dataset
    let selected = [...this.data.selectedHelpNeeds]
    let options = this.data.helpNeedOptions.map(opt => ({...opt}))
    
    const index = selected.indexOf(id)
    if (index > -1) {
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }
    
    // 更新选项的selected状态
    options.forEach(opt => {
      opt.selected = selected.indexOf(opt.id) > -1
    })
    
    this.setData({ 
      selectedHelpNeeds: selected,
      helpNeedOptions: options
    })
  },

  // 选择活动形式
  onFormatTap(e) {
    const { id } = e.currentTarget.dataset
    let selected = [...this.data.selectedFormats]
    let options = this.data.formatOptions.map(opt => ({...opt}))
    
    const index = selected.indexOf(id)
    if (index > -1) {
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }
    
    // 更新选项的selected状态
    options.forEach(opt => {
      opt.selected = selected.indexOf(opt.id) > -1
    })
    
    this.setData({ 
      selectedFormats: selected,
      formatOptions: options
    })
  },

  // 下一步
  onNextStep() {
    const { currentStep, selectedArtForms, selectedHelpNeeds } = this.data
    
    // 验证当前步骤
    if (currentStep === 1 && selectedArtForms.length === 0) {
      wx.showToast({
        title: '请至少选择一项艺术形式',
        icon: 'none'
      })
      return
    }
    
    if (currentStep === 2 && selectedHelpNeeds.length === 0) {
      wx.showToast({
        title: '请至少选择一项帮助需求',
        icon: 'none'
      })
      return
    }
    
    // 进入下一步
    if (currentStep < this.data.totalSteps) {
      this.setData({
        currentStep: currentStep + 1
      })
    }
  },

  // 上一步
  onPrevStep() {
    const { currentStep } = this.data
    if (currentStep > 1) {
      this.setData({
        currentStep: currentStep - 1
      })
    }
  },

  // 提交问卷
  onSubmit() {
    const { selectedArtForms, selectedHelpNeeds, selectedFormats } = this.data
    
    // 验证第三步
    if (selectedFormats.length === 0) {
      wx.showToast({
        title: '请至少选择一种活动形式',
        icon: 'none'
      })
      return
    }
    
    const userInfo = AuthService.getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '用户信息获取失败',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '提交中...'
    })
    
    // 调用云函数保存偏好
    wx.cloud.callFunction({
      name: 'userPreferences',
      data: {
        action: 'savePreferences',
        userId: userInfo._id || userInfo.userId,
        preferences: {
          artForms: selectedArtForms,
          helpNeeds: selectedHelpNeeds,
          activityFormats: selectedFormats
        }
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.success) {
        // 更新本地用户信息
        const updatedUserInfo = {
          ...userInfo,
          hasCompletedSurvey: true
        }
        AuthService.updateUserInfo(updatedUserInfo)
        
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        })
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/page1/index'
          })
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '提交失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('提交问卷失败:', err)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    })
  },

  // 跳过问卷
  onSkip() {
    wx.showModal({
      title: '确认跳过',
      content: '跳过后可以在个人中心随时填写偏好',
      confirmText: '确认跳过',
      cancelText: '继续填写',
      success: (res) => {
        if (res.confirm) {
          // 用户确认跳过
          const userInfo = AuthService.getUserInfo()
          if (userInfo) {
            // 标记为已跳过（但不是已完成）
            const updatedUserInfo = {
              ...userInfo,
              hasCompletedSurvey: true, // 设为true避免重复弹出
              surveySkipped: true
            }
            AuthService.updateUserInfo(updatedUserInfo)
          }
          
          // 跳转到首页
          wx.switchTab({
            url: '/pages/page1/index'
          })
        }
      }
    })
  }
})
