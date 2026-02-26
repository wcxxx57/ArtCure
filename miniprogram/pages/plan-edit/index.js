// plan-edit/index.js
Page({
  data: {
    planId: '',
    planInfo: {
      name: '',
      emoji: '🌊',
      bgColor: '#E3F2FD'
    },
    tasks: [],
    reminderEnabled: false,
    reminderTime: '09:00',
    
    // 选择器数据
    emojiList: ['🌊', '🎨', '🧘', '🌙', '🍃', '🎵', '💭', '✍️', '📝', '🔥'],
    colorList: ['#E3F2FD', '#F3E5F5', '#E8F8F5', '#FFF8DC', '#FFE5F0', '#FEE5E6'],
    taskIconList: ['🧘', '🎨', '✍️', '💭', '📝', '🎵', '🌙', '🍃'],
    
    // 任务编辑
    showTaskModal: false,
    editingTask: {},
    editingIndex: -1
  },

  onLoad(options) {
    if (options.planId) {
      this.setData({ planId: options.planId })
      this.loadPlanData()
    }
  },

  // 加载计划数据
  loadPlanData() {
    const userInfo = require('../../utils/auth.js').getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/user_login/index'
        })
      }, 1500)
      return
    }

    wx.showLoading({ title: '加载中...' })
    
    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'getPlanDetail',
        planId: this.data.planId,
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        const { planInfo } = res.result.data
        
        this.setData({
          planInfo: {
            name: planInfo.name,
            emoji: planInfo.emoji,
            bgColor: planInfo.bgColor
          },
          tasks: planInfo.tasks || []
        })
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('加载计划失败:', err)
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    })
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  // 计划名称输入
  onNameInput(e) {
    this.setData({
      'planInfo.name': e.detail.value
    })
  },

  // 选择Emoji
  onEmojiSelect(e) {
    this.setData({
      'planInfo.emoji': e.currentTarget.dataset.emoji
    })
  },

  // 选择颜色
  onColorSelect(e) {
    this.setData({
      'planInfo.bgColor': e.currentTarget.dataset.color
    })
  },

  // 编辑任务
  onEditTask(e) {
    const index = e.currentTarget.dataset.index
    const task = this.data.tasks[index]
    
    this.setData({
      showTaskModal: true,
      editingTask: { ...task },
      editingIndex: index
    })
  },

  // 删除任务
  onDeleteTask(e) {
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          const tasks = this.data.tasks
          tasks.splice(index, 1)
          
          // 重新编号
          tasks.forEach((task, idx) => {
            task.day = idx + 1
          })
          
          this.setData({ tasks })
          
          wx.showToast({
            title: '已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 添加任务
  onAddTask() {
    this.setData({
      showTaskModal: true,
      editingTask: {
        day: this.data.tasks.length + 1,
        title: '',
        typeIcon: '🧘',
        typeName: '',
        duration: 10,
        description: ''
      },
      editingIndex: -1
    })
  },

  // 关闭任务弹窗
  onCloseTaskModal() {
    this.setData({
      showTaskModal: false,
      editingTask: {},
      editingIndex: -1
    })
  },

  stopPropagation() {},

  // 任务标题输入
  onTaskTitleInput(e) {
    this.setData({
      'editingTask.title': e.detail.value
    })
  },

  // 任务类型输入
  onTaskTypeInput(e) {
    this.setData({
      'editingTask.typeName': e.detail.value
    })
  },

  // 选择任务图标
  onTaskIconSelect(e) {
    this.setData({
      'editingTask.typeIcon': e.currentTarget.dataset.icon
    })
  },

  // 任务时长输入
  onTaskDurationInput(e) {
    this.setData({
      'editingTask.duration': parseInt(e.detail.value) || 0
    })
  },

  // 任务描述输入
  onTaskDescInput(e) {
    this.setData({
      'editingTask.description': e.detail.value
    })
  },

  // 确认任务
  onConfirmTask() {
    const { editingTask, editingIndex, tasks } = this.data
    
    // 验证
    if (!editingTask.title) {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      })
      return
    }
    
    if (!editingTask.typeName) {
      wx.showToast({
        title: '请输入任务类型',
        icon: 'none'
      })
      return
    }
    
    if (!editingTask.duration || editingTask.duration <= 0) {
      wx.showToast({
        title: '请输入有效时长',
        icon: 'none'
      })
      return
    }
    
    if (!editingTask.description) {
      wx.showToast({
        title: '请输入任务描述',
        icon: 'none'
      })
      return
    }
    
    // 更新或添加
    if (editingIndex === -1) {
      // 添加新任务
      tasks.push(editingTask)
    } else {
      // 更新现有任务
      tasks[editingIndex] = editingTask
    }
    
    this.setData({
      tasks: tasks,
      showTaskModal: false
    })
    
    wx.showToast({
      title: editingIndex === -1 ? '添加成功' : '修改成功',
      icon: 'success'
    })
  },

  // 提醒开关
  onReminderToggle(e) {
    this.setData({
      reminderEnabled: e.detail.value
    })
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      reminderTime: e.detail.value
    })
  },

  // 取消
  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '修改的内容将不会保存，确定要取消吗？',
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  // 保存
  onSave() {
    const { planInfo, tasks } = this.data
    
    // 验证
    if (!planInfo.name) {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      })
      return
    }
    
    if (tasks.length === 0) {
      wx.showToast({
        title: '请至少添加一个任务',
        icon: 'none'
      })
      return
    }

    const userInfo = require('../../utils/auth.js').getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '保存中...' })
    
    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'updatePlan',
        planId: this.data.planId,
        userId: userInfo._id,
        updates: {
          name: planInfo.name,
          emoji: planInfo.emoji,
          bgColor: planInfo.bgColor,
          tasks: tasks,
          totalDays: tasks.length
        }
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '保存失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    })
  }
})
