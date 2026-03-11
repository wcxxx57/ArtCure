// index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    // 问候语
    greeting: '早安',
    
    // 用户头像 - 默认头像
    userAvatar: '/images/avatar.png',
    isLoggedIn: false,
    
    // 心情打卡
    moodStreak: 3,
    selectedMood: null,
    moodList: [
      { value: 5, emoji: '😄', label: '开心' },
      { value: 4, emoji: '😊', label: '平静' },
      { value: 3, emoji: '😐', label: '一般' },
      { value: 2, emoji: '😔', label: '低落' },
      { value: 1, emoji: '😰', label: '焦虑' }
    ],
    
    // 每日心理语录
    dailyQuote: '接纳当下的自己，是疗愈的第一步。',
    quotes: [
      '接纳当下的自己，是疗愈的第一步。',
      '艺术不是为了完美，而是为了表达。',
      '就像云朵不会在此刻停留，情绪也会随风而去。',
      '今天的你，已经做得很好了。',
      '每一次呼吸，都是新的开始。'
    ],
    
    // 快捷功能
    quickFeatures: [
      { id: 1, name: '呼吸练习', emoji: '🌬️', bgColor: '#E3F2FD', page: '/pages/breathing/index' },
      { id: 2, name: '冥想音乐', emoji: '🎵', bgColor: '#FEE5E6', page: '/pages/meditation/index' },
      { id: 3, name: '曼陀罗', emoji: '🎨', bgColor: '#FFF8DC', page: '/pages/mandala/index' },
      { id: 4, name: '心情日记', emoji: '📝', bgColor: '#E8F8F5', page: '/pages/diary/index' }
    ]
  },

  onLoad(options) {
    this.setGreeting()
    this.setRandomQuote()
    this.checkLoginStatus()
    this.loadTodayMood()
    this.loadMoodStreak()
  },
  
  onShow() {
    this.checkLoginStatus()
    this.loadTodayMood()
  },

  // 设置问候语
  setGreeting() {
    const hour = new Date().getHours()
    let greeting = '你好'
    
    if (hour >= 5 && hour < 12) {
      greeting = '早安'
    } else if (hour >= 12 && hour < 14) {
      greeting = '午安'
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好'
    } else {
      greeting = '夜深了'
    }
    
    this.setData({ greeting })
  },
  
  // 设置随机语录
  setRandomQuote() {
    const { quotes } = this.data
    const randomIndex = Math.floor(Math.random() * quotes.length)
    this.setData({
      dailyQuote: quotes[randomIndex]
    })
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = AuthService.isLoggedIn()
    if (isLoggedIn) {
      const userInfo = AuthService.getUserInfo()
      if (userInfo && userInfo.avatar) {
        this.setData({
          userAvatar: userInfo.avatar,
          isLoggedIn: true
        })
      } else {
        this.setData({
          isLoggedIn: true
        })
      }
    } else {
      // 未登录时恢复默认头像
      this.setData({
        userAvatar: '/images/avatar.png',
        isLoggedIn: false
      })
    }
  },

  // 用户头像点击事件
  onUserAvatarTap() {
    wx.switchTab({
      url: '/pages/profile/index'
    })
  },
  
  // 虚拟形象点击
  onAvatarTap() {
    this.openAIChat()
  },
  
  // 心情选择
  onMoodSelect(e) {
    const mood = e.currentTarget.dataset.mood
    
    // 检查是否已登录
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后记录心情',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/user_login/index'
            })
          }
        }
      })
      return
    }

    this.setData({
      selectedMood: mood.value
    })
    
    // 保存心情到云数据库
    this.saveMoodRecord(mood)
  },

  // 保存心情记录
  saveMoodRecord(mood) {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo.userId && !userInfo._id)) {
      wx.showToast({
        title: '用户信息异常',
        icon: 'none'
      })
      return
    }

    // 使用 _id 或 userId，优先使用 _id
    const userId = userInfo._id || userInfo.userId

    wx.showLoading({
      title: '记录中...'
    })

    wx.cloud.callFunction({
      name: 'moodTracking',
      data: {
        action: 'saveMood',
        userId: userId,
        moodValue: mood.value,
        moodLabel: mood.label,
        moodEmoji: mood.emoji
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.success) {
        const message = res.result.isUpdate ? '心情更新成功' : '心情记录成功'
        wx.showToast({
          title: message,
          icon: 'success',
          duration: 2000
        })
        
        // 重新加载连续打卡天数
        this.loadMoodStreak()
        
        // 触发AI推荐生成（后台异步执行，不阻塞用户）
        this.triggerAIRecommendation(userId, mood)
      } else {
        wx.showToast({
          title: res.result.message || '记录失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('保存心情失败:', err)
      wx.showToast({
        title: '记录失败，请重试',
        icon: 'none'
      })
    })
  },

  // 加载今日心情
  loadTodayMood() {
    if (!AuthService.isLoggedIn()) {
      return
    }

    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo.userId && !userInfo._id)) {
      return
    }

    // 使用 _id 或 userId，优先使用 _id
    const userId = userInfo._id || userInfo.userId

    wx.cloud.callFunction({
      name: 'moodTracking',
      data: {
        action: 'getTodayMood',
        userId: userId
      }
    }).then(res => {
      if (res.result.success && res.result.hasMood) {
        this.setData({
          selectedMood: res.result.mood.moodValue
        })
      }
    }).catch(err => {
      console.error('获取今日心情失败:', err)
    })
  },

  // 加载连续打卡天数
  loadMoodStreak() {
    if (!AuthService.isLoggedIn()) {
      this.setData({ moodStreak: 0 })
      return
    }

    const userInfo = AuthService.getUserInfo()
    if (!userInfo || (!userInfo.userId && !userInfo._id)) {
      return
    }

    // 使用 _id 或 userId，优先使用 _id
    const userId = userInfo._id || userInfo.userId

    wx.cloud.callFunction({
      name: 'moodTracking',
      data: {
        action: 'getStreak',
        userId: userId
      }
    }).then(res => {
      if (res.result.success) {
        this.setData({
          moodStreak: res.result.streak
        })
      }
    }).catch(err => {
      console.error('获取连续打卡天数失败:', err)
    })
  },
  
  // 快捷功能点击
  onQuickTap(e) {
    const feature = e.currentTarget.dataset.feature
    wx.navigateTo({
      url: feature.page,
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // AI咨询点击
  onAITap() {
    this.openAIChat()
  },
  
  // 打开 AI 对话
  openAIChat() {
    wx.navigateTo({
      url: '/pages/ai-chat/index',
      fail: (err) => {
        console.error('跳转AI对话页面失败:', err)
        wx.showToast({
          title: 'AI对话功能暂不可用',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 触发AI推荐生成（后台异步执行）
  triggerAIRecommendation(userId, moodData) {
    console.log('触发AI推荐生成，用户ID:', userId, '心情数据:', moodData)
    
    // 后台异步调用，不阻塞用户操作
    wx.cloud.callFunction({
      name: 'moodRecommendation',
      data: {
        action: 'generateAI',
        userId: userId,
        moodData: {
          moodValue: moodData.value,
          moodLabel: moodData.label,
          moodEmoji: moodData.emoji
        }
      }
    }).then(res => {
      console.log('AI推荐生成结果:', res)
      if (res.result && res.result.success) {
        console.log('AI推荐生成成功，来源:', res.result.source)
      } else {
        console.log('AI推荐生成失败或跳过:', res.result)
      }
    }).catch(err => {
      console.error('触发AI推荐失败:', err)
      // 静默失败，不影响用户体验
    })
  }
})
