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
  },
  
  onShow() {
    this.checkLoginStatus()
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
    this.setData({
      selectedMood: mood.value
    })
    
    wx.showToast({
      title: `记录了「${mood.label}」的心情`,
      icon: 'none',
      duration: 2000
    })
    
    // TODO: 保存心情到云数据库
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
  }
})
