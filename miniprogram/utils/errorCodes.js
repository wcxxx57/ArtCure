// errorCodes.js - 错误码定义模块

const ErrorCodes = {
  // 通用错误
  UNKNOWN_ERROR: { code: 1000, message: '未知错误' },
  NETWORK_ERROR: { code: 1001, message: '网络错误，请稍后重试' },
  
  // 账号相关
  ACCOUNT_REQUIRED: { code: 2000, message: '请输入账号' },
  INVALID_ACCOUNT: { code: 2001, message: '账号格式不正确' },
  ACCOUNT_NOT_EXIST: { code: 2002, message: '账号不存在' },
  ACCOUNT_ALREADY_EXIST: { code: 2003, message: '账号已被注册' },
  ACCOUNT_LOCKED: { code: 2004, message: '账号已被锁定' },
  
  // 密码相关
  PASSWORD_REQUIRED: { code: 3000, message: '请输入密码' },
  INVALID_PASSWORD: { code: 3001, message: '密码长度应为6-20个字符' },
  PASSWORD_MISMATCH: { code: 3002, message: '两次密码输入不一致' },
  WRONG_PASSWORD: { code: 3003, message: '密码错误' },
  
  // 验证码相关
  CODE_REQUIRED: { code: 4000, message: '请输入验证码' },
  INVALID_CODE: { code: 4001, message: '验证码格式不正确' },
  CODE_EXPIRED: { code: 4002, message: '验证码已过期' },
  CODE_MISMATCH: { code: 4003, message: '验证码错误' },
  CODE_SEND_LIMIT: { code: 4004, message: '发送过于频繁，请稍后再试' }
}

module.exports = {
  ErrorCodes
}
