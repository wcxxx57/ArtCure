// utils/errorCodes.js
const ErrorCodes = {
  // 账号相关
  ACCOUNT_REQUIRED: {
    code: 1001,
    message: '请输入账号'
  },
  INVALID_ACCOUNT: {
    code: 1002,
    message: '账号格式不正确'
  },
  ACCOUNT_NOT_EXIST: {
    code: 1003,
    message: '账号不存在'
  },
  ACCOUNT_ALREADY_EXISTS: {
    code: 1004,
    message: '账号已存在'
  },

  // 密码相关
  PASSWORD_REQUIRED: {
    code: 2001,
    message: '请输入密码'
  },
  INVALID_PASSWORD: {
    code: 2002,
    message: '密码格式不正确（6-20位）'
  },
  PASSWORD_MISMATCH: {
    code: 2003,
    message: '两次密码不一致'
  },
  PASSWORD_INCORRECT: {
    code: 2004,
    message: '密码错误'
  },

  // 验证码相关
  CODE_REQUIRED: {
    code: 3001,
    message: '请输入验证码'
  },
  CODE_INVALID: {
    code: 3002,
    message: '验证码错误'
  },
  CODE_EXPIRED: {
    code: 3003,
    message: '验证码已过期'
  },

  // 通用错误
  NETWORK_ERROR: {
    code: 9001,
    message: '网络错误，请稍后重试'
  },
  SERVER_ERROR: {
    code: 9002,
    message: '服务器错误'
  },
  UNKNOWN_ERROR: {
    code: 9999,
    message: '未知错误'
  }
}

module.exports = {
  ErrorCodes
}
