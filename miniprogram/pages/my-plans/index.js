// my-plans/index.js
const AuthService = require('../../utils/auth.js')

Page({
  data: {
    stats: {
      ongoing: 0,
      completed: 0,
      totalDays: 0
    },
    ongoingPlans: [],
    completedPlans: [],
    showCompleted: false
  },

  onLoad(options) {
    this.loadPlans()
  },

  onShow() {
    this.loadPlans()
  },

  // 加载计划
  loadPlans() {
    const userInfo = AuthService.getUserInfo()
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

    // 调用云函数获取用户计划
    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'getUserPlans',
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        const { ongoingPlans, completedPlans, stats } = res.result.data
        
        // 计算进度
        const processedOngoing = ongoingPlans.map(plan => {
          const progress = (plan.currentDay / plan.totalDays) * 100
          return {
            ...plan,
            progress: Math.round(progress)
          }
        })

        this.setData({
          ongoingPlans: processedOngoing,
          completedPlans: completedPlans,
          stats: stats
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

  // 切换已完成计划显示
  toggleCompleted() {
    this.setData({
      showCompleted: !this.data.showCompleted
    })
  },

  // 点击计划卡片
  onPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    wx.navigateTo({
      url: `/pages/plan-detail/index?planId=${plan._id}`
    })
  },

  // 去探索计划
  onExploreTap() {
    wx.switchTab({
      url: '/pages/healing-plan/index'
    })
  },

  // 删除计划
  onDeletePlan(e) {
    const plan = e.currentTarget.dataset.plan
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除计划"${plan.name}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.deletePlan(plan._id)
        }
      }
    })
  },

  // 执行删除
  deletePlan(planId) {
    const userInfo = AuthService.getUserInfo()
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '删除中...' })

    wx.cloud.callFunction({
      name: 'planManagement',
      data: {
        action: 'deletePlan',
        planId: planId,
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        // 重新加载计划列表
        setTimeout(() => {
          this.loadPlans()
        }, 500)
      } else {
        wx.showToast({
          title: res.result.message || '删除失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('删除计划失败:', err)
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      })
    })
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  }
})
