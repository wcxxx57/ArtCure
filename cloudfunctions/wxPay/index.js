// 微信支付云函数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const res = await cloud.cloudPay.unifiedOrder({
    body: event.description,
    outTradeNo: event.orderId,
    spbillCreateIp: '127.0.0.1',
    subMchId: '你的子商户号', // 如果是服务商模式
    totalFee: event.amount, // 单位：分
    envId: cloud.DYNAMIC_CURRENT_ENV,
    functionName: 'payCallback'
  })

  return res
}
