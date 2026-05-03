// 疗愈活动云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const userId = wxContext.OPENID

  try {
    switch (action) {
      case 'getActivities':
        return await getActivities(event.category, event.status, event.limit, event.skip)
      case 'getActivityDetail':
        return await getActivityDetail(event.activityId)
      case 'bookActivity':
        return await bookActivity(userId, event.activityId, event.participants, event.phone, event.note)
      case 'getMyBookings':
        return await getMyBookings(userId)
      case 'submitFeedback':
        return await submitFeedback(event.bookingId, event.rating, event.feedback)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (err) {
    console.error('healingActivities error:', err)
    return { success: false, error: err.message }
  }
}

async function getActivities(category = 'all', status = 'upcoming', limit = 20, skip = 0) {
  let query = db.collection('activities').where({ reviewStatus: 'approved' })

  if (category !== 'all') {
    query = query.where({ category })
  }

  const res = await query.orderBy('startTime', 'asc').skip(skip).limit(limit).get()
  return { success: true, activities: res.data }
}

async function getActivityDetail(activityId) {
  const res = await db.collection('activities').doc(activityId).get()
  return { success: true, activity: res.data }
}

async function bookActivity(userId, activityId, participants, phone, note) {
  const booking = await db.collection('activity_bookings').add({
    data: {
      userId,
      activityId,
      participants,
      phone,
      note: note || '',
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: db.serverDate()
    }
  })
  return { success: true, bookingId: booking._id }
}

async function getMyBookings(userId) {
  const res = await db.collection('activity_bookings')
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  return { success: true, bookings: res.data }
}

async function submitFeedback(bookingId, rating, feedback) {
  await db.collection('activity_bookings').doc(bookingId).update({
    data: {
      rating,
      feedback,
      status: 'completed'
    }
  })
  return { success: true }
}
