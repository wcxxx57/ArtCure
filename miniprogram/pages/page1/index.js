// index.js
Page({
  data: {
    // 功能列表数据
    featureList: [
      { id: 1, name: '呼吸放松训练', icon: '/miniprogram/images/icons/home.png', bgColor: '#FFE5F0', page: '/pages/breathing/index' },
      { id: 2, name: '心理评估', icon: '/miniprogram/images/icons/examples.png', bgColor: '#E6F3FF', page: '/pages/assessment/index' },
      { id: 3, name: 'VR沉浸疗愈体验', icon: '/miniprogram/images/icons/goods.png', bgColor: '#FFF8DC', page: '/pages/vr/index' },
      { id: 4, name: '脑波分析', icon: '/miniprogram/images/icons/business.png', bgColor: '#E8F8F5', page: '/pages/brainwave/index' },
      { id: 5, name: '身心疗愈实验', icon: '/miniprogram/images/icons/usercenter.png', bgColor: '#F0E6FF', page: '/pages/experiment/index' },
      { id: 6, name: '心理辅导', icon: '/miniprogram/images/icons/home.png', bgColor: '#FFE6E6', page: '/pages/counseling/index' },
      { id: 7, name: '冥想疗愈', icon: '/miniprogram/images/icons/examples.png', bgColor: '#E6FFE6', page: '/pages/meditation/index' },
      { id: 8, name: '呼吸训练营', icon: '/miniprogram/images/icons/goods.png', bgColor: '#FFF0E6', page: '/pages/training/index' }
    ]
  },

  onLoad(options) {
    
  },

  // 搜索栏点击事件
  onSearchTap() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 功能图标点击事件
  onFeatureTap(e) {
    const page = e.currentTarget.dataset.page
    wx.navigateTo({
      url: page,
      fail: (err) => {
        wx.showToast({
          title: '页面暂未开放',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // AI咨询区域点击事件
  onAITap() {
    wx.showToast({
      title: 'AI咨询功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 用户头像点击事件
  onUserAvatarTap() {
    wx.switchTab({
      url: '/pages/profile/index'
    })
  }
})
