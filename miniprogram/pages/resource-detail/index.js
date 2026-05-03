// resource-detail/index.js

Page({
  data: {
    resource: null,
    loading: true,
    currentImageIndex: 0,
    showContactSheet: false,
  },

  onLoad(options) {
    // 优先从globalData获取完整数据
    const app = getApp()
    const globalResource = app.globalData && app.globalData.currentResource
    if (globalResource) {
      this.setData({ resource: this.processResource(globalResource), loading: false })
      return
    }
    // 降级：从URL params解析（兼容旧方式）
    if (options.resource) {
      try {
        const resource = JSON.parse(decodeURIComponent(options.resource))
        this.setData({ resource: this.processResource(resource), loading: false })
      } catch (e) {
        console.error('解析资源数据失败:', e)
        this.setData({ loading: false })
      }
    } else {
      this.setData({ loading: false })
    }
  },

  // 处理资源数据，补充展示字段
  processResource(res) {
    const sourceLabels = {
      'xiaohongshu': '📕 小红书',
      'dianping': '⭐ 大众点评',
      'partner': '🤝 独家合作',
    }
    const levelLabels = {
      'certified': '✅ 持证认证',
      'experienced': '🏅 经验丰富',
      'emerging': '🌟 新锐疗愈师',
    }
    const platforms = (res.source_platforms || []).map(p => sourceLabels[p] || p)
    const levelText = levelLabels[res.certification_level] || ''
    const hasPhone = res.contact_info && res.contact_info.phone && res.contact_info.phone !== '无'
    const hasWechat = res.contact_info && res.contact_info.wechat && res.contact_info.wechat !== ''

    // 兼容处理疗愈师：优先用 therapists 数组，否则从单字段构建
    const therapists = res.therapists || (res.therapist_name ? [{
      name: res.therapist_name,
      intro: res.therapist_intro || '',
      certifications: res.certifications || [],
    }] : [])

    return {
      ...res,
      platformLabels: platforms,
      levelText,
      hasPhone,
      hasWechat,
      hasContact: hasPhone || hasWechat,
      displayRating: res.ratingNum > 0 ? String(res.ratingNum) : '',
      reviewText: res.review_count ? res.review_count + '条评价' : '',
      therapists,
    }
  },

  // 图片切换
  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current })
  },

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    const urls = this.data.resource.cover_images || []
    if (urls.length > 0) {
      wx.previewImage({ urls, current: url })
    }
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  // 复制微信号
  onCopyWeChat() {
    const wechat = this.data.resource.contact_info && this.data.resource.contact_info.wechat
    if (!wechat) return
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' })
    })
  },

  // 拨打电话
  onCallPhone() {
    const phone = this.data.resource.contact_info && this.data.resource.contact_info.phone
    if (!phone) return
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => wx.showToast({ title: '拨打失败', icon: 'none' })
    })
  },

  // 复制地址
  onCopyAddress() {
    const address = this.data.resource.address_text
    if (!address) return
    wx.setClipboardData({
      data: address,
      success: () => wx.showToast({ title: '地址已复制', icon: 'success' })
    })
  },

  // 在线咨询（独家合作商家）
  onChatConsult() {
    const res = this.data.resource
    if (res.is_exclusive_partner) {
      wx.navigateTo({
        url: `/pages/therapist-chat/index?resourceId=${res._id}&resourceName=${encodeURIComponent(res.name)}`
      })
    }
  },

  // 立即预约
  onBookNow() {
    const res = this.data.resource
    if (res.hasPhone) {
      this.onCallPhone()
    } else if (res.hasWechat) {
      this.onCopyWeChat()
    } else {
      wx.showToast({ title: '暂无联系方式', icon: 'none' })
    }
  },

  // 收藏
  onFavorite() {
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  // 分享
  onShareAppMessage() {
    const res = this.data.resource
    return {
      title: res ? res.name : '疗愈资源推荐',
      path: '/pages/resource-detail/index?id=' + (res ? res._id : ''),
    }
  },
})
