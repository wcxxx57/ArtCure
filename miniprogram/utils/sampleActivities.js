// 示例活动数据
// 用于测试完整流程：浏览 - 咨询 - 预约 - 支付 - 进度跟踪 - 反馈

const sampleActivities = [
  {
    _id: 'activity_001',
    title: '艺术疗愈工作坊 · 绘画与情绪表达',
    category: 'art',
    coverImage: 'https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/activity/1.png',
    description: '通过绘画的方式探索内心情绪，在专业艺术疗愈师的引导下，用色彩和线条表达自我。适合零基础参与者，提供所有绘画材料。',
    startTime: new Date('2026-04-05 14:00:00').getTime(),
    endTime: new Date('2026-04-05 17:00:00').getTime(),
    location: '上海市徐汇区艺术空间',
    price: 298,
    maxParticipants: 12,
    currentParticipants: 7,
    therapistName: '李心怡',
    therapistId: 'therapist_001',
    resourceId: 'resource_001',
    reviewStatus: 'approved',
    createdAt: new Date('2026-03-20').getTime()
  },
  {
    _id: 'activity_002',
    title: '颂钵音疗体验 · 声音的疗愈之旅',
    category: 'music',
    coverImage: 'https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/activity/2.jpg',
    description: '在颂钵的共鸣声中放松身心，体验声音振动带来的深度疗愈。专业音疗师带领，提供瑜伽垫和毯子。',
    startTime: new Date('2026-04-08 19:00:00').getTime(),
    endTime: new Date('2026-04-08 20:30:00').getTime(),
    location: '上海市静安区禅修中心',
    price: 188,
    maxParticipants: 20,
    currentParticipants: 15,
    therapistName: '王静',
    therapistId: 'therapist_002',
    resourceId: 'resource_002',
    reviewStatus: 'approved',
    createdAt: new Date('2026-03-22').getTime()
  },
  {
    _id: 'activity_003',
    title: '正念冥想工作坊 · 回归当下',
    category: 'meditation',
    coverImage: 'https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/activity/3.jpg',
    description: '学习正念冥想的基础技巧，在繁忙生活中找到内心的平静。包含呼吸练习、身体扫描和行走冥想。',
    startTime: new Date('2026-04-12 10:00:00').getTime(),
    endTime: new Date('2026-04-12 12:00:00').getTime(),
    location: '上海市浦东新区冥想空间',
    price: 158,
    maxParticipants: 15,
    currentParticipants: 8,
    therapistName: '张明',
    therapistId: 'therapist_003',
    resourceId: 'resource_003',
    reviewStatus: 'approved',
    createdAt: new Date('2026-03-23').getTime()
  }
]

module.exports = { sampleActivities }
