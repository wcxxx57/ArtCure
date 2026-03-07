// 疗愈资源云函数
// 支持新的数据结构和高级搜索功能

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 疗愈资源数据库操作
 * 集合名: healing_resources
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event
  const collection = db.collection('healing_resources')

  try {
    switch (action) {
      
      // ==================== 列表查询 ====================
      case 'list': {
        const { 
          page = 1, 
          pageSize = 20,
          // 硬指标筛选
          therapy_medium,      // 疗愈媒介
          session_format,      // 活动形式
          target_crowd,        // 目标人群
          therapy_level,       // 疗愈等级
          mood_tags,           // 情绪标签
          resource_type,       // 资源类型: workshop/exhibition/training/one_on_one/therapist/studio
          // 位置筛选
          district,            // 区域
          city = '上海',       // 城市
          city_code,           // 兼容旧字段
          // 来源筛选
          source_platform,     // 来源平台: xhs/dianping/wechat/partner
          // 排序
          sortBy = 'likes_count',  // likes_count, external_rating, created_at, price_value
          sortOrder = 'desc'
        } = data
        
        const skip = (page - 1) * pageSize
        
        // 构建基础查询条件（不再强制要求 is_active 和 city_code）
        let whereClause = {}
        
        // 构建筛选条件
        if (therapy_medium && therapy_medium.length > 0) {
          whereClause.therapy_medium = _.elemMatch(_.in(therapy_medium))
        }
        
        if (session_format) {
          whereClause.session_format = session_format
        }
        
        if (target_crowd && target_crowd.length > 0) {
          whereClause.target_crowd = _.elemMatch(_.in(target_crowd))
        }
        
        if (therapy_level) {
          whereClause.therapy_level = therapy_level
        }
        
        if (mood_tags && mood_tags.length > 0) {
          whereClause.mood_tags = _.elemMatch(_.in(mood_tags))
        }
        
        // 资源类型筛选
        if (resource_type) {
          whereClause.resource_type = resource_type
        }
        
        if (district) {
          whereClause.district = district
        }
        
        // 城市筛选（兼容新旧字段）
        if (city) {
          whereClause.city = city
        } else if (city_code) {
          whereClause.city_code = city_code
        }
        
        if (source_platform) {
          whereClause.source_platform = source_platform
        }
        
        const query = collection.where(whereClause)
        const { total } = await query.count()
        
        const { data: resources } = await query
          .orderBy(sortBy, sortOrder)
          .skip(skip)
          .limit(pageSize)
          .get()
        
        return {
          success: true,
          data: resources,
          total,
          page,
          pageSize,
          hasMore: skip + resources.length < total
        }
      }
      
      // ==================== 综合搜索 ====================
      case 'search': {
        const {
          keyword,
          page = 1,
          pageSize = 20,
          // 硬指标筛选（可选）
          therapy_medium,
          session_format,
          target_crowd,
          therapy_level,
          mood_tags,
          district,
          // 搜索模式
          searchMode = 'auto'  // auto, title, content, semantic
        } = data
        
        const skip = (page - 1) * pageSize
        
        if (!keyword || keyword.trim() === '') {
          return { success: false, error: '请输入搜索关键词' }
        }
        
        const regex = db.RegExp({ regexp: keyword.trim(), options: 'i' })
        
        // 基础搜索条件
        let searchConditions = []
        
        if (searchMode === 'title' || searchMode === 'auto') {
          searchConditions.push({ title: regex })
        }
        
        if (searchMode === 'content' || searchMode === 'auto') {
          searchConditions.push(
            { description: regex },
            { search_text: regex },
            { keywords: _.elemMatch(regex) }
          )
        }
        
        if (searchMode === 'auto') {
          searchConditions.push(
            { therapist_name: regex },
            { address_text: regex }
          )
        }
        
        let whereClause = _.and([
          { is_active: true },
          _.or(searchConditions)
        ])
        
        // 添加硬指标筛选
        if (therapy_medium && therapy_medium.length > 0) {
          whereClause = _.and([whereClause, { therapy_medium: _.elemMatch(_.in(therapy_medium)) }])
        }
        
        if (session_format) {
          whereClause = _.and([whereClause, { session_format }])
        }
        
        if (target_crowd && target_crowd.length > 0) {
          whereClause = _.and([whereClause, { target_crowd: _.elemMatch(_.in(target_crowd)) }])
        }
        
        if (therapy_level) {
          whereClause = _.and([whereClause, { therapy_level }])
        }
        
        if (mood_tags && mood_tags.length > 0) {
          whereClause = _.and([whereClause, { mood_tags: _.elemMatch(_.in(mood_tags)) }])
        }
        
        if (district) {
          whereClause = _.and([whereClause, { district }])
        }
        
        const query = collection.where(whereClause)
        const { total } = await query.count()
        
        const { data: resources } = await query
          .orderBy('healing_score', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()
        
        return {
          success: true,
          data: resources,
          total,
          page,
          pageSize,
          keyword,
          hasMore: skip + resources.length < total
        }
      }
      
      // ==================== 引导式搜索 ====================
      case 'guidedSearch': {
        const {
          moodSelections = [],  // 用户选择的情绪标签
          customInput = '',    // 用户自定义输入
          page = 1,
          pageSize = 10
        } = data
        
        const skip = (page - 1) * pageSize
        
        // 情绪标签映射
        const moodMapping = {
          '想要放松': ['level_1_relax'],
          '有点焦虑': ['anxiety', 'stress'],
          '压力很大': ['stress', 'burnout'],
          '难过沮丧': ['depression', 'loneliness'],
          '寻求意义': ['self_growth'],
          '亲密关系': ['relationship']
        }
        
        // 收集所有相关的 mood_tags
        let targetMoodTags = []
        for (const selection of moodSelections) {
          const tags = moodMapping[selection] || []
          targetMoodTags.push(...tags)
        }
        targetMoodTags = [...new Set(targetMoodTags)]  // 去重
        
        let whereClause = { is_active: true }
        
        if (targetMoodTags.length > 0) {
          whereClause.mood_tags = _.elemMatch(_.in(targetMoodTags))
        }
        
        // 如果有自定义输入，增加文本搜索
        if (customInput && customInput.trim()) {
          const regex = db.RegExp({ regexp: customInput.trim(), options: 'i' })
          whereClause = _.and([
            whereClause,
            _.or([
              { title: regex },
              { description: regex },
              { keywords: _.elemMatch(regex) }
            ])
          ])
        }
        
        const query = collection.where(whereClause)
        const { total } = await query.count()
        
        const { data: resources } = await query
          .orderBy('healing_score', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()
        
        // 生成推荐理由
        let recommendReason = ''
        if (moodSelections.length > 0) {
          recommendReason = `根据你的状态「${moodSelections.join('、')}」，为你推荐以下疗愈资源～`
        }
        
        return {
          success: true,
          data: resources,
          total,
          page,
          pageSize,
          moodSelections,
          recommendReason,
          hasMore: skip + resources.length < total
        }
      }
      
      // ==================== 获取详情 ====================
      case 'getById': {
        const { id } = data
        if (!id) {
          return { success: false, error: '缺少资源ID' }
        }
        
        const { data: resource } = await collection.doc(id).get()
        
        return {
          success: true,
          data: resource
        }
      }
      
      // ==================== 获取筛选选项 ====================
      case 'getFilterOptions': {
        // 返回所有可用的筛选选项
        
        // 资源类型（新增 - 用于分类标签）
        const resourceTypeOptions = [
          { value: 'workshop', label: '工作坊', icon: '🎨', color: '#FF6B6B' },
          { value: 'exhibition', label: '展览', icon: '🖼️', color: '#4ECDC4' },
          { value: 'training', label: '培训', icon: '📚', color: '#45B7D1' },
          { value: 'one_on_one', label: '1v1', icon: '👤', color: '#96CEB4' },
          { value: 'therapist', label: '疗愈师', icon: '✨', color: '#FFEAA7' },
          { value: 'studio', label: '工作室', icon: '🏠', color: '#DDA0DD' }
        ]
        
        // 来源平台
        const sourcePlatformOptions = [
          { value: 'xhs', label: '小红书', icon: '📕', color: '#FE2C55' },
          { value: 'dianping', label: '大众点评', icon: '⭐', color: '#FF6633' },
          { value: 'wechat', label: '微信公众号', icon: '�', color: '#07C160' },
          { value: 'partner', label: '合作机构', icon: '🤝', color: '#1890FF' }
        ]
        
        // 疗愈媒介
        const therapyMediumOptions = [
          { value: 'fluid_art', label: '流体画', icon: '🌊' },
          { value: 'mandala', label: '曼陀罗绘画', icon: '🔮' },
          { value: 'oil_painting', label: '油画', icon: '�' },
          { value: 'watercolor', label: '水彩', icon: '💧' },
          { value: 'pottery', label: '陶艺', icon: '🏺' },
          { value: 'music_bowl', label: '颂钵', icon: '🔔' },
          { value: 'sound_therapy', label: '音疗', icon: '�' },
          { value: 'meditation', label: '冥想', icon: '🧘' },
          { value: 'dance', label: '舞动', icon: '💃' },
          { value: 'drama', label: '戏剧疗愈', icon: '🎭' },
          { value: 'floral', label: '花艺', icon: '🌸' },
          { value: 'candle', label: '香薰蜡烛', icon: '🕯️' },
          { value: 'intangible_heritage', label: '非遗体验', icon: '🏮' },
          { value: 'handicraft', label: '手工艺', icon: '✂️' }
        ]
        
        // 活动形式
        const sessionFormatOptions = [
          { value: 'one_on_one', label: '1对1深度', icon: '👤' },
          { value: 'group_workshop', label: '团体工作坊', icon: '👥' },
          { value: 'open_studio', label: '开放画室', icon: '🏠' },
          { value: 'online', label: '线上', icon: '💻' }
        ]
        
        // 目标人群
        const targetCrowdOptions = [
          { value: 'corporate', label: '职场人', icon: '💼' },
          { value: 'college', label: '大学生', icon: '🎓' },
          { value: 'teen', label: '青少年', icon: '🧒' },
          { value: 'parent_child', label: '亲子', icon: '👨‍👩‍👧' },
          { value: 'general', label: '通用', icon: '👋' }
        ]
        
        // 疗愈等级
        const therapyLevelOptions = [
          { value: 'level_1_relax', label: '休闲解压', icon: '😌' },
          { value: 'level_2_experience', label: '深度体验', icon: '🔮' },
          { value: 'level_3_consulting', label: '心理咨询辅助', icon: '💭' }
        ]
        
        // 情绪标签
        const moodTagOptions = [
          { value: 'anxiety', label: '焦虑', icon: '😰' },
          { value: 'stress', label: '压力', icon: '😫' },
          { value: 'burnout', label: '倦怠', icon: '😩' },
          { value: 'depression', label: '低落', icon: '😢' },
          { value: 'insomnia', label: '失眠', icon: '😴' },
          { value: 'loneliness', label: '孤独', icon: '🥺' },
          { value: 'relationship', label: '关系', icon: '💔' },
          { value: 'self_growth', label: '自我探索', icon: '🌱' }
        ]
        
        // 区域（上海）
        const districtOptions = [
          { value: '静安', label: '静安区' },
          { value: '徐汇', label: '徐汇区' },
          { value: '长宁', label: '长宁区' },
          { value: '黄浦', label: '黄浦区' },
          { value: '浦东', label: '浦东新区' },
          { value: '杨浦', label: '杨浦区' },
          { value: '虹口', label: '虹口区' },
          { value: '普陀', label: '普陀区' }
        ]
        
        return {
          success: true,
          data: {
            resourceType: resourceTypeOptions,
            sourcePlatform: sourcePlatformOptions,
            therapyMedium: therapyMediumOptions,
            sessionFormat: sessionFormatOptions,
            targetCrowd: targetCrowdOptions,
            therapyLevel: therapyLevelOptions,
            moodTags: moodTagOptions,
            districts: districtOptions
          }
        }
      }
      
      // ==================== 初始化数据 ====================
      case 'init': {
        const { resources } = data
        if (!resources || !Array.isArray(resources)) {
          return { success: false, error: '数据格式错误' }
        }
        
        const batchSize = 100
        let addedCount = 0
        
        for (let i = 0; i < resources.length; i += batchSize) {
          const batch = resources.slice(i, i + batchSize)
          const tasks = batch.map(resource => collection.add({ data: resource }))
          await Promise.all(tasks)
          addedCount += batch.length
        }
        
        return {
          success: true,
          message: `成功导入 ${addedCount} 条疗愈资源`
        }
      }
      
      // ==================== 清空数据 ====================
      case 'clear': {
        const { data: resources } = await collection.limit(1000).get()
        if (resources.length === 0) {
          return { success: true, message: '集合已为空' }
        }
        
        const tasks = resources.map(r => collection.doc(r._id).remove())
        await Promise.all(tasks)
        
        return {
          success: true,
          message: `已清空 ${resources.length} 条数据`
        }
      }
      
      default:
        return { success: false, error: `未知操作: ${action}` }
    }
  } catch (error) {
    console.error('疗愈资源云函数错误:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}
