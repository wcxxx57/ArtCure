// 位置资源推荐：结合定位、POI 搜索入口与本地疗愈资源库
const { sampleResources } = require('../../utils/sampleResources.js')

Page({
  data: {
    city: '上海市',
    keyword: '绘画疗愈',
    locationStatus: '可手动输入城市，也可以授权定位后推荐附近资源',
    location: null,
    loading: false,
    aiReply: '',
    resources: [],
    pois: [],
    categoryOptions: [
      '绘画疗愈',
      '颂钵音疗',
      '冥想正念',
      '舞动疗愈',
      '心理咨询',
      '200元以内'
    ]
  },

  onLoad() {
    this.searchResources()
  },

  onClose() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/healing-hall/index' })
      }
    })
  },

  onCityInput(e) {
    this.setData({ city: e.detail.value })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onCategoryTap(e) {
    this.setData({ keyword: e.currentTarget.dataset.keyword }, () => {
      this.searchResources()
    })
  },

  useLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude
          },
          locationStatus: '已获得当前位置；当前 vivo POI 按城市和关键词搜索，结果可直接导航'
        })
        this.searchResources()
      },
      fail: () => {
        wx.showToast({
          title: '定位未开启，可手动选择城市',
          icon: 'none'
        })
        this.setData({
          locationStatus: '未获得定位，当前按城市和疗愈方式推荐'
        })
      }
    })
  },

  async searchResources() {
    const keyword = (this.data.keyword || '艺术疗愈').trim()
    const city = (this.data.city || '上海市').trim()
    const localResources = this.getLocalMatches(keyword, city)

    this.setData({
      loading: true,
      resources: localResources,
      aiReply: `先从本地疗愈资源库筛选「${keyword}」，再预留 vivo POI 搜索做附近地点补充。`,
      searchError: null,
      searchParams: null
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'resource.recommend',
          data: {
            city,
            keyword,
            location: this.data.location
          }
        }
      })

      const result = res.result || {}
      
      // 保存搜索参数
      this.setData({
        searchParams: result.searchParams
      })

      if (result.success) {
        this.setData({
          aiReply: result.reply || this.data.aiReply,
          pois: result.pois || [],
          loading: false,
          searchError: null
        })
      } else {
        // 搜索失败
        this.setData({
          aiReply: result.reply || '搜索失败',
          pois: [],
          loading: false,
          searchError: result.error
        })
      }
    } catch (err) {
      console.error('位置资源推荐失败:', err)
      this.setData({
        loading: false,
        pois: [],
        searchError: err.errMsg || err.message || '未知错误',
        searchParams: { city, keyword }
      })
    }
  },

  getLocalMatches(keyword, city) {
    const isBudget = keyword.includes('200') || keyword.includes('便宜') || keyword.includes('性价比')
    const normalizedKeyword = keyword.replace('200元以内', '').trim()
    const cityName = city.replace('市', '')

    const scored = sampleResources.map(resource => {
      const searchText = [
        resource.name,
        resource.description,
        resource.address_text,
        resource.district,
        ...(resource.tags || []),
        ...(resource.therapy_categories || []),
        ...(resource.feature_tags || []),
        ...(resource.mood_tags || [])
      ].join(' ')

      let score = 0
      if (!cityName || (resource.city || '').includes(cityName) || (resource.address_text || '').includes(cityName)) {
        score += 2
      }
      if (normalizedKeyword && searchText.includes(normalizedKeyword)) {
        score += 5
      }
      if (isBudget && Number(resource.price_min || 9999) <= 200) {
        score += 4
      }
      score += (resource.sort_weight || 0) / 100

      return {
        ...resource,
        score,
        mainCategory: (resource.therapy_categories && resource.therapy_categories[0]) || (resource.tags && resource.tags[0]) || '艺术疗愈',
        sourceText: (resource.source_platforms || []).join(' / '),
        distanceText: this.data.location ? '已授权定位' : resource.district || '同城资源'
      }
    })

    const matches = scored
      .filter(resource => resource.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    return matches.length ? matches : scored.sort((a, b) => b.score - a.score).slice(0, 4)
  },

  onOpenResource(e) {
    const resourceId = e.currentTarget.dataset.id
    const resource = this.data.resources.find(item => item._id === resourceId)
    if (!resource) return

    getApp().globalData = getApp().globalData || {}
    getApp().globalData.currentResource = resource
    wx.navigateTo({
      url: `/pages/resource-detail/index?id=${resource._id}`
    })
  },

  onCopyAddress(e) {
    const address = e.currentTarget.dataset.address
    if (!address) return

    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({
          title: '地址已复制',
          icon: 'success'
        })
      }
    })
  },

  onCopyWechat(e) {
    const wechat = e.currentTarget.dataset.wechat
    if (!wechat) return

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({
          title: '微信已复制',
          icon: 'success'
        })
      }
    })
  },

  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return

    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({
          title: '拨打失败',
          icon: 'none'
        })
      }
    })
  }
})
