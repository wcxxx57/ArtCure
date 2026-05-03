// 聊天消息云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, conversationId, resourceId, resourceName, message, messageType, imageUrl } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    switch (action) {
      case 'sendMessage':
        return await sendMessage(userId, conversationId, resourceId, resourceName, message, messageType, imageUrl)
      case 'getHistory':
        return await getHistory(conversationId, event.limit, event.skip)
      case 'getConversation':
        return await getConversation(userId, resourceId)
      case 'getUserConversations':
        return await getUserConversations(userId)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (err) {
    console.error('chatMessage error:', err)
    return { success: false, error: err.message }
  }
}

// 发送消息
async function sendMessage(userId, conversationId, resourceId, resourceName, message, messageType = 'text', imageUrl = '') {
  let convId = conversationId

  // 如果没有conversationId，创建新会话
  if (!convId && resourceId) {
    const conv = await db.collection('conversations').add({
      data: {
        userId,
        resourceId,
        resourceName: resourceName || '疗愈师',
        lastMessage: message,
        lastMessageTime: db.serverDate(),
        unreadCount: 0,
        createdAt: db.serverDate()
      }
    })
    convId = conv._id
  }

  // 添加消息
  await db.collection('messages').add({
    data: {
      conversationId: convId,
      senderId: userId,
      senderType: 'user',
      messageType,
      content: message,
      imageUrl: imageUrl || '',
      timestamp: db.serverDate(),
      read: false
    }
  })

  // 更新会话最后消息
  await db.collection('conversations').doc(convId).update({
    data: {
      lastMessage: messageType === 'image' ? '[图片]' : message,
      lastMessageTime: db.serverDate()
    }
  })

  return { success: true, conversationId: convId }
}

// 获取历史消息
async function getHistory(conversationId, limit = 20, skip = 0) {
  const res = await db.collection('messages')
    .where({ conversationId })
    .orderBy('timestamp', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return { success: true, messages: res.data.reverse() }
}

// 获取或创建会话
async function getConversation(userId, resourceId) {
  const res = await db.collection('conversations')
    .where({ userId, resourceId })
    .limit(1)
    .get()

  if (res.data.length > 0) {
    return { success: true, conversation: res.data[0] }
  }

  return { success: true, conversation: null }
}

// 获取用户所有会话列表
async function getUserConversations(userId) {
  const res = await db.collection('conversations')
    .where({ userId })
    .orderBy('lastMessageTime', 'desc')
    .limit(50)
    .get()

  return { success: true, conversations: res.data }
}
