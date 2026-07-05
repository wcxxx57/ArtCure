"""
艺术疗愈 AI 服务器
基于 RAG (检索增强生成) 的智能对话系统
"""

import os

# 解决 OpenMP 库冲突警告
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from pathlib import Path
from typing import Optional, List, Dict
from urllib import parse, request as url_request, error as url_error
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid
from datetime import datetime

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# 加载环境变量
load_dotenv()

# ==================== 配置 ====================

# API 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
VIVO_APP_KEY = os.getenv("VIVO_APP_KEY", "")
VIVO_API_BASE = os.getenv("VIVO_API_BASE", "https://api-ai.vivo.com.cn").rstrip("/")
VIVO_RERANK_MODEL = os.getenv("VIVO_RERANK_MODEL", "bge-reranker-large")
VIVO_RERANK_TIMEOUT = float(os.getenv("VIVO_RERANK_TIMEOUT", "8"))

# 模型配置
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
RAG_CANDIDATE_K = int(os.getenv("RAG_CANDIDATE_K", "8"))
RAG_CONTEXT_TOP_K = int(os.getenv("RAG_CONTEXT_TOP_K", "3"))
RAG_RESOURCE_CANDIDATE_K = int(os.getenv("RAG_RESOURCE_CANDIDATE_K", "12"))
RAG_RESOURCE_CONTEXT_TOP_K = int(os.getenv("RAG_RESOURCE_CONTEXT_TOP_K", "5"))

# 路径配置
INDEX_DIR = Path(__file__).parent / "vector_index"
RESOURCE_INDEX_DIR = Path(__file__).parent / "resource_vector_index"

# ==================== 初始化 ====================

app = FastAPI(
    title="艺术疗愈 AI 服务",
    description="基于 RAG 的智能艺术疗愈对话系统",
    version="1.0.0"
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量
vector_store = None
resource_vector_store = None  # 资源专用向量库
rag_chains = {}
user_sessions = {}  # 存储用户对话历史

# ==================== 数据模型 ====================

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    user_id: str
    query: str
    mode: str = "comfort"  # comfort | therapist | companion | resource_advisor
    user_profile: Optional[str] = None
    chat_history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    success: bool
    reply: str
    sources: Optional[List[str]] = None
    error: Optional[str] = None

# ==================== Prompt 模板 ====================

PROMPT_TEMPLATES = {
    "comfort": """你是"小云"，一个温暖的倾听者和树洞。你的特点是：
- 温柔、耐心、不评判，像一个贴心的朋友
- 善于倾听和共情，让用户感到被理解
- 提供情感支持和安慰，不急于给建议

【背景知识】：
{context}

【用户信息】：
{user_profile}

【近期对话历史】：
{chat_history}

【用户说】：
{question}

请用温暖、共情的语气回应。不要加“()"来表示语气。可以适当参考【背景知识】中的内容，但要用朋友般温暖自然的语气表达。如果对话历史不是"无历史记录"，说明我们之前有过交流，请自然地体现出你记得之前的内容；如果是"无历史记录"，这就是我们的初次见面，请友好地打招呼。回复要简洁真诚，不要太长。""",

    "therapist": """你是"小云疗愈师"，一位专业的艺术疗愈顾问。你的特点是：
- 专业、温和、有深度，具备扎实的心理学知识
- 精通艺术疗愈的各种方法：绘画、音乐、舞动、雕塑等
- 能够根据用户的具体情况制定个性化的疗愈方案
- 用通俗易懂的语言解释专业概念，循序渐进地指导

【专业知识库】：
{context}

【用户信息】：
{user_profile}

【治疗历史记录】：
{chat_history}

【用户问题】：
{question}

请基于专业知识提供个性化的艺术疗愈建议。如果治疗历史记录不是"无历史记录"，说明我们有过之前的咨询，请结合历史情况体现治疗的连续性和进展；如果是"无历史记录"，这是我们的初次咨询，请进行专业的初次评估和建议。对于严重心理问题，温和地建议寻求专业帮助。""",

    "companion": """你是"小云"，一个日常陪伴AI朋友。你的特点是：
- 说话自然，像真人朋友一样，不是很做作的那种，像个贴心的好朋友
- 善于发现生活中的美好，分享有趣的话题
- 偶尔调皮幽默，但总是很关心朋友的感受

【参考信息】：
{context}

【朋友资料】：
{user_profile}

【我们的聊天记录】：
{chat_history}

【朋友说】：
{question}

请用轻松、朋友般的语气回应。聊天长度和内容就和平常和好友在微信聊天那样。如果【参考信息】里有相关内容，可以自然地融入对话中，但不要生硬地照搬。如果聊天记录不是"无历史记录"，说明我们之前聊过天，请自然地提及之前的话题体现友谊的温暖；如果是"无历史记录"，这是我们第一次聊天，请开朗地自我介绍。可以适当使用表情符号，让对话更生动有趣。""",

    "resource_advisor": """你是"愈见AI资源顾问"，一位专业、高效的艺术疗愈资源推荐专家。你的特点是：
- 专业、理性、高效，快速理解用户需求
- 精通上海地区的各类艺术疗愈资源：工作坊、疗愈师、工作室等
- 能够根据用户的具体需求（疗愈类型、地点、预算、时间）精准推荐
- 提供详细的资源信息：价格、地址、联系方式、特色标签
- 语气专业但不失温度，像一位可靠的顾问

【资源知识库】：
{context}

【用户偏好】：
{user_profile}

【咨询历史】：
{chat_history}

【用户需求】：
{question}

请基于【资源知识库】中的真实资源信息，为用户提供精准的推荐。回复格式要求：

1. **开场**：简短回应用户需求（1-2句话）

2. **推荐资源**：为每个推荐的资源提供以下信息（使用清晰的结构）：
   - **资源名称**：标题
   - **类型**：工作坊/1v1/工作室/疗愈师等
   - **疗愈方式**：流体画/颂钵/冥想/舞动等
   - **价格**：具体价格
   - **地址**：详细地址和区域
   - **特色**：2-3个标签（如"零基础友好"、"预约制"、"性价比高"）
   - **推荐理由**：为什么推荐这个资源（结合用户需求）
   - **联系方式**：微信号或电话（如果有）
   - **来源**：小红书/大众点评

3. **补充建议**：根据用户需求提供额外的建议或注意事项

重要规则：
- 只推荐【资源知识库】中真实存在的资源，不要编造
- 每次推荐3-4个资源，不要太多
- 如果知识库中没有完全匹配的资源，推荐最接近的，并说明差异
- 如果用户询问具体某个资源的详情，提供该资源的完整信息
- 价格、地址、联系方式等关键信息必须准确
- 使用清晰的格式，方便用户快速浏览
- 如果咨询历史不是"无历史记录"，体现对之前对话的记忆
- 语气专业、高效，但保持友好和耐心"""
}

# ==================== 会话管理 ====================

def get_user_session(user_id: str, mode: str) -> List[ChatMessage]:
    """获取用户在特定模式下的对话历史"""
    session_key = f"{user_id}_{mode}"
    if session_key not in user_sessions:
        user_sessions[session_key] = []
    return user_sessions[session_key]

def add_to_session(user_id: str, mode: str, role: str, content: str):
    """添加消息到用户会话历史"""
    session_key = f"{user_id}_{mode}"
    if session_key not in user_sessions:
        user_sessions[session_key] = []
    
    message = ChatMessage(
        role=role,
        content=content,
        timestamp=datetime.now().isoformat()
    )
    
    user_sessions[session_key].append(message)
    
    # 保持最近20条对话，避免上下文过长
    if len(user_sessions[session_key]) > 20:
        user_sessions[session_key] = user_sessions[session_key][-20:]

def format_chat_history(messages: List[ChatMessage], max_messages: int = 6) -> str:
    """格式化对话历史为文本"""
    if not messages:
        return "无历史记录"
    
    # 取最近的几轮对话
    recent_messages = messages[-max_messages:] if len(messages) > max_messages else messages
    
    formatted = []
    for msg in recent_messages:
        role_name = "我" if msg.role == "assistant" else "你"
        formatted.append(f"{role_name}: {msg.content}")
    
    return "\n".join(formatted)

def enhance_query_with_context(question: str, chat_history: List[ChatMessage]) -> str:
    """
    智能地将对话上下文融入检索查询
    只在必要时添加上下文，避免引入过多噪音
    """
    if not chat_history:
        return question
    
    # 如果问题本身已经很完整（较长且包含关键信息），直接使用
    if len(question) > 20:
        return question
    
    # 获取最近1-2轮对话作为上下文（避免过多历史干扰）
    recent_messages = chat_history[-4:] if len(chat_history) > 4 else chat_history
    
    # 提取用户和AI最近提到的关键主题（取前50字符）
    context_snippets = []
    for msg in recent_messages:
        if len(msg.content) > 10:
            # 只取消息的核心部分，避免冗长
            snippet = msg.content[:50].strip()
            context_snippets.append(snippet)
    
    if not context_snippets:
        return question
    
    # 只取最近2条消息的片段
    recent_context = " ".join(context_snippets[-2:])
    
    # 组合：上下文片段 + 当前问题
    enhanced = f"{recent_context} {question}"
    
    return enhanced

# ==================== 核心函数 ====================

def load_faiss_local(index_dir: Path, embeddings):
    """Load FAISS via an ASCII relative path to avoid Windows non-ASCII path issues."""
    original_cwd = Path.cwd()
    try:
        os.chdir(index_dir.parent)
        return FAISS.load_local(
            index_dir.name,
            embeddings,
            allow_dangerous_deserialization=True
        )
    finally:
        os.chdir(original_cwd)

def init_embeddings():
    """初始化 Embedding 模型"""
    print(f"正在加载 Embedding 模型: {EMBEDDING_MODEL}")
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )

def init_llm():
    """初始化 LLM"""
    print(f"正在连接 LLM: {LLM_MODEL}")
    return ChatOpenAI(
        model=LLM_MODEL,
        openai_api_key=DEEPSEEK_API_KEY,
        openai_api_base=DEEPSEEK_API_BASE,
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE
    )

def load_vector_store(embeddings, index_dir=None):
    """加载向量数据库"""
    if index_dir is None:
        index_dir = INDEX_DIR
    
    if not index_dir.exists():
        raise FileNotFoundError(
            f"向量索引不存在: {index_dir}\n"
            "请先运行相应的构建脚本"
        )

    missing_files = [
        file_name
        for file_name in ("index.faiss", "index.pkl")
        if not (index_dir / file_name).exists()
    ]
    if missing_files:
        raise FileNotFoundError(
            f"向量索引文件不完整: {index_dir}\n"
            f"缺失文件: {', '.join(missing_files)}\n"
            "请在 ai-server 目录运行 python build_index.py 重新生成"
        )
    
    print(f"正在加载向量数据库: {index_dir}")
    return load_faiss_local(index_dir, embeddings)

def format_docs(docs):
    """格式化检索到的文档"""
    return "\n\n".join([d.page_content for d in docs])

def compact_text(text: str, max_len: int) -> str:
    """压缩文本，避免超过 vivo rerank 的 500 字限制。"""
    return " ".join((text or "").split())[:max_len]

def call_vivo_rerank(query: str, docs: List) -> Optional[List[float]]:
    """调用 vivo 文本相似度接口，对 FAISS 召回片段进行二次排序。"""
    if not VIVO_APP_KEY or not docs:
        return None

    compact_query = compact_text(query, 220)
    sentence_max_len = max(80, 500 - len(compact_query) - 20)
    sentences = [
        compact_text(doc.page_content, sentence_max_len)
        for doc in docs
    ]

    payload = json.dumps({
        "model_name": VIVO_RERANK_MODEL,
        "query": compact_query,
        "sentences": sentences
    }, ensure_ascii=False).encode("utf-8")

    request_id = str(uuid.uuid4())
    url = f"{VIVO_API_BASE}/rerank?{parse.urlencode({'requestId': request_id})}"
    req = url_request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VIVO_APP_KEY}"
        }
    )

    try:
        with url_request.urlopen(req, timeout=VIVO_RERANK_TIMEOUT) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except (url_error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"vivo 文本相似度重排失败，使用本地 FAISS 顺序: {exc}")
        return None

    scores = response_data.get("data")
    if not isinstance(scores, list) or len(scores) != len(docs):
        print(f"vivo 文本相似度返回格式异常，使用本地 FAISS 顺序: {response_data}")
        return None

    return [float(score) for score in scores]

def select_rag_docs(query: str, docs: List, top_k: int):
    """优先使用 vivo rerank 排序候选片段，失败时使用 FAISS 原顺序。"""
    if not docs:
        return [], "empty"

    scores = call_vivo_rerank(query, docs)
    if scores:
        ranked = sorted(zip(scores, docs), key=lambda item: item[0], reverse=True)
        return [doc for _, doc in ranked[:top_k]], "vivo-rerank"

    return docs[:top_k], "local-faiss"

def build_rag_chain(mode: str, retriever, llm, context_top_k: int):
    """构建指定模式的 RAG 链，支持上下文记忆"""
    template = PROMPT_TEMPLATES.get(mode, PROMPT_TEMPLATES["therapist"])
    prompt = ChatPromptTemplate.from_template(template)
    
    def create_chain_input(input_dict):
        """处理输入，返回格式化的数据，包含上下文记忆"""
        question = input_dict.get("question", "")
        user_profile = input_dict.get("user_profile", "暂无用户信息")
        chat_history = input_dict.get("chat_history", [])
        user_id = input_dict.get("user_id", "")
        
        # 获取用户在当前模式下的历史对话
        if user_id:
            session_history = get_user_session(user_id, mode)
            # 合并传入的历史和会话历史
            all_history = session_history + chat_history if chat_history else session_history
        else:
            all_history = chat_history or []
        
        # 智能增强检索查询：结合上下文提高检索准确性
        enhanced_query = enhance_query_with_context(question, all_history)
        
        # 用增强后的查询检索候选文档，再用 vivo 文本相似度重排
        candidate_docs = retriever.invoke(enhanced_query)
        docs, ranker = select_rag_docs(enhanced_query, candidate_docs, context_top_k)
        context = format_docs(docs)
        
        # 调试信息：打印检索结果
        print(f"\n========== [{mode}模式] RAG 检索信息 ==========")
        print(f"原始问题: {question}")
        print(f"增强查询: {enhanced_query[:100]}...")
        print(f"候选片段: {len(candidate_docs)} 个，入选片段: {len(docs)} 个，排序器: {ranker}")
        print(f"知识库内容长度: {len(context)} 字符")
        if context:
            print(f"知识库预览: {context[:200]}...")
        print(f"================================================\n")
        
        # 格式化对话历史
        formatted_history = format_chat_history(all_history)
        
        return {
            "context": context,
            "question": question,
            "user_profile": user_profile,
            "chat_history": formatted_history
        }
    
    from langchain_core.runnables import RunnableLambda
    
    chain = (
        RunnableLambda(create_chain_input)
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return chain

# ==================== 启动事件 ====================

@app.on_event("startup")
async def startup_event():
    """服务启动时初始化"""
    global vector_store, resource_vector_store, rag_chains
    
    print("=" * 50)
    print("艺术疗愈 AI 服务器启动中...")
    print("=" * 50)
    
    try:
        # 初始化组件
        embeddings = init_embeddings()
        vector_store = load_vector_store(embeddings)
        llm = init_llm()
        
        # 尝试加载资源向量索引
        try:
            resource_vector_store = load_vector_store(embeddings, RESOURCE_INDEX_DIR)
            print("[OK] 资源向量索引加载成功")
        except FileNotFoundError:
            print("[WARN] 资源向量索引未找到，resource_advisor 模式将使用通用索引")
            print("   提示：运行 python build_resource_index.py 构建资源索引")
            resource_vector_store = vector_store
        
        # 创建候选召回器；最终上下文片段会经过 vivo 文本相似度重排后截取
        retriever = vector_store.as_retriever(search_kwargs={"k": RAG_CANDIDATE_K})
        
        # 为每种模式构建 RAG 链
        for mode in ["comfort", "therapist", "companion", "resource_advisor"]:
            # resource_advisor 模式使用资源向量库和更多的检索结果
            if mode == "resource_advisor":
                resource_retriever = resource_vector_store.as_retriever(search_kwargs={"k": RAG_RESOURCE_CANDIDATE_K})
                rag_chains[mode] = build_rag_chain(mode, resource_retriever, llm, RAG_RESOURCE_CONTEXT_TOP_K)
            else:
                rag_chains[mode] = build_rag_chain(mode, retriever, llm, RAG_CONTEXT_TOP_K)
            print(f"[OK] {mode} 模式 RAG 链已就绪")
        
        print("=" * 50)
        print("[READY] 服务器启动完成！")
        print("=" * 50)
        
    except Exception as e:
        print(f"[ERROR] 启动失败: {e}")
        raise

# ==================== API 路由 ====================

@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "艺术疗愈 AI 服务运行中"}

@app.get("/health")
async def health_check():
    """详细健康检查"""
    return {
        "status": "healthy",
        "vector_store": vector_store is not None,
        "rag_chains": list(rag_chains.keys()),
        "vivo_rerank": bool(VIVO_APP_KEY)
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI 对话接口 - 支持上下文记忆
    
    - **user_id**: 用户唯一标识
    - **query**: 用户输入的问题
    - **mode**: 对话模式 (comfort/therapist/companion)
    - **user_profile**: 用户画像信息（可选）
    - **chat_history**: 本次会话的历史对话（可选，会与服务器存储的历史合并）
    """
    try:
        # 获取对应模式的 RAG 链
        chain = rag_chains.get(request.mode, rag_chains.get("therapist"))
        if not chain:
            return ChatResponse(
                success=False,
                reply="抱歉，当前模式不可用，请稍后再试。",
                error="RAG chain not available"
            )
        
        # 构建用户信息
        user_profile = request.user_profile or "暂无用户偏好信息"
        
        # 将用户消息添加到会话历史
        add_to_session(request.user_id, request.mode, "user", request.query)
        
        # 调用 RAG 链生成回复
        response = chain.invoke({
            "question": request.query,
            "user_profile": user_profile,
            "chat_history": request.chat_history or [],
            "user_id": request.user_id
        })
        
        # 将AI回复添加到会话历史
        add_to_session(request.user_id, request.mode, "assistant", response)
        
        # 提取来源信息（用于调试）
        sources = []
        try:
            # 使用相同的增强查询来获取文档来源
            session_history = get_user_session(request.user_id, request.mode)
            enhanced_query = enhance_query_with_context(request.query, session_history)
            source_store = resource_vector_store if request.mode == "resource_advisor" else vector_store
            candidate_k = RAG_RESOURCE_CANDIDATE_K if request.mode == "resource_advisor" else RAG_CANDIDATE_K
            top_k = RAG_RESOURCE_CONTEXT_TOP_K if request.mode == "resource_advisor" else RAG_CONTEXT_TOP_K
            candidate_docs = source_store.similarity_search(enhanced_query, k=candidate_k)
            docs, _ = select_rag_docs(enhanced_query, candidate_docs, top_k)
            sources = [
                doc.metadata.get("source") or f"知识库片段{i+1}"
                for i, doc in enumerate(docs)
            ]
        except:
            pass
        
        return ChatResponse(
            success=True,
            reply=response,
            sources=sources
        )
        
    except Exception as e:
        print(f"对话错误: {e}")
        return ChatResponse(
            success=False,
            reply="抱歉，我现在有点忙不过来，请稍后再试试。",
            error=str(e)
        )

@app.post("/search")
async def search(query: str, top_k: int = 3):
    """
    知识库搜索接口（调试用），会对 FAISS 候选结果执行 vivo 文本相似度重排
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="向量数据库未初始化")
    
    candidate_docs = vector_store.similarity_search(query, k=max(top_k, RAG_CANDIDATE_K))
    results, ranker = select_rag_docs(query, candidate_docs, top_k)
    return {
        "query": query,
        "ranker": ranker,
        "results": [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown")
            }
            for doc in results
        ]
    }

@app.get("/session/{user_id}/{mode}")
async def get_session_history(user_id: str, mode: str, limit: int = 10):
    """
    获取用户在特定模式下的对话历史
    """
    session_history = get_user_session(user_id, mode)
    recent_history = session_history[-limit:] if len(session_history) > limit else session_history
    
    return {
        "user_id": user_id,
        "mode": mode,
        "total_messages": len(session_history),
        "recent_messages": [msg.dict() for msg in recent_history]
    }

@app.delete("/session/{user_id}/{mode}")
async def clear_session_history(user_id: str, mode: str):
    """
    清除用户在特定模式下的对话历史
    """
    session_key = f"{user_id}_{mode}"
    if session_key in user_sessions:
        del user_sessions[session_key]
        return {"message": f"已清除用户 {user_id} 在 {mode} 模式下的对话历史"}
    else:
        return {"message": "未找到对话历史"}

@app.get("/sessions/{user_id}")
async def get_all_user_sessions(user_id: str):
    """
    获取用户在所有模式下的对话统计
    """
    sessions = {}
    for session_key, messages in user_sessions.items():
        if session_key.startswith(f"{user_id}_"):
            mode = session_key.split("_", 1)[1]
            sessions[mode] = {
                "message_count": len(messages),
                "last_activity": messages[-1].timestamp if messages else None
            }
    
    return {
        "user_id": user_id,
        "active_sessions": sessions
    }

# ==================== 店铺搜索 ====================

# 在初始化部分加载店铺向量索引
SHOP_VECTOR_STORE = None
SHOP_METADATA = []

def load_shop_vector_index():
    global SHOP_VECTOR_STORE, SHOP_METADATA
    try:
        idx_dir = INDEX_DIR
        # 使用 FAISS 向量库加载
        SHOP_VECTOR_STORE = load_vector_store(
            HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL),
            idx_dir
        )
        meta_path = idx_dir / 'shop_metadata.json'
        if meta_path.exists():
            with open(meta_path, 'r', encoding='utf-8') as f:
                SHOP_METADATA = json.load(f)
        print('已加载店铺向量索引')
    except Exception as e:
        print('加载店铺向量索引失败:', e)

# 在启动时尝试加载
load_shop_vector_index()

# 新增语义搜索接口
@app.post('/shops/semantic_search')
async def semantic_shop_search(request: Request):
    payload = await request.json()
    query = payload.get('query')
    k = int(payload.get('k', 5))
    region = payload.get('region', '').strip()
    category = payload.get('category', '').strip()

    if not query:
        raise HTTPException(status_code=400, detail='缺少 query 参数')

    if not SHOP_VECTOR_STORE:
        raise HTTPException(status_code=500, detail='店铺向量索引未加载')

    # 向量检索
    docs = SHOP_VECTOR_STORE.similarity_search(query, k=k)

    # docs 的 metadata 里应该包含索引时保存的字段
    results = []
    for doc in docs:
        meta = doc.metadata if hasattr(doc, 'metadata') else {}
        # region/category 过滤（基于元数据）
        if region:
            addr = (meta.get('address') or '').lower()
            if region.lower() not in addr:
                continue
        if category:
            tags = meta.get('tags') or []
            if category not in tags:
                continue
        results.append({ 'name': meta.get('name'), 'address': meta.get('address'), 'tags': meta.get('tags'), 'score': doc.score if hasattr(doc, 'score') else None })

    return { 'success': True, 'data': results }

# ==================== 启动入口 ====================

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    print(f"启动服务器: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
