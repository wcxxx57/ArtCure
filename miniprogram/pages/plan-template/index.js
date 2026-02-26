// plan-template/index.js
const AuthService = require('../../utils/auth.js')

// 计划模板数据
const TEMPLATES = {
  'anxiety-7days': {
    name: '7天焦虑缓解计划',
    emoji: '🌊',
    bgColor: '#E3F2FD',
    description: '通过冥想、绘画等方式缓解焦虑情绪',
    totalDays: 7,
    participants: 1234,
    tags: ['冥想', '绘画', '书写'],
    tasks: [
      { day: 1, title: '认识焦虑', typeIcon: '🧘', typeName: '正念呼吸', duration: 10, description: '通过呼吸练习，觉察身体的紧张感，学会与焦虑和平相处', expanded: false },
      { day: 2, title: '释放压力', typeIcon: '🎨', typeName: '自由绘画', duration: 15, description: '用色彩表达内心的情绪，不需要技巧，让画笔带走压力', expanded: false },
      { day: 3, title: '情绪书写', typeIcon: '✍️', typeName: '焦虑日记', duration: 10, description: '写下让你焦虑的事情，尝试理解它，接纳它', expanded: false },
      { day: 4, title: '身体放松', typeIcon: '🧘', typeName: '肌肉放松', duration: 15, description: '从头到脚放松每一块肌肉，释放身体的紧张', expanded: false },
      { day: 5, title: '积极暗示', typeIcon: '💭', typeName: '肯定语练习', duration: 10, description: '重复积极的自我肯定语句，建立内心的力量', expanded: false },
      { day: 6, title: '感恩练习', typeIcon: '✍️', typeName: '感恩日记', duration: 10, description: '写下三件值得感恩的事情，培养积极心态', expanded: false },
      { day: 7, title: '回顾与展望', typeIcon: '📝', typeName: '总结规划', duration: 15, description: '回顾这7天的变化，规划未来的疗愈之路', expanded: false }
    ]
  },
  'sleep-emotion': {
    name: '睡前情绪清理',
    emoji: '🌙',
    bgColor: '#F3E5F5',
    description: '通过白噪音和书写释放一天的情绪，获得安稳睡眠',
    totalDays: 7,
    participants: 856,
    tags: ['白噪音', '书写', '冥想'],
    tasks: [
      { day: 1, title: '放下一天', typeIcon: '✍️', typeName: '情绪日记', duration: 10, description: '写下今天的情绪和感受，让它们留在纸上，不带入梦中', expanded: false },
      { day: 2, title: '身体扫描', typeIcon: '🧘', typeName: '身体觉察', duration: 15, description: '从头到脚感受身体的每个部位，释放紧张和疲惫', expanded: false },
      { day: 3, title: '白噪音疗愈', typeIcon: '🌊', typeName: '海浪冥想', duration: 20, description: '聆听海浪声，想象自己躺在沙滩上，让思绪随波浪远去', expanded: false },
      { day: 4, title: '感恩时刻', typeIcon: '💭', typeName: '感恩冥想', duration: 10, description: '回忆今天值得感恩的三个瞬间，带着温暖入睡', expanded: false },
      { day: 5, title: '呼吸放松', typeIcon: '🧘', typeName: '4-7-8呼吸', duration: 10, description: '用4-7-8呼吸法放松神经系统，准备进入深度睡眠', expanded: false },
      { day: 6, title: '想象旅行', typeIcon: '🌙', typeName: '引导冥想', duration: 15, description: '跟随引导进入一个宁静的梦境世界，释放所有压力', expanded: false },
      { day: 7, title: '睡眠仪式', typeIcon: '✨', typeName: '习惯养成', duration: 10, description: '建立属于自己的睡前仪式，让身心知道该休息了', expanded: false }
    ]
  },
  'mindfulness-14days': {
    name: '14天正念入门',
    emoji: '🍃',
    bgColor: '#E8F8F5',
    description: '系统学习正念冥想，培养觉察力和专注力',
    totalDays: 14,
    participants: 2103,
    tags: ['呼吸', '冥想', '觉察'],
    tasks: [
      { day: 1, title: '正念呼吸基础', typeIcon: '🧘', typeName: '呼吸觉察', duration: 5, description: '学习观察呼吸，不评判，只是觉察呼吸的自然流动', expanded: false },
      { day: 2, title: '身体觉察', typeIcon: '🧘', typeName: '身体扫描', duration: 10, description: '系统地觉察身体各部位的感受，培养身心连接', expanded: false },
      { day: 3, title: '声音冥想', typeIcon: '👂', typeName: '听觉觉察', duration: 10, description: '觉察周围的声音，不评判好坏，只是单纯地听', expanded: false },
      { day: 4, title: '思绪观察', typeIcon: '💭', typeName: '念头觉察', duration: 10, description: '观察思绪的来去，像看云一样，不追随不抗拒', expanded: false },
      { day: 5, title: '情绪觉察', typeIcon: '❤️', typeName: '情绪观察', duration: 10, description: '觉察情绪在身体中的感受，学会与情绪共处', expanded: false },
      { day: 6, title: '正念行走', typeIcon: '🚶', typeName: '行走冥想', duration: 15, description: '慢慢行走，觉察每一步的感受，活在当下', expanded: false },
      { day: 7, title: '正念饮食', typeIcon: '🍽️', typeName: '饮食觉察', duration: 15, description: '用全部感官体验食物，感受进食的每个瞬间', expanded: false },
      { day: 8, title: '慈心冥想', typeIcon: '💝', typeName: '慈悲练习', duration: 10, description: '向自己和他人发送祝福，培养慈悲心', expanded: false },
      { day: 9, title: '正念伸展', typeIcon: '🤸', typeName: '身体练习', duration: 15, description: '觉察身体的伸展和移动，温柔对待自己', expanded: false },
      { day: 10, title: '呼吸空间', typeIcon: '🧘', typeName: '三分钟呼吸', duration: 5, description: '学习三分钟呼吸空间，随时随地回到当下', expanded: false },
      { day: 11, title: '困难觉察', typeIcon: '🌊', typeName: '面对困难', duration: 15, description: '用正念面对困难情绪，学会不逃避不对抗', expanded: false },
      { day: 12, title: '感恩练习', typeIcon: '🙏', typeName: '感恩冥想', duration: 10, description: '觉察生活中的美好，培养感恩的心', expanded: false },
      { day: 13, title: '山的冥想', typeIcon: '⛰️', typeName: '稳定练习', duration: 15, description: '像山一样稳定，无论外界如何变化都保持中心', expanded: false },
      { day: 14, title: '整合与延续', typeIcon: '✨', typeName: '总结规划', duration: 15, description: '回顾14天的练习，规划如何将正念融入日常生活', expanded: false }
    ]
  },
  'music-healing': {
    name: '音乐疗愈之旅',
    emoji: '🎵',
    bgColor: '#FFF8DC',
    description: '通过不同类型的音乐疗愈身心，释放情绪',
    totalDays: 7,
    participants: 1567,
    tags: ['音乐', '放松', '情绪'],
    tasks: [
      { day: 1, title: '自然之声', typeIcon: '🌿', typeName: '自然音乐', duration: 20, description: '聆听森林、溪流、鸟鸣，让大自然的声音洗涤心灵', expanded: false },
      { day: 2, title: '古典疗愈', typeIcon: '🎻', typeName: '古典音乐', duration: 25, description: '沉浸在莫扎特、德彪西的旋律中，感受音乐的治愈力量', expanded: false },
      { day: 3, title: '冥想音乐', typeIcon: '🧘', typeName: '冥想配乐', duration: 20, description: '配合冥想音乐进行深度放松，进入内心的宁静空间', expanded: false },
      { day: 4, title: '钢琴独奏', typeIcon: '🎹', typeName: '钢琴音乐', duration: 20, description: '聆听舒缓的钢琴曲，让琴声抚慰疲惫的心灵', expanded: false },
      { day: 5, title: '颂钵疗愈', typeIcon: '🔔', typeName: '颂钵音乐', duration: 25, description: '感受颂钵的振动频率，平衡身心能量', expanded: false },
      { day: 6, title: '世界音乐', typeIcon: '🌍', typeName: '民族音乐', duration: 20, description: '探索不同文化的音乐，体验多元的疗愈方式', expanded: false },
      { day: 7, title: '自由聆听', typeIcon: '🎧', typeName: '个性选择', duration: 30, description: '选择最触动你的音乐，创造属于自己的疗愈时刻', expanded: false }
    ]
  }
}

Page({
  data: {
    templateId: '',
    templateInfo: {},
    tasks: [],
    showEditModal: false,
    editingTask: {},
    editingIndex: -1
  },

  onLoad(options) {
    const templateId = options.templateId || 'anxiety-7days'
    const template = TEMPLATES[templateId]
    
    if (template) {
      this.setData({
        templateId: templateId,
        templateInfo: {
          name: template.name,
          emoji: template.emoji,
          bgColor: template.bgColor,
          description: template.description,
          totalDays: template.totalDays,
          participants: template.participants,
          tags: template.tags
        },
        tasks: template.tasks
      })
    } else {
      wx.showToast({
        title: '计划不存在',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  toggleTask(e) {
    const index = e.currentTarget.dataset.index
    const key = `tasks[${index}].expanded`
    this.setData({ [key]: !this.data.tasks[index].expanded })
  },

  onEditTask(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      showEditModal: true,
      editingTask: { ...this.data.tasks[index] },
      editingIndex: index
    })
  },

  onCloseEditModal() {
    this.setData({ showEditModal: false, editingTask: {}, editingIndex: -1 })
  },

  stopPropagation() {},

  onTitleInput(e) {
    this.setData({ 'editingTask.title': e.detail.value })
  },

  onDescriptionInput(e) {
    this.setData({ 'editingTask.description': e.detail.value })
  },

  onDurationInput(e) {
    this.setData({ 'editingTask.duration': parseInt(e.detail.value) || 0 })
  },

  onConfirmEdit() {
    const { editingTask, editingIndex } = this.data
    if (!editingTask.title || !editingTask.description || !editingTask.duration) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    this.setData({
      [`tasks[${editingIndex}]`]: editingTask,
      showEditModal: false
    })
    wx.showToast({ title: '修改成功', icon: 'success' })
  },

  onUseDefault() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后加入计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/user_login/index' })
        }
      })
      return
    }
    this.createPlan(this.data.tasks)
  },

  onSaveCustom() {
    if (!AuthService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后加入计划',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/user_login/index' })
        }
      })
      return
    }
    this.createPlan(this.data.tasks)
  },

  createPlan(tasks) {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '创建中...' })
    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'createPlanFromTemplate',
        userId: userInfo._id,
        templateInfo: this.data.templateInfo,
        tasks: tasks
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 0) {
        wx.showToast({ title: '加入成功！', icon: 'success' })
        setTimeout(() => {
          wx.navigateTo({ url: `/pages/plan-detail/index?planId=${res.result.data.planId}` })
        }, 1500)
      } else {
        wx.showToast({ title: res.result.message || '创建失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('创建计划失败:', err)
      wx.showToast({ title: '创建失败，请重试', icon: 'none' })
    })
  }
})
