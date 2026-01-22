// 邮件模板

/**
 * 生成验证码邮件HTML内容
 * @param {string} code - 验证码
 * @param {number} expiresMinutes - 过期时间（分钟）
 * @returns {string} HTML内容
 */
function getVerificationEmailHtml(code, expiresMinutes = 5) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证码</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Microsoft YaHei', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
          
          <!-- 头部 -->
          <tr>
            <td style="background: linear-gradient(135deg, #FFE5F0 0%, #FFF8DC 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">疗愈小程序</h1>
              <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px;">坚持疗愈，遇见更好的自己</p>
            </td>
          </tr>
          
          <!-- 内容 -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;">验证码</h2>
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                您正在注册疗愈小程序账号，您的验证码是：
              </p>
              
              <!-- 验证码 -->
              <div style="background: linear-gradient(135deg, #FFE5F0 0%, #FFF8DC 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                <div style="font-size: 36px; font-weight: bold; color: #FF69B4; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>
              
              <p style="margin: 0 0 15px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                ⏰ 验证码有效期为 <strong style="color: #FF69B4;">${expiresMinutes} 分钟</strong>，请尽快完成验证。
              </p>
              <p style="margin: 0 0 15px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                🔒 为了您的账号安全，请勿将验证码告诉他人。
              </p>
              <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.6;">
                ❓ 如果这不是您本人的操作，请忽略此邮件。
              </p>
            </td>
          </tr>
          
          <!-- 底部 -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                此邮件由系统自动发送，请勿直接回复
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                © 2026 疗愈小程序 · 用心疗愈，温暖相伴
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * 生成验证码邮件纯文本内容（备用）
 * @param {string} code - 验证码
 * @param {number} expiresMinutes - 过期时间（分钟）
 * @returns {string} 纯文本内容
 */
function getVerificationEmailText(code, expiresMinutes = 5) {
  return `
【疗愈小程序】验证码

您正在注册疗愈小程序账号，您的验证码是：

${code}

验证码有效期为 ${expiresMinutes} 分钟，请尽快完成验证。

为了您的账号安全，请勿将验证码告诉他人。

如果这不是您本人的操作，请忽略此邮件。

---
此邮件由系统自动发送，请勿直接回复
© 2026 疗愈小程序
  `.trim()
}

module.exports = {
  getVerificationEmailHtml,
  getVerificationEmailText
}
