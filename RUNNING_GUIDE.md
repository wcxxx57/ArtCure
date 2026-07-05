# ArtCure艺呦小程序运行指南

> 注：由于基于uniapp开发的微信小程序对于微信云生态依赖较大，我们也难以与评委老师们共享我们使用的云环境与权限，因此完整体验本项目需要麻烦评委老师们参考此指南创建自己的微信小程序账号、AppID 和云开发环境导入运行，可能较为复杂，敬请老师们见谅，有问题可以随时联系我们，谢谢老师们！
>

## 1. 项目组成

| 模块 | 目录 | 作用 |
| --- | --- | --- |
| 微信小程序前端 | `miniprogram/` | 原生微信小程序页面、样式、交互逻辑 |
| 微信云函数 | `cloudfunctions/` | 登录注册、心情记录、计划、活动、AI 网关等后端逻辑 |

后端调用统一通过微信云开发云函数完成，前端使用 `wx.cloud.callFunction({ name: 'functionName', data: {} })` 调用对应能力。

## 2. 运行前准备

1. 微信开发者工具
   用于导入项目、编译、预览、部署云函数。

2. 微信小程序 AppID
   不要依赖仓库里`env`中为我们的已有的开发者 AppID，评委老师们可以前往微信公共平台注册自己的小程序 AppID。

3. 微信云开发环境
   需要在小程序账号下开通云开发，并创建一个云环境。

4. vivo 蓝心 / 九问 API Key
   完整 AI 能力需要配置：

   ```txt
   VIVO_APP_KEY
   JIUWEN_API_KEY
   ```

   未配置密钥时，仍可查看主要页面、本地样例数据和部分降级体验；蓝心大模型、语音识别、图像分析、POI 搜索等能力不会完整工作。
   
   我们团队配置的KEY为
   
   ```txt
   VIVO_APP_KEY:sk-xuanji-2026887953-Yll6dGd3aHNOZWdCRUpBWg==
   JIUWEN_API_KEY:app-qqbm66soqK6GFmpFgNisboIy
   ```
   
   

## 3. 完整运行步骤

### 3.1 导入项目

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择仓库根目录

4. 选择自己的小程序 AppID。
5. 导入后确认工具识别到：

   ```txt
   miniprogramRoot: miniprogram/
   cloudfunctionRoot: cloudfunctions/
   ```

### 3.2 创建云开发环境

1. 在微信开发者工具中点击“云开发”。
2. 如果尚未开通云开发，按提示开通。
3. 新建一个云开发环境，例如命名为：

   ```txt
   artcure-review
   ```

4. 创建完成后复制环境 ID，格式类似：

   ```txt
   cloud1-xxxxxxxxxxxxxxxx
   ```

### 3.3 替换前端云环境 ID

打开 `miniprogram/app.js`，把 当前`env`中的开发者环境改成新创建的新的云环境 ID：

```js
this.globalData = {
  env: "cloud1-xxxxxxxxxxxxxxxx",
};
```

保存后，前端所有 `wx.cloud.callFunction`、云数据库和云存储调用都会访问这个云环境。

如果没有替换为自己的环境 ID，通常会出现：

```txt
云函数找不到
数据库为空
云函数环境变量不生效
没有权限访问云资源
```

### 3.4 部署云函数

在微信开发者工具左侧 `cloudfunctions/` 目录中，右键云函数目录，选择：

```txt
上传并部署：云端安装依赖
```

建议部署以下非空云函数目录：

```txt
vivoAigcGateway
moodTracking
moodRecommendation
planManagement
planGenerator
login
register
sendVerificationCode
updateUserInfo
changePassword
userPreferences
healingActivities
chatMessage
healingResources
shops
```

其中 `vivoAigcGateway` 是 AI 对话、绘画分析、语音识别、POI 推荐的核心入口，建议优先部署。

### 3.5 配置 AI 网关环境变量

进入：

```txt
云开发 -> 云函数 -> vivoAigcGateway -> 配置 -> 环境变量
```

配置密钥：

```txt
VIVO_APP_KEY=可使用的vivo API Key
JIUWEN_API_KEY=可使用的API Key
```

如需完整确认，可同时配置或保留以下默认值：

```txt
VIVO_API_BASE=https://api-ai.vivo.com.cn
VIVO_POI_BASE_URL=https://api-ai.vivo.com.cn
VIVO_WS_HOST=api-ai.vivo.com.cn
VIVO_CHAT_MODEL=Volc-DeepSeek-V3.2
VIVO_VISION_MODEL=Volc-DeepSeek-V3.2
VIVO_EMBEDDING_MODEL=bge-base-zh-v1.5
VIVO_RERANK_MODEL=bge-reranker-large
VIVO_ASR_PACKAGE=artcure.miniprogram
VIVO_ASR_ENGINE_ID=shortasrinput
VIVO_ASR_TIMEOUT_MS=70000
JIUWEN_BASE_URL=https://jiuwen.vivo.com.cn/v1
JIUWEN_CHAT_MESSAGES_PATH=/chat-messages
JIUWEN_MEDIA_UPLOAD_PATH=/files/media-upload
```

配置环境变量后，需要重新部署 `vivoAigcGateway`，否则新变量可能不生效。

### 3.6 创建云数据库集合

进入：

```txt
云开发 -> 数据库 -> 新建集合
```

创建以下集合：

```txt
users
verification_codes
user_preferences
mood_records
mood_recommendations
user_plans
check_in_records
activities
activity_bookings
conversations
messages
healing_resources
shops
```

说明：

| 集合 | 用途 |
| --- | --- |
| `users`, `verification_codes`, `user_preferences` | 登录注册、验证码、用户偏好 |
| `mood_records`, `mood_recommendations` | 情绪打卡与推荐缓存 |
| `user_plans`, `check_in_records` | 疗愈计划与打卡 |
| `activities`, `activity_bookings` | 疗愈活动与预约 |
| `conversations`, `messages` | 咨询/聊天记录 |
| `healing_resources`, `shops` | 疗愈资源和店铺 |

这些集合首次创建后可以为空。登录、问卷、心情打卡、计划、咨询等记录会在使用时自动写入。

疗愈馆页面内置了本地样例数据：

```txt
miniprogram/utils/sampleResources.js
miniprogram/utils/sampleActivities.js
```

因此即使 `activities`、`healing_resources`、`shops` 暂时为空，也可以先看到部分演示内容。若老师们希望测试云端活动、资源或店铺列表，可在对应集合中手动添加测试数据。

语音识别和图片分析会使用云存储临时文件。通常不需要手动创建目录，但需要云环境已经开通云存储，并在真机测试时授权微信录音、相册或相机权限。

### 3.7 编译和真机预览

本地调试时，可以在微信开发者工具中确认：

```txt
详情 -> 本地设置 -> 不校验合法域名、web-view、TLS 版本以及 HTTPS 证书
```

该设置只用于本地调试。体验版、参赛提交或正式发布不应依赖它。

然后点击：

```txt
编译
```

编译通过后点击：

```txt
预览
```

建议使用手机微信扫码体验，验证真实移动端效果。

## 4. 建议验证顺序

按以下顺序检查，最容易定位问题：

1. 首页 `pages/page1/index`：页面可显示，心情记录入口正常。
2. AI 对话 `pages/ai-chat/index`：发送一句文本，确认 `vivoAigcGateway` 能返回。
3. 云函数日志：确认 `chat.complete` 没有 `VIVO_KEY_MISSING`。
4. 心情打卡：确认 `mood_records` 有新记录。
5. 偏好问卷：确认 `user_preferences` 有新记录。
6. 疗愈计划 `pages/healing-plan/index`：确认计划生成、列表和打卡可用。
7. 创作分析 `pages/create-analysis/index`：配置 `JIUWEN_API_KEY` 后测试绘画/图片分析。
8. AI 对话语音输入：配置 vivo ASR 权限后测试短语音识别。
9. 疗愈馆 `pages/healing-hall/index`：确认本地样例资源、云端资源或 vivo POI 推荐入口可展示。
10. 位置资源 `pages/location-resources/index`：测试附近资源/搜索体验。
11. 活动相关页面：测试活动列表、详情、预约、反馈。

## 5. 云函数依赖说明

通常不需要手动执行 `npm install`。推荐在微信开发者工具中对每个云函数选择：

```txt
上传并部署：云端安装依赖
```

当前主要依赖如下：

| 云函数 | 依赖 |
| --- | --- |
| `vivoAigcGateway` | `wx-server-sdk`, `ws` |
| `login` | `wx-server-sdk`, `bcryptjs`, `jsonwebtoken` |
| `register`, `changePassword` | `wx-server-sdk`, `bcryptjs` |
| `sendVerificationCode` | `wx-server-sdk`, `nodemailer` |
| 其他业务函数 | `wx-server-sdk` |
