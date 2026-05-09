Page({
  data: {
    searchCity: '',
    searchKeyword: '',
    poiResults: [],
    total: 0,
    statusText: '',
    errorText: ''
  },

  onLoad(options) {
    const payload = wx.getStorageSync('poiSearchResultsPayload') || {}
    const queryCity = decodeURIComponent(options.city || '')
    const queryKeyword = decodeURIComponent(options.keyword || '')
    const canUsePayload = payload.city === queryCity && payload.keyword === queryKeyword
    const results = canUsePayload && Array.isArray(payload.results)
      ? this.normalizePoiResults(payload.results)
      : []

    this.setData({
      searchCity: queryCity,
      searchKeyword: queryKeyword,
      poiResults: results,
      total: canUsePayload ? Number(payload.total || 0) : 0,
      statusText: canUsePayload ? payload.statusText || '' : '',
      errorText: canUsePayload ? payload.errorText || '' : ''
    })
  },

  onShareAppMessage() {
    return {
      title: `「${this.data.searchCity} ${this.data.searchKeyword}」疗愈地点搜索结果`,
      path: `/pages/poi-search-results/index?city=${encodeURIComponent(this.data.searchCity)}&keyword=${encodeURIComponent(this.data.searchKeyword)}`
    }
  },

  onCopyAddress(e) {
    const address = e.currentTarget.dataset.address
    if (address) {
      wx.setClipboardData({
        data: address,
        success: () => wx.showToast({ title: '已复制地址', icon: 'success' })
      })
    }
  },

  onNavigateToLocation(e) {
    const item = e.currentTarget.dataset.item
    if (item.location) {
      const [lng, lat] = item.location.split(',')
      wx.openLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        name: item.name,
        address: item.address
      })
    }
  },

  onGoBack() {
    wx.navigateBack()
  },

  normalizePoiResults(pois) {
    return (Array.isArray(pois) ? pois : []).map(item => ({
      ...item,
      displayAddress: item.displayAddress || this.formatPoiAddress(item)
    }))
  },

  formatPoiAddress(item = {}) {
    const parts = []
    if (item.province) parts.push(item.province)
    if (item.city && item.city !== item.province) parts.push(item.city)
    if (item.district && item.district !== item.city) parts.push(item.district)
    if (item.address) parts.push(item.address)
    return parts.join(' ')
  }
})
