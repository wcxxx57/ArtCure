// healing-hall/index.js
Page({
  data: {
    searchKeyword: '',
    activeCategory: 'all',
    
    // 分类列表
    categories: [
      { id: 'all', name: '全部' },
      { id: 'music', name: '音乐' },
      { id: 'paint', name: '绘画' },
      { id: 'meditation', name: '冥想' },
      { id: 'craft', name: '非遗' },
      { id: 'reading', name: '阅读' }
    ],
    
    // 疗愈资源列表
    resources: [
      { id: 1, title: '雨声与大提琴', category: '音乐疗愈', emoji: '🎵', bgColor: '#E3F2FD', views: '12k', type: 'music' },
      { id: 2, title: '曼陀罗填色', category: '绘画疗愈', emoji: '🎨', bgColor: '#FEE5E6', views: '8k', type: 'paint' },
      { id: 3, title: '掐丝珐琅体验', category: '非遗手作', emoji: '🏺', bgColor: '#FFF8DC', views: '5k', type: 'craft' },
      { id: 4, title: '5分钟正念呼吸', category: '冥想', emoji: '🧘', bgColor: '#E8F8F5', views: '20k', type: 'meditation' },
      { id: 5, title: '治愈系钢琴曲', category: '音乐疗愈', emoji: '🎹', bgColor: '#F3E5F5', views: '15k', type: 'music' },
      { id: 6, title: '水彩花卉绘制', category: '绘画疗愈', emoji: '🌸', bgColor: '#FFEBEE', views: '6k', type: 'paint' }
    ],
    
    // 线下沙龙
    salons: [
      { id: 1, city: '上海', title: '周六绘画疗愈沙龙', date: '1/25', time: '14:00', seats: 5 },
      { id: 2, city: '北京', title: '正念冥想工作坊', date: '1/26', time: '10:00', seats: 8 }
    ]
  },

  onLoad(options) {
    this.loadResources()
  },
  
  // 加载资源数据（后续可接入云数据库）
  loadResources() {
    // TODO: 从云数据库加载数据
    // wx.cloud.callFunction({
    //   name: 'resource',
    //   data: { action: 'list' }
    // })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    // TODO: 实现搜索逻辑
  },
  
  // 分类点击
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category.id
    })
    // TODO: 筛选资源
  },
  
  // 精选视频点击
  onFeaturedTap() {
    wx.showToast({
      title: '视频播放功能开发中',
      icon: 'none'
    })
  },
  
  // 资源卡片点击
  onResourceTap(e) {
    const resource = e.currentTarget.dataset.resource
    wx.showToast({
      title: `即将体验「${resource.title}」`,
      icon: 'none'
    })
    // TODO: 跳转到资源详情页
    // wx.navigateTo({
    //   url: `/pages/resource-detail/index?id=${resource.id}`
    // })
  },
  
  // 沙龙点击
  onSalonTap(e) {
    const salon = e.currentTarget.dataset.salon
    wx.showToast({
      title: `即将预约「${salon.title}」`,
      icon: 'none'
    })
  }
})
