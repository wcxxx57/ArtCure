# RAG ai艺术疗愈师

步骤

- 数据准备
- AI后端服务器搭建
- 微信云函数对接（链接小程序和服务器）

## 一、数据准备

要实现“专业艺术疗愈师”和“资源推荐”，你的数据需要分为两类处理：

**A. 非结构化知识（用于 RAG 检索 - 存入 FAISS）** 你需要收集并清洗以下文本，放入 `txt` 文件中进行 Embedding：

- **疗愈理论**：色彩心理学、曼陀罗绘画治疗原理、表达性艺术治疗方法论。
- **话术库**：专业咨询师的共情话术（参考 EmoLLM 的 JSON 数据）。
- **方案库**：针对焦虑、抑郁、压力大的通用艺术疗愈方案模板。

**B. 结构化资源（用于推荐 - 存入微信云数据库）** RAG 不擅长处理“筛选最近的店铺”或“按价格排序”。这部分数据应存入微信云数据库（JSON Database）。

- *集合名称：`healing_resources`*

- *字段设计*：

  ```json
  {
    "_id": "...",
    "name": "静心陶艺工坊",
    "type": "陶艺", // 标签：绘画、陶艺、音乐、舞动
    "location": { "latitude": ..., "longitude": ... },
    "tags": ["适合初学者", "解压", "亲子"],
    "description": "通过触碰泥土感受大地的连接...",
    "price": 128
  }
  ```

## 二、AI后端服务器搭建

架构： **“RAG 本地化 + LLM 云端化”**。

**核心优势：**

1. **成本极低**：你不再需要昂贵的 GPU 服务器（省下几万块显卡钱）。一台普通的 CPU 云服务器（如 2核 4G 或 4核 8G）就能跑起来。
2. **数据可控**：你的核心知识库（艺术疗愈资料、客户数据）存储在自己服务器的向量库中，只有检索出的那几条片段会被发送给 LLM。
3. **效果顶尖**：检索逻辑你自己写（RAG），生成逻辑用世界最强的大模型（GPT-4/Gemini 1.5/DeepSeek V3）。

以下是具体的实现流程和技术细节：

------

### 1. 系统架构图解

想象你的服务器是一个**“图书管理员”**（RAG），而外部 API（DeepSeek）是**“教授”**（LLM）。

1. **用户提问**：用户在小程序问“我最近失眠，怎么用画画缓解？”
2. **你的服务器（管理员）**：
   - 将问题转化为向量（使用轻量级本地模型）。
   - 在本地书架（FAISS）上快速翻找，找出《曼陀罗绘画治疗指南》中关于失眠的 3 个段落。
   - *这一步完全在你服务器发生，不依赖外网 API。*
3. **组装信件**：你的服务器把“用户问题”+“找出来的 3 个段落”写成一个 Prompt。
4. **外包思考（API 调用）**：将这个 Prompt 发送给 **DeepSeek**。
5. **教授回复**：DeepSeek 根据你提供的段落，组织语言生成回答。
6. **返回结果**：你的服务器收到回答，转发给小程序。

------

### 2. 具体代码实现流程 (Python + LangChain)

我们以 **DeepSeek V3 (兼容 OpenAI 协议)** 为例，因为它目前性价比极高且中文能力强。

#### 第一步：环境准备

你需要安装 LangChain 和 OpenAI 的库（DeepSeek 用 OpenAI 的 SDK），以及向量库 FAISS。

```bash
pip install langchain langchain-community langchain-openai faiss-cpu sentence-transformers
```

#### 第二步：本地 Embedding 与 向量库构建

这是 RAG 跑在你自己服务器上的部分。我们需要一个跑在 CPU 上的轻量级模型来把文字变成向量。

```python
import os
from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

# 1. 初始化本地 Embedding 模型 (完全免费，跑在本地 CPU)
# 模型会自动下载到你服务器缓存中
model_name = "BAAI/bge-small-zh-v1.5"
model_kwargs = {'device': 'cpu'} # 强制使用 CPU
encode_kwargs = {'normalize_embeddings': True}

embeddings = HuggingFaceBgeEmbeddings(
    model_name=model_name,
    model_kwargs=model_kwargs,
    encode_kwargs=encode_kwargs
)

# 2. 模拟加载你的艺术疗愈知识库 (实际开发中读取 TXT/PDF)
docs = [
    Document(page_content="曼陀罗绘画可以帮助整合内心冲突，特别适合焦虑和失眠人群。", metadata={"source": "theory_01"}),
    Document(page_content="流体画无需绘画基础，通过色彩流动释放潜意识压力。", metadata={"source": "theory_02"}),
    # ... 更多数据
]

# 3. 构建本地向量数据库
print("正在构建向量库...")
vector_store = FAISS.from_documents(docs, embeddings)
print("向量库构建完成！")

# 保存到本地磁盘，下次直接 load 即可，不用重新构建
vector_store.save_local("art_healing_index")
```

#### 第三步：接入外部 API 进行生成

这里我们将 DeepSeek 伪装成 OpenAI 的客户端接入 LangChain。

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# ================= 配置外部 API =================
# DeepSeek API Key (去 deepseek 官网申请)
DEEPSEEK_API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxx"

# 初始化 LLM (这里只是建立连接对象，不耗费服务器资源)
llm = ChatOpenAI(
    model='deepseek-chat', 
    openai_api_key=DEEPSEEK_API_KEY, 
    openai_api_base='https://api.deepseek.com', # 指向 DeepSeek 地址
    max_tokens=1024,
    temperature=0.7
)

# ================= RAG 流程串联 =================

# 1. 定义检索器
retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# 2. 定义 Prompt 模板 (人设 + 上下文)
template = """
你是一位专业的艺术疗愈顾问。请基于下面的【背景知识】回答用户的【问题】。
如果背景知识无法回答，请基于你的专业知识补充，但要说明来源。

【背景知识】：
{context}

【用户问题】：
{question}

请用温暖、共情、专业的语气回答：
"""

prompt = ChatPromptTemplate.from_template(template)

# 3. 构建 RAG 链 (LangChain LCEL 语法)
def format_docs(docs):
    return "\n\n".join([d.page_content for d in docs])

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# ================= 测试运行 =================
user_query = "我最近总是睡不着，有什么绘画方法推荐吗？"

print("开始检索并生成回答...")
response = rag_chain.invoke(user_query)
print("\n=== AI 回复 ===")
print(response)
```

------

### 4. 关键注意事项

1. **数据隐私与合规**：
   - 虽然 RAG 检索在本地，但最后生成的 Prompt（包含检索到的知识片段和用户问题）是会发送给 API 厂商的。
   - **在微信小程序的服务协议中，需要简要说明使用了第三方 AI 技术辅助生成**。
2. **延迟优化**：
   - 本地 Embedding (CPU) 耗时约 20-50ms。
   - FAISS 检索耗时 < 10ms。
   - 网络传输 + API 生成耗时 约 2-5秒。
   - 总体体验是可以接受的。

### 总结

这个方案**可行性极高**。

只需要维护一段 Python 代码（运行 RAG 逻辑），把繁重的“大脑思考”工作外包给 DeepSeek 。

既拥有了专属的知识库（RAG 在手），又享受了顶尖大模型的智商，同时还能**把服务器成本控制在最低**。

## 三、微信云函数对接

在微信开发者工具中，创建一个云函数 `askAI`。

```javascript
// cloudfunctions/askAI/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios') // 需要 npm install axios

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const { query, userLocation } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 1. 获取用户简易画像 (从云数据库查)
  const userRes = await db.collection('users').where({ _openid: openid }).get()
  const userProfile = userRes.data.length > 0 ? userRes.data[0].preference : "无偏好"

  // 2. (可选) 简单的关键词匹配推荐资源
  // 如果用户问“哪里有画室”，先在云数据库查一下
  let recommendData = ""
  if (query.includes("推荐") || query.includes("去哪")) {
      const recs = await db.collection('healing_resources').limit(3).get()
      recommendData = JSON.stringify(recs.data)
  }

  // 3. 请求你的 Python AI 服务器
  // 注意：AI_SERVER_URL 必须是公网可访问的 IP 或域名
  try {
    const response = await axios.post('http://YOUR_SERVER_IP:8000/chat', {
      user_id: openid,
      query: query,
      user_profile: `用户偏好:${userProfile}; 附近可能有这些资源:${recommendData}`
    })

    return {
      success: true,
      reply: response.data.reply
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```