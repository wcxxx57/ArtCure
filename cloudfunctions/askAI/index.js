// cloudfunctions/askAI/index.js
// AI 对话云函数 - 连接小程序和 AI 服务器
// 支持模式：comfort, therapist, companion, resource_advisor

const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// AI 服务器地址 - 部署后替换为实际地址
// 开发环境下如果未配置，直接返回降级回复
const AI_SERVER_URL = process.env.AI_SERVER_URL || null

exports.main = async (event, context) => {
  const { query, mode = 'comfort', chatHistory = [] } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log(`[askAI] 用户: ${openid}, 模式: ${mode}, 问题: ${query}`)

  try {
    // 1. 获取用户画像信息
    let userProfile = "暂无用户偏好"
    try {
      const userRes = await db.collection('users').where({ 
        _openid: openid 
      }).get()
      
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        userProfile = `昵称:${user.nickname || '旅人'}; 偏好:${user.preference || '无'}`
      }
    } catch (dbErr) {
      console.log('[askAI] 获取用户信息失败:', dbErr)
    }

    // 2. (可选) 查询推荐资源 - 仅在 resource_advisor 模式或相关关键词时
    let recommendData = ""
    const resourceKeywords = ['推荐', '去哪', '哪里', '工坊', '画室', '课程', '疗愈', '体验']
    const isResourceMode = mode === 'resource_advisor'
    const hasResourceKeyword = resourceKeywords.some(kw => query.includes(kw))
    
    if (isResourceMode || hasResourceKeyword) {
      try {
        const recs = await db.collection('healing_resources').limit(3).get()
        if (recs.data.length > 0) {
          recommendData = JSON.stringify(recs.data.map(r => ({
            name: r.name,
            type: r.type,
            description: r.description
          })))
          userProfile += `; 可推荐资源: ${recommendData}`
        }
      } catch (recErr) {
        console.log('[askAI] 获取推荐资源失败:', recErr)
      }
    }

    // 3. 调用 AI 服务器
    console.log(`[askAI] 请求 AI 服务器: ${AI_SERVER_URL}/chat`)
    
    // 如果未配置 AI 服务器，直接返回降级回复
    if (!AI_SERVER_URL) {
      console.log('[askAI] AI 服务器未配置，使用降级回复')
      return {
        success: false,
        reply: getFallbackReply(mode, query),
        error: 'AI 服务器未配置'
      }
    }
    
    const response = await axios.post(`${AI_SERVER_URL}/chat`, {
      user_id: openid,
      query: query,
      mode: mode,
      user_profile: userProfile,
      chat_history: chatHistory.slice(-6) // 只传最近6条历史
    }, {
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('[askAI] AI 响应:', response.data)

    if (response.data.success) {
      // 4. (可选) 保存对话记录
      try {
        await db.collection('chat_history').add({
          data: {
            _openid: openid,
            query: query,
            reply: response.data.reply,
            mode: mode,
            createTime: db.serverDate()
          }
        })
      } catch (saveErr) {
        console.log('[askAI] 保存对话记录失败:', saveErr)
      }

      return {
        success: true,
        reply: response.data.reply,
        sources: response.data.sources,
        mode: mode  // 返回模式信息
      }
    } else {
      throw new Error(response.data.error || 'AI 服务返回错误')
    }

  } catch (err) {
    console.error('[askAI] 错误:', err.message)
    
    // 返回友好的错误提示
    let fallbackReply = getFallbackReply(mode, query)
    
    return {
      success: false,
      reply: fallbackReply,
      error: err.message
    }
  }
}

/**
 * 获取降级回复（当 AI 服务不可用时）
 */
function getFallbackReply(mode, query) {
  const fallbacks = {
    comfort: [
      '抱抱你。虽然我现在有点反应不过来，但我一直在这里陪着你。待会再来找我聊聊好吗？💙',
      '我听到你了。给我一点时间，我们待会继续聊。你现在可以去疗愈馆听听轻音乐放松一下~',
      '谢谢你愿意和我分享。我需要休息一下，但你的心情我都记在心里了。'
    ],
    therapist: [
      '感谢你的提问。我正在整理相关的资料，请稍后再试，或者先去探索一下疗愈馆的内容。🌿',
      '这是一个很好的问题。让我想一想怎么更好地回答你，稍后我们再详细聊聊。',
      '抱歉，我现在暂时无法给你专业的回答。如果你正在经历困扰，也可以考虑和身边信任的人或专业咨询师聊聊。'
    ],
    companion: [
      '哎呀，我刚才走神了！再说一遍好不好？😅',
      '不好意思呀，我现在脑子有点转不过来，待会再来找我聊天吧~ ☕',
      '我现在有点忙，但很快就好！你可以先去看看有什么好玩的~'
    ],
    resource_advisor: [
      '抱歉，我现在暂时无法为你查询资源信息。请稍后再试，或者直接浏览疗愈馆页面查看推荐资源。',
      '系统正在更新资源数据库，请稍后重试。你也可以先浏览疗愈馆的精选资源。',
      '暂时无法连接到资源数据库。建议你先查看疗愈馆页面的店铺推荐，或稍后再来咨询我。'
    ]
  }
  
  const replies = fallbacks[mode] || fallbacks.comfort
  return replies[Math.floor(Math.random() * replies.length)]
}
