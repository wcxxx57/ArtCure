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
    const { city, keyword, results, total, statusText, errorText } = options
    
    this.setData({
      searchCity: decodeURIComponent(city || ''),
      searchKeyword: decodeURIComponent(keyword || ''),
      poiResults: results ? JSON.parse(decodeURIComponent(results)) : [],
      total: parseInt(total) || 0,
      statusText: decodeURIComponent(statusText || ''),
      errorText: decodeURIComponent(errorText || '')
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
  }
})
