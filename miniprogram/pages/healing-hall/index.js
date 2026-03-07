// healing-hall/index.js
const { sampleResources, FILTER_CONFIG } = require('../../utils/sampleResources.js')

// 类别对应的背景色和emoji
const CATEGORY_STYLE = {
  '绘画疗愈': { bg: '#FEE5E6', emoji: '🎨' },
  '音乐疗愈': { bg: '#E3F2FD', emoji: '🎵' },
  '颂钵音疗': { bg: '#FFF8E1', emoji: '🔔' },
  '舞动疗愈': { bg: '#E0F7FA', emoji: '💃' },
  '戏剧疗愈': { bg: '#EDE7F6', emoji: '🎭' },
  '冥想正念': { bg: '#E8F8F5', emoji: '🧘' },
  '芳香疗愈': { bg: '#FFF3E0', emoji: '🌿' },
  '塔罗占卜': { bg: '#F3E5F5', emoji: '🔮' },
  '瑜伽': { bg: '#E0F2F1', emoji: '🧘‍♀️' },
  '心理咨询': { bg: '#E8EAF6', emoji: '💬' },
}

const SOURCE_LABELS = {
  'xiaohongshu': '📕 小红书',
  'dianping': '⭐ 大众点评',
  'partner': '🤝 独家合作',
}

const LEVEL_LABELS = {
  'certified': '持证认证',
  'experienced': '经验丰富',
  'emerging': '新锐',
}

Page({
  data: {
    searchKeyword: '',
    loading: false,

    // 分类（横向滚动）
    categories: FILTER_CONFIG.categories,
    activeCategory: 'all',

    // 筛选状态
    filters: {
      priceRange: 'all',
      format: 'all',
      level: 'all',
      source: 'all',
      sortBy: 'recommended',
    },
    // 筛选面板
    showFilterPanel: false,
    activeFilterType: '', // 当前展开的筛选项
    filterOptions: FILTER_CONFIG,

    // 活跃的筛选标签（用于展示可移除的pills）
    activeFilterTags: [],

    // 数据
    allShops: [],
    filteredShops: [],
    displayShops: [], // 处理后用于展示

    // 筛选结果计数
    totalCount: 0,
  },

  onLoad() {
    this.initData()
  },

  onPullDownRefresh() {
    this.initData()
    wx.stopPullDownRefresh()
  },

  // 初始化数据 - 直接使用本地样例数据（云数据库schema不兼容新筛选）
  initData() {
    this.setData({ loading: true })
    this.loadLocalData()
  },

  // 加载本地样例数据
  loadLocalData() {
    const shops = this.enrichShopsData(sampleResources)
    this.setData({ allShops: shops, loading: false })
    this.applyFilters()
  },

  // 为数据添加展示用字段
  enrichShopsData(shops) {
    return shops.map(shop => {
      const cat = (shop.therapy_categories && shop.therapy_categories[0]) || (shop.tags && shop.tags[0]) || ''
      const style = CATEGORY_STYLE[cat] || { bg: '#F5F5F5', emoji: '✨' }
      // 来源展示
      const platforms = shop.source_platforms || []
      const sourceLabels = platforms.map(p => SOURCE_LABELS[p] || p).filter(Boolean)
      // 等级展示
      const levelLabel = LEVEL_LABELS[shop.certification_level] || ''
      // 封面图片
      const coverImage = (shop.cover_images && shop.cover_images.length > 0) ? shop.cover_images[0] : ''

      return {
        ...shop,
        bgColor: style.bg,
        emoji: style.emoji,
        coverImage,
        sourceLabels,
        levelLabel,
        displayRating: shop.ratingNum > 0 ? String(shop.ratingNum) : '',
        displayFormats: shop.formats || [],
        displayAddress: shop.address_text || '',
      }
    })
  },

  // ========== 筛选逻辑 ==========
  applyFilters() {
    const { allShops, activeCategory, filters, searchKeyword } = this.data
    let result = [...allShops]

    // 1. 搜索关键词
    if (searchKeyword && searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      result = result.filter(s => {
        const searchFields = [
          s.name, s.description, s.address_text, s.therapist_name,
          ...(s.tags || []), ...(s.therapy_categories || []),
          ...(s.feature_tags || []), ...(s.mood_tags || [])
        ]
        return searchFields.some(f => f && f.toLowerCase().includes(kw))
      })
    }

    // 2. 类别
    if (activeCategory !== 'all') {
      result = result.filter(s =>
        (s.therapy_categories && s.therapy_categories.includes(activeCategory)) ||
        (s.tags && s.tags.some(t => t.includes(activeCategory)))
      )
    }

    // 3. 价格区间
    if (filters.priceRange !== 'all') {
      result = result.filter(s => {
        if (filters.priceRange === 'free') return s.price_min === 0
        if (filters.priceRange === 'low') return s.price_min <= 200
        if (filters.priceRange === 'mid') return s.price_min >= 200 && s.price_min <= 500 || (s.price_max >= 200 && s.price_max <= 500)
        if (filters.priceRange === 'high') return s.price_min >= 500 && s.price_min <= 1000 || (s.price_max >= 500 && s.price_max <= 1000)
        if (filters.priceRange === 'premium') return s.price_max > 1000
        return true
      })
    }

    // 4. 形式
    if (filters.format !== 'all') {
      result = result.filter(s =>
        s.formats && s.formats.includes(filters.format)
      )
    }

    // 5. 专业等级
    if (filters.level !== 'all') {
      result = result.filter(s => s.certification_level === filters.level)
    }

    // 6. 来源
    if (filters.source !== 'all') {
      result = result.filter(s =>
        s.source_platforms && s.source_platforms.includes(filters.source)
      )
    }

    // 7. 排序
    switch (filters.sortBy) {
      case 'rating':
        result.sort((a, b) => (b.ratingNum || 0) - (a.ratingNum || 0))
        break
      case 'priceLow':
        result.sort((a, b) => (a.price_min || 0) - (b.price_min || 0))
        break
      case 'priceHigh':
        result.sort((a, b) => (b.price_max || 0) - (a.price_max || 0))
        break
      case 'popular':
        result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
        break
      default:
        result.sort((a, b) => (b.sort_weight || 0) - (a.sort_weight || 0))
    }

    // 构建活跃筛选标签
    const activeFilterTags = this.buildActiveFilterTags()

    this.setData({
      filteredShops: result,
      displayShops: result,
      totalCount: result.length,
      activeFilterTags,
    })
  },

  // 构建活跃筛选标签
  buildActiveFilterTags() {
    const { filters, filterOptions } = this.data
    const tags = []
    if (filters.priceRange !== 'all') {
      const opt = filterOptions.priceRanges.find(o => o.id === filters.priceRange)
      if (opt) tags.push({ key: 'priceRange', label: opt.label })
    }
    if (filters.format !== 'all') {
      const opt = filterOptions.formats.find(o => o.id === filters.format)
      if (opt) tags.push({ key: 'format', label: opt.label })
    }
    if (filters.level !== 'all') {
      const opt = filterOptions.levels.find(o => o.id === filters.level)
      if (opt) tags.push({ key: 'level', label: opt.label })
    }
    if (filters.source !== 'all') {
      const opt = filterOptions.sources.find(o => o.id === filters.source)
      if (opt) tags.push({ key: 'source', label: opt.label })
    }
    if (filters.sortBy !== 'recommended') {
      const opt = filterOptions.sortOptions.find(o => o.id === filters.sortBy)
      if (opt) tags.push({ key: 'sortBy', label: opt.label })
    }
    return tags
  },

  // ========== 事件处理 ==========

  // 搜索
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearchConfirm() {
    this.applyFilters()
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilters()
  },

  // 分类点击
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    if (this.data.activeCategory === category.id) return
    this.setData({ activeCategory: category.id })
    this.applyFilters()
  },

  // 筛选栏点击
  onFilterBarTap(e) {
    const type = e.currentTarget.dataset.type
    if (this.data.activeFilterType === type && this.data.showFilterPanel) {
      this.setData({ showFilterPanel: false, activeFilterType: '' })
    } else {
      this.setData({ showFilterPanel: true, activeFilterType: type })
    }
  },

  // 筛选选项点击
  onFilterOptionTap(e) {
    const { type, value } = e.currentTarget.dataset
    const filters = { ...this.data.filters }
    filters[type] = value
    this.setData({
      filters,
      showFilterPanel: false,
      activeFilterType: '',
    })
    this.applyFilters()
  },

  // 关闭筛选面板
  onCloseFilterPanel() {
    this.setData({ showFilterPanel: false, activeFilterType: '' })
  },

  // 移除筛选标签
  onRemoveFilterTag(e) {
    const key = e.currentTarget.dataset.key
    const filters = { ...this.data.filters }
    if (key === 'sortBy') {
      filters.sortBy = 'recommended'
    } else {
      filters[key] = 'all'
    }
    this.setData({ filters })
    this.applyFilters()
  },

  // 清除所有筛选
  onClearAllFilters() {
    this.setData({
      filters: {
        priceRange: 'all',
        format: 'all',
        level: 'all',
        source: 'all',
        sortBy: 'recommended',
      },
      activeCategory: 'all',
      searchKeyword: '',
    })
    this.applyFilters()
  },

  // AI资源顾问入口
  onAIAdvisorTap() {
    wx.navigateTo({ url: '/pages/healing-hall-ai-advisor/index' })
  },

  // 店铺卡片点击 -> 跳转详情页
  onShopTap(e) {
    const shop = e.currentTarget.dataset.shop
    getApp().globalData = getApp().globalData || {}
    getApp().globalData.currentResource = shop
    wx.navigateTo({
      url: '/pages/resource-detail/index?id=' + (shop._id || '')
    })
  },

  // 拨打电话
  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (phone && phone !== '无') {
      wx.makePhoneCall({
        phoneNumber: phone,
        fail: () => wx.showToast({ title: '拨打失败', icon: 'none' })
      })
    }
  },

  // 复制微信
  onCopyWechat(e) {
    const wechat = e.currentTarget.dataset.wechat
    if (wechat) {
      wx.setClipboardData({
        data: wechat,
        success: () => wx.showToast({ title: '已复制微信号', icon: 'success' })
      })
    }
  },
})
