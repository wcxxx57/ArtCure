# ArtCure 运行步骤说明指南

> 本指南按当前目录代码包的实际结构整理，适用于本地开发、微信开发者工具快速体验、云开发联调，以及在 vivo 手机上通过微信小程序预览/体验版运行。

## 1. 项目组成

当前代码包不是传统 Web 前端项目，根目录没有统一的 `npm install && npm run dev` 启动入口。实际运行由三部分组成：

| 模块 | 目录 | 作用 | 是否必须 |
| --- | --- | --- | --- |
| 微信小程序前端 | `miniprogram/` | 原生微信小程序页面、样式、交互逻辑 | 必须 |
| 微信云函数 | `cloudfunctions/` | 登录注册、心情记录、计划、活动、vivo AIGC 网关等后端逻辑 | 必须 |
| 本地/服务器 RAG AI 服务 | `ai-server/` | FastAPI + FAISS + DeepSeek 的旧版/可选 RAG 对话服务 | 可选 |
| 数据与文档 | `data_collection/`, `docs_ai/` | 数据采集、资源库、设计与部署说明 | 运行主流程不必须 |

当前小程序 AI 主路径主要调用 `cloudfunctions/vivoAigcGateway`：

```js
wx.cloud.callFunction({
  name: 'vivoAigcGateway',
  data: {
    action: 'chat.complete',
    data: {}
  }
})
```

`cloudfunctions/askAI` 和 `ai-server/` 仍保留，可用于本地 RAG 服务或独立服务器部署，但不是当前 `ai-chat` 页面的主调用路径。

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

4. Python 3.9+  
   仅当你要启动 `ai-server/` RAG 服务时需要。

5. vivo / 九问相关 API Key  
   当前 `vivoAigcGateway` 的完整 AI 能力需要配置：

   ```txt
   VIVO_APP_KEY
   JIUWEN_API_KEY
   ```

   没有密钥时，部分页面仍可看 UI 和本地降级回复，但蓝心大模型、语音识别、图像分析、POI 搜索等能力不会完整工作。

### 2.2 不需要做的事

根目录没有 `package.json`，因此不需要在根目录执行：

```bash
npm install
npm run dev
```

小程序前端也没有独立构建脚本，直接用微信开发者工具打开项目即可。

## 3. 最快启动体验

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
askAI
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
vivoAigcGateway
wxPay
```

其中：

| 云函数 | 说明 |
| --- | --- |
| `vivoAigcGateway` | 当前 AI 对话、绘画分析、语音识别、POI 推荐的核心网关 |
| `moodTracking`, `moodRecommendation` | 首页心情记录与推荐 |
| `planManagement`, `planGenerator` | 疗愈计划管理与 AI 计划生成 |
| `login`, `register`, `sendVerificationCode`, `changePassword`, `updateUserInfo` | 用户账号体系 |
| `healingActivities`, `chatMessage` | 活动预约、咨询消息 |
| `healingResources`, `shops` | 疗愈资源/店铺数据接口 |
| `askAI` | 可选 RAG AI 服务器桥接云函数 |
| `wxPay` | 支付占位/联调函数，当前包含待替换商户配置 |
| `quickstartFunctions` | 微信云开发示例函数，可选 |

空目录 `addMoodRecord`、`getMoodRecords`、`poiSearch` 当前没有实际文件，不作为部署项。

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

## 4. 云函数依赖安装方式

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

通常比赛演示只需要云端安装依赖，不需要把 `node_modules` 打包进小程序。

## 5. AI 能力配置与验证

### 5.1 vivoAigcGateway 当前支持的 action

| action | 用途 | 关键依赖 |
| --- | --- | --- |
| `chat.complete` | AI 对话、沉浸引导文本生成 | `VIVO_APP_KEY`，可回退到本地引导 |
| `artwork.analyze` | 绘画/图片分析 | `JIUWEN_API_KEY` |
| `resource.recommend` | vivo POI 地点搜索 | `VIVO_APP_KEY` |
| `voice.asrShort` | 实时短语音识别 | `VIVO_APP_KEY` |
| `text.embedding` | vivo 文本向量 | `VIVO_APP_KEY` |
| `text.rerank` | vivo 文本相似度重排 | `VIVO_APP_KEY` |
| `voice.tts` | 语音播报占位 | 当前为 mock 返回 |

### 5.2 没有密钥时的表现

| 功能 | 没有密钥时 |
| --- | --- |
| AI 聊天 | 前端会捕获错误并使用本地降级回复，能看基础体验 |
| 三分钟沉浸引导 | 可使用本地引导文案兜底 |
| 绘画分析 | 会返回缺少 `JIUWEN_API_KEY` 的错误 |
| 语音识别 | 会返回 `VIVO_KEY_MISSING` |
| POI 推荐 | 返回空结果或错误提示 |
| 文本向量/重排 | 返回 `VIVO_KEY_MISSING` |

### 5.3 云函数测试示例

在微信开发者工具的云函数测试中，可以用以下事件测试 `vivoAigcGateway`：

```json
{
  "action": "chat.complete",
  "data": {
    "scene": "voice_companion",
    "mode": "therapist",
    "inputType": "text",
    "prompt": "最近压力很大，想用绘画放松一下",
    "messages": [
      {
        "role": "user",
        "content": "最近压力很大，想用绘画放松一下"
      }
    ]
  }
}
```

预期结果：

```json
{
  "success": true,
  "reply": "...",
  "source": "vivo"
}
```

如果返回 `VIVO_KEY_MISSING`，说明云函数没有读到 `VIVO_APP_KEY`，需要检查环境变量并重新部署。

## 6. 可选：启动 ai-server RAG 服务

当前 `ai-server/` 是 FastAPI + FAISS + DeepSeek 的 RAG 服务。它不是当前 AI 对话页的主路径，但可以通过 `askAI` 云函数接入，或用于本地验证知识库检索效果。

### 6.1 安装 Python 依赖

Windows PowerShell：

```powershell
cd E:\ArtCure\ai-server
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

如果 PowerShell 阻止激活脚本，当前窗口临时放开策略：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

### 6.2 配置环境变量

复制模板：

```powershell
Copy-Item .env.example .env
```

在 `.env` 中填写：

```txt
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_API_BASE=https://api.deepseek.com
HOST=0.0.0.0
PORT=8000
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.7
```

可选：如果希望本地 RAG 检索也使用 vivo rerank：

```txt
VIVO_APP_KEY=你的 vivo API Key
VIVO_API_BASE=https://api-ai.vivo.com.cn
VIVO_RERANK_MODEL=bge-reranker-large
```

不要提交 `.env`。

### 6.3 构建向量索引

当前代码包中已存在：

```txt
ai-server/vector_index/
ai-server/resource_vector_index/
```

如果索引缺失，或更新了知识库/资源数据，重新构建：

```powershell
cd E:\ArtCure\ai-server
python build_index.py
python build_resource_index.py
```

说明：

| 脚本 | 输入 | 输出 |
| --- | --- | --- |
| `build_index.py` | `ai-server/knowledge_base/*.txt` | `ai-server/vector_index/` |
| `build_resource_index.py` | `data_collection/processed_data/xhs_sample_resources.json` 和 `data_collection/extracted_notes/*.md` | `ai-server/resource_vector_index/` |

首次下载 BGE 模型可能较慢。网络慢时可临时设置 HuggingFace 镜像：

```powershell
$env:HF_ENDPOINT="https://hf-mirror.com"
python build_index.py
```

### 6.4 启动服务

```powershell
cd E:\ArtCure\ai-server
.\venv\Scripts\Activate.ps1
python main.py
```

默认监听：

```txt
http://0.0.0.0:8000
```

本机健康检查：

```powershell
curl http://127.0.0.1:8000/health
```

对话测试：

```powershell
curl -Method POST http://127.0.0.1:8000/chat `
  -ContentType "application/json" `
  -Body '{"user_id":"test_user","query":"最近失眠怎么办？","mode":"therapist"}'
```

### 6.5 通过 askAI 云函数接入 RAG 服务

`cloudfunctions/askAI/index.js` 读取：

```js
const AI_SERVER_URL = process.env.AI_SERVER_URL || null
```

在 `askAI` 云函数环境变量中配置：

```txt
AI_SERVER_URL=http://你的服务器地址:8000
```

然后重新部署：

```txt
cloudfunctions/askAI -> 上传并部署：云端安装依赖
```

注意：

1. 微信云函数无法访问你电脑上的 `127.0.0.1:8000`。
2. 如果要让云函数调用本地电脑，需要可访问的公网地址、内网穿透，或部署到云服务器。
3. 真机调试也不能访问电脑的 `127.0.0.1`，需要局域网 IP、公网服务或云函数转发。

## 7. 在 vivo 手机上运行

比赛要求最终能在 vivo 手机上运行。当前作品形态是微信小程序，因此推荐用以下方式验证：

### 7.1 开发阶段真机预览

1. 在微信开发者工具中完成编译。
2. 点击“预览”生成二维码。
3. 用 vivo 手机微信扫码。
4. 进入小程序体验核心页面。

开发阶段如果依赖云函数，手机只需要能访问微信云开发服务即可；如果页面直接访问本地服务，则必须把服务暴露为手机可访问地址。

### 7.2 比赛/评审体验版

1. 确认所有核心云函数已部署到目标云环境。
2. 确认 `miniprogram/app.js` 的 `env` 是目标云环境 ID。
3. 确认 `vivoAigcGateway` 已配置云函数环境变量。
4. 在微信开发者工具点击“上传”。
5. 在微信公众平台将上传版本设为体验版。
6. 将评审人员加入体验成员，或按比赛要求提交体验入口。
7. 使用 vivo 手机微信打开体验版验证。

建议提交前至少验证：

```txt
AI 文本对话
三分钟沉浸引导
绘画/图片分析
语音识别
疗愈馆资源推荐
计划生成与打卡
登录注册/用户资料
```

## 8. 推荐演示流程

用于比赛评审或快速展示：

1. 进入首页，完成一次心情记录。
2. 进入 AI 对话页，分别演示：
   - 树洞模式：情绪倾诉与温暖回应。
   - 疗愈师模式：艺术疗愈方法建议。
   - 日常陪伴：轻量聊天。
3. 点击“三分钟引导”，演示语音/文字沉浸式疗愈流程。
4. 进入创作分析页，上传或绘制作品，让 AI 输出观察与练习建议。
5. 进入疗愈馆，演示资源筛选、详情页、附近资源/POI 推荐。
6. 进入疗愈计划，生成或查看计划，完成打卡。
7. 如时间允许，演示活动预约和咨询聊天。

## 9. 常见问题排查

### 9.1 云函数找不到

检查：

1. `miniprogram/app.js` 中 `env` 是否是当前云环境。
2. 目标云环境中是否部署了对应云函数。
3. 前端调用的 `name` 是否与云函数目录名一致。

### 9.2 vivoAigcGateway 返回 VIVO_KEY_MISSING

检查：

1. `vivoAigcGateway` 云函数环境变量是否配置 `VIVO_APP_KEY`。
2. 配置后是否重新部署云函数。
3. 是否部署到了小程序当前使用的云环境。

### 9.3 绘画分析返回 JIUWEN_KEY_MISSING

检查：

1. 是否配置 `JIUWEN_API_KEY`。
2. 图片是否成功上传到云存储。
3. 云函数日志里是否有九问媒体上传失败信息。

### 9.4 语音识别失败

检查：

1. vivo 手机/微信是否授权麦克风。
2. `vivoAigcGateway` 是否配置 `VIVO_APP_KEY`。
3. 录音格式是否保持为当前代码要求的 16k/16bit 单声道 PCM。
4. 云函数日志中是否出现 ASR 超时或 WebSocket 连接错误。

### 9.5 ai-server 启动失败

常见原因：

1. 没有 `.env` 或 `DEEPSEEK_API_KEY` 为空。
2. `vector_index/index.faiss` 或 `vector_index/index.pkl` 缺失。
3. Python 依赖未安装完整。
4. 首次下载 embedding 模型失败。
5. 8000 端口被占用。

检查命令：

```powershell
cd E:\ArtCure\ai-server
Test-Path .env
Test-Path .\vector_index\index.faiss
Test-Path .\vector_index\index.pkl
python main.py
```

### 9.6 真机能打开页面，但 AI 没反应

优先看：

1. 微信开发者工具云函数日志。
2. `vivoAigcGateway` 是否部署到正确云环境。
3. 环境变量是否配置在云端，而不是只写在本地。
4. 小程序端是否捕获错误并进入本地降级回复。

### 9.7 支付功能不能用

`cloudfunctions/wxPay/index.js` 当前仍有待替换的商户配置，例如子商户号。比赛演示如果不重点展示支付，建议把预约支付视为占位能力；如果要演示真实支付，需要先完成微信支付商户号、云支付权限和回调函数配置。

## 10. 交付前检查清单

### 本地/开发者工具

- [ ] 微信开发者工具能正常导入 `E:\ArtCure`。
- [ ] `miniprogram/app.js` 云环境 ID 正确。
- [ ] `vivoAigcGateway` 已部署并能测试通过。
- [ ] 核心业务云函数已部署。
- [ ] 云数据库集合已创建。
- [ ] 主要页面无编译错误。

### AI 能力

- [ ] `VIVO_APP_KEY` 已在云函数环境变量配置。
- [ ] `JIUWEN_API_KEY` 已在云函数环境变量配置。
- [ ] AI 文本对话可返回远端结果。
- [ ] 绘画分析可返回结构化结果。
- [ ] 语音识别可在真机上识别短语音。
- [ ] POI 推荐可返回地点线索。

### vivo 真机/比赛体验

- [ ] 已通过 vivo 手机微信扫码预览。
- [ ] 已上传体验版并验证入口。
- [ ] 关闭本地服务后，核心演示路径仍可通过云函数工作。
- [ ] 不依赖本机 `127.0.0.1`。
- [ ] 不在公开材料中泄露 API Key。

## 11. 一句话启动路线

如果只想最快跑起来：

```txt
微信开发者工具导入 E:\ArtCure
-> 确认 miniprogram/app.js 的云环境 ID
-> 部署 vivoAigcGateway：上传并部署（云端安装依赖）
-> 给 vivoAigcGateway 配置 VIVO_APP_KEY / JIUWEN_API_KEY
-> 创建必要数据库集合
-> 编译
-> 预览到 vivo 手机微信体验
```

如果还要跑本地 RAG 服务：

```powershell
cd E:\ArtCure\ai-server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python build_index.py
python build_resource_index.py
python main.py
```
