// 店铺数据云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 店铺数据库操作云函数
 * @param {string} action - 操作类型: list, search, getById, getByCategory, init
 * @param {object} data - 操作参数
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event
  const shopsCollection = db.collection('shops')

  try {
    switch (action) {
      // 获取店铺列表（支持分页）
      case 'list': {
        const { page = 1, pageSize = 20, category = 'all' } = data
        const skip = (page - 1) * pageSize

        let query = shopsCollection

        // 分类筛选
        if (category && category !== 'all') {
          query = query.where({
            tags: _.elemMatch(_.eq(category))
          })
        }

        const { total } = await query.count()
        const { data: shops } = await query
          .orderBy('rating', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()

        return {
          success: true,
          data: shops,
          total,
          page,
          pageSize,
          hasMore: skip + shops.length < total
        }
      }

      // 搜索店铺
      case 'search': {
        const { keyword, page = 1, pageSize = 20, searchType = 'auto', region = '', category = 'all' } = data
        const skip = (page - 1) * pageSize

        if (!keyword || keyword.trim() === '') {
          return { success: false, error: '请输入搜索关键词' }
        }

        // 不区分大小写的正则
        const regex = db.RegExp({
          regexp: keyword,
          options: 'i'
        })

        // 可选的地区筛选正则
        const regionRegex = region && region.trim() ? db.RegExp({ regexp: region, options: 'i' }) : null

        let whereClause

        // 支持三种搜索模式：shop（按店名）、resource（按服务/描述/标签/地址语义）、auto（两者合并）
        if (searchType === 'shop') {
          // 仅按店名搜索
          whereClause = { name: regex }

          // 如果指定分类，合并分类条件
          if (category && category !== 'all') {
            whereClause = _.and([ { tags: _.elemMatch(_.eq(category)) }, whereClause ])
          }

          // 如果指定地区，再合并地址条件
          if (regionRegex) {
            whereClause = _.and([ whereClause, { address: regionRegex } ])
          }
        } else if (searchType === 'resource') {
          // 基于店铺描述、标签、地址等进行资源搜索（语义上更贴近服务）
          const orConds = [
            { content: regex },
            { address: regex },
            { tags: _.elemMatch(regex) },
            { name: regex }
          ]

          whereClause = _.or(orConds)

          if (category && category !== 'all') {
            whereClause = _.and([ { tags: _.elemMatch(_.eq(category)) }, whereClause ])
          }

          if (regionRegex) {
            whereClause = _.and([ whereClause, { address: regionRegex } ])
          }
        } else {
          // auto：宽松匹配（原有行为）
          const orConds = [
            { name: regex },
            { content: regex },
            { address: regex },
            { tags: _.elemMatch(regex) }
          ]

          whereClause = _.or(orConds)

          if (category && category !== 'all') {
            whereClause = _.and([ { tags: _.elemMatch(_.eq(category)) }, whereClause ])
          }

          if (regionRegex) {
            whereClause = _.and([ whereClause, { address: regionRegex } ])
          }
        }

        const query = shopsCollection.where(whereClause)

        const { total } = await query.count()
        // 按数值评分排序（ratingNum），确保结果更合理
        const { data: shops } = await query
          .orderBy('ratingNum', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()

        return {
          success: true,
          data: shops,
          total,
          page,
          pageSize,
          keyword,
          searchType,
          region,
          hasMore: skip + shops.length < total
        }
      }

      // 根据ID获取店铺详情
      case 'getById': {
        const { id } = data
        if (!id) {
          return { success: false, error: '缺少店铺ID' }
        }

        const { data: shop } = await shopsCollection.doc(id).get()
        return {
          success: true,
          data: shop
        }
      }

      // 根据分类获取店铺
      case 'getByCategory': {
        const { category, page = 1, pageSize = 20 } = data
        const skip = (page - 1) * pageSize

        if (!category) {
          return { success: false, error: '缺少分类参数' }
        }

        const query = shopsCollection.where({
          tags: _.elemMatch(_.eq(category))
        })

        const { total } = await query.count()
        const { data: shops } = await query
          .orderBy('rating', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()

        return {
          success: true,
          data: shops,
          total,
          category
        }
      }

      // 获取所有分类标签
      case 'getTags': {
        const { data: shops } = await shopsCollection
          .field({ tags: true })
          .get()

        // 统计所有标签
        const tagCount = {}
        shops.forEach(shop => {
          if (shop.tags && Array.isArray(shop.tags)) {
            shop.tags.forEach(tag => {
              tagCount[tag] = (tagCount[tag] || 0) + 1
            })
          }
        })

        // 转换为数组并排序
        const tags = Object.entries(tagCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        return {
          success: true,
          data: tags
        }
      }

      // 初始化店铺数据（仅用于导入数据）
      case 'init': {
        const { shops } = data
        if (!shops || !Array.isArray(shops)) {
          return { success: false, error: '数据格式错误' }
        }

        // 批量添加（每次最多100条）
        const batchSize = 100
        let addedCount = 0

        for (let i = 0; i < shops.length; i += batchSize) {
          const batch = shops.slice(i, i + batchSize)
          const tasks = batch.map(shop => shopsCollection.add({ data: shop }))
          await Promise.all(tasks)
          addedCount += batch.length
        }

        return {
          success: true,
          message: `成功导入 ${addedCount} 条店铺数据`
        }
      }

      // 清空店铺数据（危险操作，仅开发使用）
      case 'clear': {
        const { data: shops } = await shopsCollection.get()
        const tasks = shops.map(shop => shopsCollection.doc(shop._id).remove())
        await Promise.all(tasks)

        return {
          success: true,
          message: `已清空 ${shops.length} 条数据`
        }
      }

      default:
        return {
          success: false,
          error: `未知操作: ${action}`
        }
    }
  } catch (error) {
    console.error('店铺云函数错误:', error)
    return {
      success: false,
      error: error.message || '操作失败'
    }
  }
}
