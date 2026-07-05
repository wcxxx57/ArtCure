# ArtCure 运行步骤说明指南

## 1. 项目组成

| 模块 | 目录 | 作用 | 是否必须 |
| --- | --- | --- | --- |
| 微信小程序前端 | `miniprogram/` | 原生微信小程序页面、样式、交互逻辑 | 必须 |
| 微信云函数 | `cloudfunctions/` | 登录注册、心情记录、计划、活动、vivo AIGC 网关等后端逻辑 | 必须 |

## 2. 环境准备

### 2.1 必备软件

1. 微信开发者工具  
   用于导入小程序、编译、预览、上传体验版、部署云函数。

2. 微信小程序账号与云开发环境  
   当前 `project.config.json` 中的 AppID 是：

   ```txt
   wx84121e923348e4b1
   ```

   当前前端默认云环境 ID 写在 `miniprogram/app.js`：

   ```txt
   cloud1-6gb6ikh75cd75d25
   ```

   如果使用自己的云开发环境，需要同步修改 `miniprogram/app.js` 里的 `env`。

3. Node.js  

   用于云函数依赖安装。建议使用 Node.js 16 或 18。

5. vivo蓝心 / 九问相关 API Key  
   当前 `vivoAigcGateway` 的完整 AI 能力需要配置：

   ```txt
   VIVO_APP_KEY
   JIUWEN_API_KEY
   ```

   没有密钥时，部分页面仍可看 UI 和本地降级回复，但蓝心大模型、语音识别、图像分析、POI 搜索等能力不会完整工作。

## 3. 从 0 开始完整复现

### 3.1 创建或准备微信小程序 AppID

1. 登录微信公众平台。

2. 创建小程序，或使用已有小程序。

3. 在小程序后台找到 AppID，格式类似：

   ```txt
   wx1234567890abcdef
   ```

### 3.2 创建云开发环境

1. 打开微信开发者工具。
2. 使用你的 AppID 导入当前项目目录

3. 点击工具栏里的“云开发”。
4. 如果尚未开通，按提示开通云开发。
5. 创建一个云开发环境，比如命名为：

   ```txt
   artcure
   ```

6. 创建完成后，在云开发控制台复制环境 ID，格式类似：

   ```txt
   cloud1-xxxxxxxxxxxxxxxx
   ```

### 3.3 修改前端云环境 ID

打开 `miniprogram/app.js`，将 `env` 改成复制的的云环境 ID：

```js
this.globalData = {
  env: "你的云环境ID",
};
```

例如：

```js
this.globalData = {
  env: "cloud1-xxxxxxxxxxxxxxxx",
};
```

修改后保存。小程序前端所有 `wx.cloud.callFunction`、云存储上传、云数据库相关调用都会默认访问这个环境。

如果这里没有改，常见结果是：

```txt
云函数找不到
数据库为空
云函数环境变量不生效
提示没有权限
```

### 3.4 确认 project.config.json

当前 `project.config.json` 已声明：

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/"
}
```

微信开发者工具导入项目后，需要确认左侧能看到：

```txt
miniprogram
cloudfunctions
```

### 3.5 创建云数据库集合

进入微信开发者工具：

```txt
云开发 -> 数据库 -> 新建集合
```

依次创建以下集合：

| 集合名 | 用途 | 没有时的影响 |
| --- | --- | --- |
| `users` | 用户账号、昵称、偏好 | 登录/注册/个人资料异常 |
| `verification_codes` | 邮箱验证码 | 注册验证码异常 |
| `user_preferences` | 新用户问卷偏好 | 个性化偏好无法保存 |
| `mood_records` | 心情打卡记录 | 首页心情记录异常 |
| `mood_recommendations` | 心情推荐缓存 | 推荐功能无法缓存 |
| `user_plans` | 用户疗愈计划 | 计划列表、计划详情异常 |
| `check_in_records` | 计划打卡记录 | 打卡状态异常 |
| `activities` | 疗愈活动数据 | 活动列表云端数据为空 |
| `activity_bookings` | 活动预约记录 | 预约/我的活动异常 |
| `conversations` | 咨询会话 | 咨询聊天列表异常 |
| `messages` | 咨询消息 | 咨询消息异常 |
| `healing_resources` | 疗愈资源库 | 资源云端搜索为空 |
| `shops` | 店铺数据 | 店铺云端搜索为空 |

### 3.6 配置云函数环境变量

进入：

```txt
云开发 -> 云函数 -> vivoAigcGateway -> 配置 -> 环境变量
```

如果新环境里还没有 `vivoAigcGateway`，先按第 3.7 节把 `vivoAigcGateway` 上传部署一次；函数出现在云开发控制台后，再回来配置环境变量，并重新部署一次。

至少配置：

```txt
VIVO_APP_KEY=vivo API Key
JIUWEN_API_KEY=九问 API Key
```

推荐同时确认这些默认值，除非你的接口地址或模型名不同：

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

### 3.7 上传并部署云函数

在微信开发者工具左侧 `cloudfunctions/` 目录中，右键云函数目录，选择：

```txt
上传并部署：云端安装依赖
```

需要部署以下云函数：

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

| 云函数 | 说明 |
| --- | --- |
| `vivoAigcGateway` | AI 对话、绘画分析、语音识别、POI 推荐核心入口 |
| `moodTracking` | 首页心情记录 |
| `moodRecommendation` | 心情推荐 |
| `planManagement` | 疗愈计划、打卡 |
| `planGenerator` | AI 生成计划，依赖外部工作流服务 |
| `login`, `register`, `sendVerificationCode` | 账号体系 |
| `updateUserInfo`, `changePassword` | 用户资料和密码 |
| `userPreferences` | 问卷偏好 |
| `healingActivities`, `chatMessage` | 活动和咨询 |
| `healingResources`, `shops` | 资源/店铺云端查询 |

空目录 `addMoodRecord`、`getMoodRecords`、`poiSearch` 当前没有实际文件，不需要部署。

### 3.8 初始化数据

从 0 创建云环境后，数据库集合是空的。当前项目有两类数据来源：

1. 本地样例数据  
   疗愈馆和部分活动页面内置了本地样例：

   ```txt
   miniprogram/utils/sampleResources.js
   miniprogram/utils/sampleActivities.js
   ```

   因此即使 `healing_resources`、`shops`、`activities` 暂时为空，也能先看到部分页面内容。

2. 云数据库数据  
   如果要完整体验云端列表、搜索、预约和记录，需要向集合写入数据。

最小初始化建议：

| 集合 | 是否需要手动导入初始数据 | 建议 |
| --- | --- | --- |
| `users` | 不需要 | 注册/登录时自动写入 |
| `verification_codes` | 不需要 | 发送验证码时自动写入 |
| `user_preferences` | 不需要 | 问卷提交时自动写入 |
| `mood_records` | 不需要 | 心情打卡时自动写入 |
| `mood_recommendations` | 不需要 | 推荐生成时自动写入 |
| `user_plans` | 不需要 | 创建计划时自动写入 |
| `check_in_records` | 不需要 | 打卡时自动写入 |
| `activity_bookings` | 不需要 | 预约时自动写入 |
| `conversations`, `messages` | 不需要 | 咨询聊天时自动写入 |
| `activities` | 建议 | 若要云端活动列表有内容，需要导入 |
| `healing_resources` | 建议 | 若要云端资源搜索有内容，需要导入 |
| `shops` | 建议 | 若要云端店铺搜索有内容，需要导入 |

可以先在云开发控制台给 `activities` 新增一条测试数据：

```json
{
  "title": "周末流体画疗愈体验",
  "category": "painting",
  "reviewStatus": "approved",
  "startTime": "2026-07-20 14:00",
  "location": "上海市静安区",
  "price": 128,
  "cover": "",
  "description": "通过流体画和呼吸练习进行轻量情绪放松。"
}
```

给 `shops` 新增一条测试数据：

```json
{
  "name": "测试艺术疗愈工作室",
  "phone": "13800000000",
  "content": "提供绘画疗愈、冥想、颂钵体验",
  "address": "上海市静安区测试路 1 号",
  "rating": "4.8",
  "ratingNum": 4.8,
  "tags": ["绘画疗愈", "冥想", "颂钵"]
}
```

给 `healing_resources` 新增一条测试数据：

```json
{
  "title": "测试绘画疗愈工作坊",
  "description": "适合初次体验艺术疗愈的用户，通过色彩和线条表达近期情绪。",
  "resource_type": "workshop",
  "therapy_medium": ["fluid_art", "mandala"],
  "session_format": "group_workshop",
  "target_crowd": ["general"],
  "therapy_level": "level_1_relax",
  "mood_tags": ["anxiety", "stress"],
  "city": "上海",
  "district": "静安",
  "address_text": "上海市静安区测试路 1 号",
  "price_text": "128元/人",
  "price_value": 128,
  "source_platform": "partner",
  "is_active": true,
  "likes_count": 1,
  "healing_score": 80,
  "keywords": ["绘画疗愈", "流体画", "焦虑", "压力"]
}
```

如果只是比赛演示，建议先保证本地样例数据和核心 AI 流程可用，再逐步补充云端数据。

### 3.9 确认云存储

语音识别和图片分析会用到云存储临时文件：

| 功能 | 云存储用途 |
| --- | --- |
| AI 对话页语音识别 | 上传临时 PCM 语音文件到 `voice-healing/`，识别后尝试删除 |
| 创作/图片分析 | 上传用户绘画或图片，供 `vivoAigcGateway` 下载并转发到九问 |

一般不需要手动创建云存储目录，首次上传会自动生成路径。需要确认：

1. 当前云环境已开通云存储。
2. 云存储容量未超额。
3. 真机测试时微信已授权录音/相册/相机等必要权限。
4. 云函数下载的 `fileID` 属于同一个云环境。

### 3.10 本地设置、编译和预览

在微信开发者工具里确认：

```txt
详情 -> 本地设置 -> 不校验合法域名、web-view、TLS 版本以及 HTTPS 证书
```

本地调试可以打开该选项。体验版/正式版不要依赖它。

然后点击：

```txt
编译
```

如果编译通过，点击：

```txt
预览
```

用 vivo 手机微信扫码，验证真机体验。

### 3.11 从 0 部署后的验证顺序

按下面顺序验证最容易定位问题：

1. 打开小程序首页，确认页面能显示。
2. 进入 AI 对话页，发送一句文本，确认 `vivoAigcGateway` 能返回。
3. 在云函数日志里确认 `chat.complete` 没有 `VIVO_KEY_MISSING`。
4. 做一次心情打卡，确认 `mood_records` 有新记录。
5. 提交一次偏好问卷，确认 `user_preferences` 有新记录。
6. 创建或查看疗愈计划，确认 `user_plans` 和 `check_in_records` 正常。
7. 打开疗愈馆，确认本地样例资源可展示。
8. 如果配置了 `JIUWEN_API_KEY`，测试创作分析。
9. 如果配置了 vivo ASR 权限，测试短语音识别。

如果第 2 步失败，优先检查：

```txt
miniprogram/app.js 的 env
vivoAigcGateway 是否部署到同一个云环境
VIVO_APP_KEY 是否配置到 vivoAigcGateway
云函数是否重新部署
```

## 4. 已有环境的最快启动体验

适合先让项目在开发者工具中跑起来，验证页面、交互和云函数调用链。

### 步骤 1：用微信开发者工具导入项目

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择当前仓库根目录，例如：

   ```txt
   E:\ArtCure
   ```

4. AppID 使用项目配置中的 AppID，或使用你自己的 AppID。
5. 导入后确认工具识别到：

   ```txt
   miniprogramRoot: miniprogram/
   cloudfunctionRoot: cloudfunctions/
   ```

### 步骤 2：确认云开发环境

打开 `miniprogram/app.js`，确认：

```js
env: "cloud1-6gb6ikh75cd75d25"
```

如果你使用自己的云环境，将它改成自己的环境 ID。否则小程序前端会调用到错误的云开发环境，表现为云函数找不到、数据库为空或权限错误。

### 步骤 3：本地开发设置

本机 `project.private.config.json` 中当前已关闭 URL 合法域名校验：

```json
"urlCheck": false
```

在微信开发者工具里也可以手动确认：

```txt
详情 -> 本地设置 -> 不校验合法域名、web-view、TLS 版本以及 HTTPS 证书
```

这个设置只适合开发者工具调试。真机体验版、参赛提交或正式发布时，应优先通过云函数访问外部接口，并配置合法域名/服务域名。

### 步骤 4：部署核心云函数

至少先部署：

```txt
vivoAigcGateway
```

在微信开发者工具左侧找到 `cloudfunctions/vivoAigcGateway`，右键选择：

```txt
上传并部署：云端安装依赖
```

如果要完整体验账号、心情、计划、疗愈活动等功能，继续部署这些非空云函数目录：

```txt
changePassword
chatMessage
healingActivities
healingResources
login
moodRecommendation
moodTracking
planGenerator
planManagement
quickstartFunctions
register
sendVerificationCode
shops
updateUserInfo
userPreferences
```

### 步骤 5：配置 vivoAigcGateway 密钥

`vivoAigcGateway` 支持两种配置方式：

1. 云函数环境变量，推荐用于云端部署和比赛演示。
2. `cloudfunctions/vivoAigcGateway/config.local.js`，适合本地/临时演示。

推荐在微信开发者工具或云开发控制台的云函数环境变量中配置：

```txt
VIVO_APP_KEY=你的 vivo API Key
JIUWEN_API_KEY=你的九问 API Key
```

可选配置：

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

配置环境变量后，需要重新部署 `vivoAigcGateway`。

注意：不要把真实密钥写进公开文档、公开仓库或截图里。正式参赛部署建议统一放到云函数环境变量中。

### 步骤 6：创建云数据库集合

云函数会访问以下集合。为避免首次调用失败，建议在云开发控制台提前创建：

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
chat_history
shops
sales
```

说明：

| 集合 | 用途 |
| --- | --- |
| `users`, `verification_codes`, `user_preferences` | 登录注册、验证码、用户偏好 |
| `mood_records`, `mood_recommendations` | 情绪打卡与推荐缓存 |
| `user_plans`, `check_in_records` | 疗愈计划与打卡 |
| `activities`, `activity_bookings` | 疗愈活动和预约 |
| `conversations`, `messages` | 咨询/聊天记录 |
| `healing_resources`, `shops` | 线下资源和店铺 |
| `chat_history` | `askAI` 旧路径的对话记录 |
| `sales` | 微信云开发示例函数使用，可选 |

当前疗愈馆页面还内置了 `miniprogram/utils/sampleResources.js` 和 `miniprogram/utils/sampleActivities.js`，所以即使云数据库资源为空，也能先看到部分本地样例内容。

### 步骤 7：编译并体验

在微信开发者工具中点击：

```txt
编译
```

建议按这个顺序检查：

1. 首页 `pages/page1/index`：心情记录、推荐入口。
2. AI 对话 `pages/ai-chat/index`：树洞、疗愈师、日常陪伴三种模式。
3. 创作分析 `pages/create-analysis/index`：绘画/图片分析，依赖 `JIUWEN_API_KEY`。
4. 疗愈馆 `pages/healing-hall/index`：本地样例资源、vivo POI 推荐入口。
5. 位置资源 `pages/location-resources/index`：附近资源/搜索体验。
6. 疗愈计划 `pages/healing-plan/index`：计划列表、推荐、打卡。
7. 活动相关页面：活动列表、详情、预约、反馈。

## 5. 云函数依赖安装方式

每个云函数目录独立管理依赖，主要依赖如下：

| 云函数 | 依赖 |
| --- | --- |
| `vivoAigcGateway` | `wx-server-sdk`, `ws` |
| `askAI` | `wx-server-sdk`, `axios` |
| `login` | `wx-server-sdk`, `bcryptjs`, `jsonwebtoken` |
| `register`, `changePassword` | `wx-server-sdk`, `bcryptjs` |
| `sendVerificationCode` | `wx-server-sdk`, `nodemailer` |
| 其他业务函数 | 基本为 `wx-server-sdk` |

推荐用微信开发者工具右键云函数目录：

```txt
上传并部署：云端安装依赖
```

如果要本地预装依赖，可进入对应目录执行：

```powershell
cd E:\ArtCure\cloudfunctions\vivoAigcGateway
npm install
```

批量安装有 `package.json` 的云函数依赖可用：

```powershell
cd E:\ArtCure
Get-ChildItem .\cloudfunctions -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
  ForEach-Object {
    Push-Location $_.FullName
    npm install
    Pop-Location
  }
```
