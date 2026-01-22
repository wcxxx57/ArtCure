// user-info/index.js
const AuthService = require('../../utils/auth.js')
const ValidationService = require('../../utils/validation.js')

Page({
  data: {
    userInfo: {
      avatar: '',
      account: '',
      nickname: ''
    },
    accountType: 'email', // email 或 phone
    
    // 头像上传
    uploading: false,
    uploadProgress: 0,
    
    // 昵称修改
    showNicknameModal: false,
    newNickname: '',
    isUpdatingNickname: false,
    
    // 密码修改
    showPasswordModal: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    showOldPassword: false,
    showNewPassword: false,
    showConfirmPassword: false,
    passwordStrength: 0,
    passwordStrengthText: '弱',
    isChangingPassword: false
  },

  onLoad(options) {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = AuthService.getUserInfo()
    
    if (userInfo) {
      // 判断账号类型
      const accountType = userInfo.email ? 'email' : 'phone'
      const account = userInfo.email || userInfo.phone || ''
      
      this.setData({
        userInfo: {
          avatar: userInfo.avatar || '/miniprogram/images/avatar.png',
          account: account,
          nickname: userInfo.nickname || '疗愈用户'
        },
        accountType: accountType
      })
    }
  },

  // 返回
  onBack() {
    wx.navigateBack()
  },

  // 选择头像
  onChooseAvatar() {
    const that = this
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        // 裁剪图片
        wx.cropImage({
          src: tempFilePath,
          cropScale: '1:1',
          success(cropRes) {
            that.uploadAvatar(cropRes.tempFilePath)
          },
          fail() {
            // 裁剪失败，直接上传原图
            that.uploadAvatar(tempFilePath)
          }
        })
      }
    })
  },

  // 上传头像
  uploadAvatar(filePath) {
    const that = this
    const userInfo = AuthService.getUserInfo()
    
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({
      uploading: true,
      uploadProgress: 0
    })

    // 生成云存储路径
    const timestamp = Date.now()
    const cloudPath = `avatars/${userInfo._id || 'user'}_${timestamp}.jpg`

    // 上传到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        console.log('头像上传成功:', res.fileID)
        that.updateUserAvatar(res.fileID)
      },
      fail: err => {
        console.error('头像上传失败:', err)
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        })
        that.setData({
          uploading: false
        })
      }
    })
  },

  // 更新用户头像
  updateUserAvatar(fileID) {
    const that = this
    
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        avatar: fileID
      }
    }).then(res => {
      console.log('头像更新成功:', res)
      
      if (res.result.code === 0) {
        // 更新本地缓存
        const userInfo = AuthService.getUserInfo()
        userInfo.avatar = fileID
        AuthService.updateUserInfo(userInfo)
        
        // 更新页面显示
        that.setData({
          'userInfo.avatar': fileID,
          uploading: false,
          uploadProgress: 100
        })
        
        wx.showToast({
          title: '头像修改成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.message || '更新失败',
          icon: 'none'
        })
        that.setData({
          uploading: false
        })
      }
    }).catch(err => {
      console.error('头像更新失败:', err)
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      })
      that.setData({
        uploading: false
      })
    })
  },

  // 打开修改密码弹窗
  onChangePassword() {
    this.setData({
      showPasswordModal: true,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      showOldPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
      passwordStrength: 0,
      passwordStrengthText: '弱'
    })
  },

  // 打开修改昵称弹窗
  onEditNickname() {
    this.setData({
      showNicknameModal: true,
      newNickname: this.data.userInfo.nickname || ''
    })
  },

  // 关闭修改昵称弹窗
  onCloseNicknameModal() {
    this.setData({
      showNicknameModal: false
    })
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      newNickname: e.detail.value
    })
  },

  // 确认修改昵称
  onConfirmNickname() {
    const { newNickname } = this.data
    
    // 验证昵称
    if (!newNickname || newNickname.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }
    
    if (newNickname.length < 2 || newNickname.length > 10) {
      wx.showToast({
        title: '昵称长度为2-10个字符',
        icon: 'none'
      })
      return
    }
    
    // 调用云函数更新昵称
    this.updateNickname(newNickname.trim())
  },

  // 更新昵称
  updateNickname(nickname) {
    const that = this
    
    this.setData({
      isUpdatingNickname: true
    })
    
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        nickname: nickname
      }
    }).then(res => {
      console.log('昵称更新结果:', res)
      
      if (res.result.code === 0) {
        // 更新本地缓存
        const userInfo = AuthService.getUserInfo()
        userInfo.nickname = nickname
        AuthService.updateUserInfo(userInfo)
        
        // 更新页面显示
        that.setData({
          'userInfo.nickname': nickname,
          showNicknameModal: false,
          isUpdatingNickname: false
        })
        
        wx.showToast({
          title: '昵称修改成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: res.result.message || '修改失败',
          icon: 'none'
        })
        that.setData({
          isUpdatingNickname: false
        })
      }
    }).catch(err => {
      console.error('昵称更新失败:', err)
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'none'
      })
      that.setData({
        isUpdatingNickname: false
      })
    })
  },

  // 关闭修改密码弹窗
  onClosePasswordModal() {
    this.setData({
      showPasswordModal: false
    })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 旧密码输入
  onOldPasswordInput(e) {
    this.setData({
      oldPassword: e.detail.value
    })
  },

  // 新密码输入
  onNewPasswordInput(e) {
    const password = e.detail.value
    const strength = ValidationService.checkPasswordStrength(password)
    const strengthText = ValidationService.getPasswordStrengthText(strength)
    
    this.setData({
      newPassword: password,
      passwordStrength: strength,
      passwordStrengthText: strengthText
    })
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    })
  },

  // 切换旧密码显示
  toggleOldPassword() {
    this.setData({
      showOldPassword: !this.data.showOldPassword
    })
  },

  // 切换新密码显示
  toggleNewPassword() {
    this.setData({
      showNewPassword: !this.data.showNewPassword
    })
  },

  // 切换确认密码显示
  toggleConfirmPassword() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    })
  },

  // 确认修改密码
  onConfirmChangePassword() {
    const { oldPassword, newPassword, confirmPassword } = this.data
    
    // 验证旧密码
    if (!oldPassword) {
      wx.showToast({
        title: '请输入旧密码',
        icon: 'none'
      })
      return
    }
    
    // 验证新密码
    if (!newPassword) {
      wx.showToast({
        title: '请输入新密码',
        icon: 'none'
      })
      return
    }
    
    if (!ValidationService.isValidPassword(newPassword)) {
      wx.showToast({
        title: '密码格式不正确',
        icon: 'none'
      })
      return
    }
    
    // 验证确认密码
    if (!confirmPassword) {
      wx.showToast({
        title: '请输入确认密码',
        icon: 'none'
      })
      return
    }
    
    if (newPassword !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }
    
    // 新旧密码不能相同
    if (oldPassword === newPassword) {
      wx.showToast({
        title: '新密码不能与旧密码相同',
        icon: 'none'
      })
      return
    }
    
    // 调用云函数修改密码
    this.changePassword()
  },

  // 修改密码
  changePassword() {
    const that = this
    const { oldPassword, newPassword } = this.data
    
    this.setData({
      isChangingPassword: true
    })
    
    wx.cloud.callFunction({
      name: 'changePassword',
      data: {
        oldPassword: oldPassword,
        newPassword: newPassword
      }
    }).then(res => {
      console.log('密码修改结果:', res)
      
      if (res.result.code === 0) {
        wx.showToast({
          title: '密码修改成功',
          icon: 'success'
        })
        
        // 关闭弹窗
        that.setData({
          showPasswordModal: false,
          isChangingPassword: false
        })
      } else {
        wx.showToast({
          title: res.result.message || '修改失败',
          icon: 'none'
        })
        that.setData({
          isChangingPassword: false
        })
      }
    }).catch(err => {
      console.error('密码修改失败:', err)
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'none'
      })
      that.setData({
        isChangingPassword: false
      })
    })
  }
})
