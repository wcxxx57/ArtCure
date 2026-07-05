"""
向量数据库构建脚本
运行此脚本来构建/更新知识库的向量索引
"""

import os

# 解决 Anaconda/PyTorch/FAISS 在 Windows 下可能出现的 OpenMP 运行库冲突
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from pathlib import Path
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 知识库目录
KNOWLEDGE_BASE_DIR = Path(__file__).parent / "knowledge_base"
# 向量索引保存目录
INDEX_DIR = Path(__file__).parent / "vector_index"

def save_faiss_local(vector_store, index_dir: Path):
    """Save FAISS via an ASCII relative path to avoid Windows non-ASCII path issues."""
    index_dir.mkdir(parents=True, exist_ok=True)
    original_cwd = Path.cwd()
    try:
        os.chdir(index_dir.parent)
        vector_store.save_local(index_dir.name)
    finally:
        os.chdir(original_cwd)

def load_documents():
    """从知识库目录加载所有文档"""
    documents = []
    
    for file_path in KNOWLEDGE_BASE_DIR.glob("*.txt"):
        print(f"正在加载: {file_path.name}")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # 创建文档对象
        doc = Document(
            page_content=content,
            metadata={"source": file_path.name}
        )
        documents.append(doc)
    
    return documents

def split_documents(documents):
    """将文档分割成更小的块"""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # 每块约500字符
        chunk_overlap=50,  # 块之间重叠50字符
        separators=["\n## ", "\n### ", "\n#### ", "\n- ", "\n", "。", "；"]
    )
    
    split_docs = text_splitter.split_documents(documents)
    print(f"文档分割完成，共 {len(split_docs)} 个片段")
    return split_docs

def build_vector_store(documents):
    """构建向量数据库"""
    
    # 初始化本地 Embedding 模型
    print("正在初始化 Embedding 模型...")
    model_name = "BAAI/bge-small-zh-v1.5"
    model_kwargs = {'device': 'cpu'}
    encode_kwargs = {'normalize_embeddings': True}
    
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # 构建向量库
    print("正在构建向量库...")
    vector_store = FAISS.from_documents(documents, embeddings)
    
    # 保存到本地
    save_faiss_local(vector_store, INDEX_DIR)
    print(f"向量库已保存到: {INDEX_DIR}")
    
    return vector_store

def main():
    print("=" * 50)
    print("艺术疗愈知识库 - 向量数据库构建")
    print("=" * 50)
    
    # 1. 加载文档
    print("\n[1/3] 加载知识库文档...")
    documents = load_documents()
    print(f"共加载 {len(documents)} 个文档")
    
    # 2. 分割文档
    print("\n[2/3] 分割文档...")
    split_docs = split_documents(documents)
    
    # 3. 构建向量库
    print("\n[3/3] 构建向量数据库...")
    vector_store = build_vector_store(split_docs)
    
    print("\n" + "=" * 50)
    print("[OK] 向量数据库构建完成！")
    print("=" * 50)
    
    # 测试检索
    print("\n测试检索功能...")
    test_query = "失眠怎么办？"
    results = vector_store.similarity_search(test_query, k=3)
    print(f"查询: {test_query}")
    print(f"找到 {len(results)} 条相关结果:")
    for i, doc in enumerate(results, 1):
        print(f"\n--- 结果 {i} ---")
        print(doc.page_content[:200] + "...")

if __name__ == "__main__":
    main()
