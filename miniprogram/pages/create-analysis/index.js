// 创造分析：在线白板绘画或上传图片，让 AI 做非诊断式艺术疗愈分析

Page({
  data: {
    canvasWidth: 320,
    canvasHeight: 240,
    brushColor: '#4A90E2',
    brushSize: 6,
    hasDrawing: false,
    uploadedImage: '',
    imageFileID: '',
    userNote: '',
    isAnalyzing: false,
    analysis: null,
    colorOptions: ['#4A90E2', '#F28C8C', '#7BC6A4', '#F2C94C', '#7E57C2', '#263238'],
    sizeOptions: [4, 6, 10, 14],
    exercisePrompts: [
      '我画的是今天的压力',
      '我想表达一种说不出的难过',
      '这是一幅随手涂鸦',
      '我想让 AI 给我下一笔建议'
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

  resetCanvas() {
    const ctx = wx.createCanvasContext('healingCanvas', this)
    ctx.setFillStyle('#fffdf8')
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
    ctx.draw()
    this.canvasContext = ctx
    this.lastPoint = null
    this.setData({ hasDrawing: false })
  },

  onCanvasStart(e) {
    const point = e.touches && e.touches[0]
    if (!point) return

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
    if (!point || !this.canvasContext || !this.lastPoint) return

    this.canvasContext.lineTo(point.x, point.y)
    this.canvasContext.stroke()
    this.canvasContext.draw(true)
    this.lastPoint = { x: point.x, y: point.y }
    if (!this.data.hasDrawing) {
      this.setData({ hasDrawing: true })
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
          analysis: null
        })
      }
    })
  },

  clearUploadedImage() {
    this.setData({
      uploadedImage: '',
      imageFileID: ''
    })
  },

  analyzeCurrentWork() {
    if (this.data.uploadedImage) {
      this.uploadAndAnalyze(this.data.uploadedImage)
      return
    }

    if (!this.data.hasDrawing) {
      wx.showToast({
        title: '先画几笔或上传图片',
        icon: 'none'
      })
      return
    }

    wx.canvasToTempFilePath({
      canvasId: 'healingCanvas',
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePath)
      },
      fail: (err) => {
        console.error('画布导出失败:', err)
        this.callAnalyzeGateway('')
      }
    }, this)
  },

  async uploadAndAnalyze(filePath) {
    this.setData({ isAnalyzing: true })

    try {
      const cloudPath = `artwork-analysis/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      this.setData({ imageFileID: uploadRes.fileID })
      await this.callAnalyzeGateway(uploadRes.fileID)
    } catch (err) {
      console.error('图片上传失败，使用本地演示分析:', err)
      await this.callAnalyzeGateway('')
    }
  },

  async callAnalyzeGateway(fileID) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'vivoAigcGateway',
        data: {
          action: 'artwork.analyze',
          data: {
            fileID,
            prompt: this.data.userNote
          }
        }
      })

      const result = res.result && res.result.result
        ? res.result.result
        : this.getFallbackAnalysis()

      this.setData({
        analysis: result,
        isAnalyzing: false
      })
    } catch (err) {
      console.error('AI 创作分析失败:', err)
      this.setData({
        analysis: this.getFallbackAnalysis(),
        isAnalyzing: false
      })
    }
  },

  getFallbackAnalysis() {
    return {
      summary: '我会把这幅作品看作一次表达，而不是诊断。可以先从颜色、线条、留白和你画的时候身体感受开始观察。',
      observation: '如果画面中有重复线条，可以把它理解为“有东西想被反复说出来”；如果有大块留白，也可能是在给自己保留呼吸空间。',
      suggestions: [
        '给画面里最紧张的位置加一种让你安心的颜色。',
        '在画面边缘写一句“我现在允许自己……”开头的话。',
        '用圆形或波浪线给这幅画加一个临时保护边界。'
      ],
      safetyNote: '本分析仅用于艺术疗愈和自我觉察，不构成心理诊断。'
    }
  }
})
