// 创造分析：用户可选择画板创作或上传图片，由 AI 返回两段式疗愈观察。

const ANALYSIS_TITLES = {
  mood_observation: '情绪观察',
  practice_suggestions: '练习建议'
}

Page({
  data: {
    inputMode: 'canvas',
    inputModes: [
      { id: 'canvas', label: '画板创作', desc: '直接涂画' },
      { id: 'upload', label: '上传图片', desc: '相册或拍照' }
    ],
    canvasWidth: 320,
    canvasHeight: 240,
    brushColor: '#4A90E2',
    brushSize: 6,
    hasDrawing: false,
    uploadedImage: '',
    imageFileID: '',
    userNote: '',
    isAnalyzing: false,
    analysisItems: [],
    analysisSource: '',
    analysisError: '',
    colorOptions: ['#4A90E2', '#F28C8C', '#7BC6A4', '#F2C94C', '#7E57C2', '#263238'],
    sizeOptions: [4, 6, 10, 14],
    exercisePrompts: [
      '我画的是今天的压力',
      '我想表达一种说不出的难过',
      '这是一幅随手涂鸦',
      '请给我一个5分钟练习'
    ]
  },

  onReady() {
    const windowInfo = wx.getWindowInfo()
    const canvasWidth = Math.max(300, windowInfo.windowWidth - 32)
    const canvasHeight = Math.round(canvasWidth * 0.72)

    this.setData({ canvasWidth, canvasHeight }, () => {
      this.canvasContext = wx.createCanvasContext('healingCanvas', this)
      this.resetCanvas()
    })
  },

  onClose() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/page1/index' })
      }
    })
  },

  switchInputMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.inputMode || this.data.isAnalyzing) return

    this.setData({
      inputMode: mode,
      analysisItems: [],
      analysisError: '',
      analysisSource: ''
    })
  },

  resetCanvas() {
    const ctx = wx.createCanvasContext('healingCanvas', this)
    ctx.setFillStyle('#fffdf8')
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    ctx.draw()
    this.canvasContext = ctx
    this.lastPoint = null
    this.setData({
      hasDrawing: false,
      analysisItems: [],
      analysisError: '',
      analysisSource: ''
    })
  },

  onCanvasStart(e) {
    const point = e.touches && e.touches[0]
    if (!point || this.data.inputMode !== 'canvas') return

    const ctx = this.canvasContext || wx.createCanvasContext('healingCanvas', this)
    ctx.setStrokeStyle(this.data.brushColor)
    ctx.setLineWidth(this.data.brushSize)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    this.lastPoint = { x: point.x, y: point.y }
    this.canvasContext = ctx
  },

  onCanvasMove(e) {
    const point = e.touches && e.touches[0]
    if (!point || !this.canvasContext || !this.lastPoint || this.data.inputMode !== 'canvas') return

    this.canvasContext.lineTo(point.x, point.y)
    this.canvasContext.stroke()
    this.canvasContext.draw(true)
    this.lastPoint = { x: point.x, y: point.y }
    if (!this.data.hasDrawing) {
      this.setData({ hasDrawing: true, analysisItems: [], analysisError: '' })
    }
  },

  onCanvasEnd() {
    this.lastPoint = null
  },

  onColorTap(e) {
    this.setData({ brushColor: e.currentTarget.dataset.color })
  },

  onSizeTap(e) {
    this.setData({ brushSize: Number(e.currentTarget.dataset.size) })
  },

  onNoteInput(e) {
    this.setData({ userNote: e.detail.value })
  },

  onPromptTap(e) {
    this.setData({ userNote: e.currentTarget.dataset.prompt })
  },

  chooseImage() {
    if (this.data.isAnalyzing) return

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return

        this.setData({
          uploadedImage: file.tempFilePath,
          imageFileID: '',
          analysisItems: [],
          analysisError: '',
          analysisSource: ''
        })
      }
    })
  },

  clearUploadedImage() {
    if (this.data.isAnalyzing) return

    this.setData({
      uploadedImage: '',
      imageFileID: '',
      analysisItems: [],
      analysisError: '',
      analysisSource: ''
    })
  },

  analyzeCurrentWork() {
    if (this.data.isAnalyzing) return

    if (this.data.inputMode === 'upload') {
      if (!this.data.uploadedImage) {
        this.showInputToast('请先选择一张图片')
        return
      }
      this.uploadAndAnalyze(this.data.uploadedImage, 'upload')
      return
    }

    if (!this.data.hasDrawing) {
      this.showInputToast('请先在画板上画几笔')
      return
    }

    this.setData({ isAnalyzing: true, analysisError: '', analysisItems: [] })
    wx.canvasToTempFilePath({
      canvasId: 'healingCanvas',
      fileType: 'jpg',
      quality: 0.76,
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePath, 'canvas')
      },
      fail: (err) => {
        console.error('画布导出失败:', err)
        this.setData({
          isAnalyzing: false,
          analysisError: '画板图片生成失败，请重试。'
        })
      }
    }, this)
  },

  showInputToast(title) {
    wx.showToast({
      title,
      icon: 'none'
    })
  },

  async uploadAndAnalyze(filePath, sourceType) {
    this.setData({
      isAnalyzing: true,
      analysisItems: [],
      analysisError: '',
      analysisSource: ''
    })

    try {
      const analysisFilePath = await this.compressImageForAnalysis(filePath)
      const ext = this.inferFileExt(analysisFilePath)
      const cloudPath = `artwork-analysis/${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: analysisFilePath
      })

      this.setData({ imageFileID: uploadRes.fileID })
      await this.callAnalyzeGateway(uploadRes.fileID, sourceType)
    } catch (err) {
      console.error('图片上传或分析失败:', err)
      this.setData({
        isAnalyzing: false,
        analysisItems: [],
        analysisSource: '',
        analysisError: this.formatErrorMessage('图片上传或 AI 分析失败', err)
      })
    }
  },

  inferFileExt(filePath) {
    const match = String(filePath || '').match(/\.([a-zA-Z0-9]+)(\?|$)/)
    const ext = match ? match[1].toLowerCase() : 'jpg'
    return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
  },

  compressImageForAnalysis(filePath) {
    return new Promise((resolve) => {
      wx.compressImage({
        src: filePath,
        quality: 72,
        success: (res) => resolve(res.tempFilePath || filePath),
        fail: () => resolve(filePath)
      })
    })
  },

  async callAnalyzeGateway(fileID, sourceType) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'artwork.analyze',
          data: {
            fileID,
            prompt: this.data.userNote,
            sourceType,
            expectedSchema: 'mood_practice_array_v1'
          }
        }
      })

      const result = res.result || {}
      if (result.success === false) {
        throw new Error(result.message || result.code || '云函数返回失败')
      }

      const analysisItems = this.normalizeAnalysisResult(result.result)

      if (!analysisItems.length) {
        throw new Error(result.rawText ? `AI 未返回有效数组：${result.rawText}` : 'AI 未返回有效分析')
      }

      this.setData({
        analysisItems,
        analysisSource: result.source || '',
        analysisError: '',
        isAnalyzing: false
      })
    } catch (err) {
      console.error('AI 创作分析失败:', err)
      this.setData({
        analysisItems: [],
        analysisSource: '',
        analysisError: this.formatErrorMessage('真实 AI 分析失败', err),
        isAnalyzing: false
      })
    }
  },

  formatErrorMessage(prefix, err) {
    const message = err && (err.message || err.errMsg || err.toString && err.toString())
      ? (err.message || err.errMsg || err.toString())
      : '未知错误'
    return `${prefix}：${message}`
  },

  normalizeAnalysisResult(result) {
    const rawItems = Array.isArray(result) ? result : []
    const keys = ['mood_observation', 'practice_suggestions']

    return rawItems
      .map((item, index) => {
        if (typeof item === 'string') {
          const key = keys[index] || `item_${index}`
          return {
            key,
            title: ANALYSIS_TITLES[key] || 'AI 反馈',
            text: item.trim()
          }
        }

        if (item && typeof item === 'object') {
          const key = item.key || keys[index] || `item_${index}`
          const text = item.text || item[key] || ''
          return {
            key,
            title: item.title || ANALYSIS_TITLES[key] || 'AI 反馈',
            text: String(text).trim()
          }
        }

        return null
      })
      .filter(item => item && item.text)
      .slice(0, 2)
  }
})
