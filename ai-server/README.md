# 艺术疗愈 AI 服务器

基于 RAG (检索增强生成) 的智能艺术疗愈对话系统。

## 架构说明

```
用户 (小程序) 
    ↓ 
微信云函数 (askAI) 
    ↓ 
AI 服务器 (本项目)
    ├── RAG 检索 (FAISS + BGE)  ← 本地运行
    └── LLM 生成 (DeepSeek API) ← 调用外部 API
```

## 快速开始

### 1. 环境准备

```bash
# 进入 ai-server 目录
cd ai-server

# 创建虚拟环境（推荐）
python -m venv venv
# 注意：venv/ 文件夹包含所有Python依赖，体积较大（几百MB+）
# ⚠️  不要将 venv/ 文件夹上传到 Git，确保 .gitignore 包含 venv/

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置 API Key

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 DeepSeek API Key
# DEEPSEEK_API_KEY=sk-your-api-key-here
```

**获取 DeepSeek API Key:**
1. 访问 https://platform.deepseek.com/
2. 注册并登录
3. 在 API Keys 页面创建新的 Key
4. 复制 Key 到 .env 文件

### 3. 构建向量数据库

首次运行或更新知识库后，需要构建向量索引：

```bash
python build_index.py
```

输出示例：
```
==================================================
艺术疗愈知识库 - 向量数据库构建
==================================================
[1/3] 加载知识库文档...
共加载 2 个文档
[2/3] 分割文档...
文档分割完成，共 45 个片段
[3/3] 构建向量数据库...
正在初始化 Embedding 模型...
正在构建向量库...
向量库已保存到: vector_index
==================================================
✅ 向量数据库构建完成！
==================================================
```

### 4. 启动服务器

```bash
python main.py
```

服务器将在 `http://0.0.0.0:8000` 启动。

### 5. 测试 API

```bash
# 健康检查
curl http://localhost:8000/health

# 测试对话
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "query": "我最近失眠怎么办？",
    "mode": "therapist"
  }'
```

## 部署到云服务器

### 1. 选择服务器

推荐配置：
- **入门**：2核 4G 内存（约 50-100 元/月）
- **推荐**：4核 8G 内存（约 100-200 元/月）

推荐云服务商：
- 阿里云 ECS
- 腾讯云 CVM
- 华为云 ECS

### 2. 服务器设置

```bash
# 安装 Python 3.9+
sudo apt update
sudo apt install python3.9 python3.9-venv python3-pip

# 克隆/上传代码
git clone your-repo-url
cd ai-server

# 安装依赖
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 构建向量库
python build_index.py
```

### 3. 使用 systemd 管理服务

创建服务文件 `/etc/systemd/system/ai-server.service`：

```ini
[Unit]
Description=Art Healing AI Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/ai-server
Environment=PATH=/path/to/ai-server/venv/bin
ExecStart=/path/to/ai-server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start ai-server
sudo systemctl enable ai-server
sudo systemctl status ai-server
```

### 4. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
}
```

### 5. 更新云函数配置

在微信开发者工具中：

1. 打开 `cloudfunctions/askAI/index.js`
2. 修改 `AI_SERVER_URL` 为你的服务器地址：
   ```javascript
   const AI_SERVER_URL = 'http://your-server-ip:8000'
   // 或使用域名
   const AI_SERVER_URL = 'https://your-domain.com'
   ```
3. 右键点击 `askAI` 文件夹，选择"上传并部署：云端安装依赖"

## 知识库管理

### 添加新知识

1. 在 `knowledge_base/` 目录下创建新的 `.txt` 文件
2. 按照现有格式编写内容（建议使用 Markdown 格式）
3. 重新运行 `python build_index.py`
4. 重启服务器

### 知识库格式建议

```markdown
# 主题标题

## 一、子主题1

### 1. 要点1
- 详细内容...

### 2. 要点2
- 详细内容...

## 二、子主题2
...
```

## API 文档

### POST /chat

AI 对话接口

**请求参数：**
```json
{
  "user_id": "用户唯一标识",
  "query": "用户问题",
  "mode": "对话模式 (comfort/therapist/companion)",
  "user_profile": "用户画像信息（可选）",
  "chat_history": "历史对话（可选）"
}
```

**响应：**
```json
{
  "success": true,
  "reply": "AI 回复内容",
  "sources": ["来源信息"]
}
```

### GET /health

健康检查接口

### POST /search

知识库搜索接口（调试用）

## 常见问题

### Q: 首次运行时下载模型很慢？
A: BGE 模型约 100MB，首次会自动下载。可以使用国内镜像：
```bash
export HF_ENDPOINT=https://hf-mirror.com
```

### Q: API 调用超时？
A: 检查网络连接，或者增加超时时间。DeepSeek API 通常响应在 2-5 秒。

### Q: 如何更换 LLM？
A: 修改 `.env` 文件中的 `LLM_MODEL` 和相关 API 配置。支持任何兼容 OpenAI 协议的 API。

## 成本估算

| 项目 | 估算费用 |
|------|---------|
| 云服务器 (2核4G) | 50-100 元/月 |
| DeepSeek API | ~0.001 元/次请求 |
| **总计** | **约 50-150 元/月** |

*实际费用取决于使用量和云服务商定价*
