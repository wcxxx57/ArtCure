"""
构建艺术疗愈资源向量索引
从 xhs_sample_resources.json 和 extracted_notes 目录加载数据并构建 FAISS 索引
"""

import os
import json
from pathlib import Path
from typing import List, Dict

# 解决 OpenMP 库冲突警告
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from dotenv import load_dotenv

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

# 加载环境变量
load_dotenv()

# 配置
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
DATA_DIR = Path(__file__).parent.parent / "data_collection"
RESOURCES_FILE = DATA_DIR / "processed_data" / "xhs_sample_resources.json"
NOTES_DIR = DATA_DIR / "extracted_notes"
OUTPUT_DIR = Path(__file__).parent / "resource_vector_index"

def save_faiss_local(vector_store, index_dir: Path):
    """Save FAISS via an ASCII relative path to avoid Windows non-ASCII path issues."""
    index_dir.mkdir(parents=True, exist_ok=True)
    original_cwd = Path.cwd()
    try:
        os.chdir(index_dir.parent)
        vector_store.save_local(index_dir.name)
    finally:
        os.chdir(original_cwd)

def load_resources_from_json() -> List[Document]:
    """从 JSON 文件加载资源数据"""
    print(f"正在加载资源数据: {RESOURCES_FILE}")
    
    if not RESOURCES_FILE.exists():
        print(f"警告: 资源文件不存在: {RESOURCES_FILE}")
        return []
    
    with open(RESOURCES_FILE, 'r', encoding='utf-8') as f:
        resources = json.load(f)
    
    documents = []
    for resource in resources:
        # 构建资源的文本描述
        text_parts = []
        
        # 标题和描述
        text_parts.append(f"资源名称：{resource.get('title', '')}")
        text_parts.append(f"描述：{resource.get('description', '')}")
        
        # 类型和疗愈方式
        resource_type = resource.get('resource_type_display', resource.get('resource_type', ''))
        if resource_type:
            text_parts.append(f"类型：{resource_type}")
        
        therapy_mediums = resource.get('therapy_medium_display', [])
        if therapy_mediums:
            text_parts.append(f"疗愈方式：{', '.join(therapy_mediums)}")
        
        # 价格和地址
        price = resource.get('price_text', '')
        if price:
            text_parts.append(f"价格：{price}")
        
        address = resource.get('address_text', '')
        district = resource.get('district', '')
        city = resource.get('city', '')
        if address:
            text_parts.append(f"地址：{address}")
        if district:
            text_parts.append(f"区域：{district}")
        if city:
            text_parts.append(f"城市：{city}")
        
        # 疗愈师信息
        therapist_name = resource.get('therapist_name', '')
        therapist_intro = resource.get('therapist_intro', '')
        if therapist_name:
            text_parts.append(f"疗愈师：{therapist_name}")
        if therapist_intro:
            text_parts.append(f"疗愈师介绍：{therapist_intro}")
        
        # 联系方式
        contact_info = resource.get('contact_info', {})
        if contact_info:
            wechat = contact_info.get('wechat', '')
            phone = contact_info.get('phone', '')
            if wechat:
                text_parts.append(f"微信：{wechat}")
            if phone:
                text_parts.append(f"电话：{phone}")
        
        # 标签
        mood_tags = resource.get('mood_tags', [])
        if mood_tags:
            text_parts.append(f"情绪标签：{', '.join(mood_tags)}")
        
        feature_tags = resource.get('feature_tags', [])
        if feature_tags:
            text_parts.append(f"特色标签：{', '.join(feature_tags)}")
        
        # 来源平台
        source_platform = resource.get('source_platform', '')
        if source_platform == 'xhs':
            text_parts.append("来源：小红书")
        elif source_platform == 'dianping':
            text_parts.append("来源：大众点评")
        
        # 组合文本
        text = "\n".join(text_parts)
        
        # 创建文档，保留原始数据作为元数据
        doc = Document(
            page_content=text,
            metadata={
                "resource_id": resource.get('resource_id', ''),
                "title": resource.get('title', ''),
                "resource_type": resource.get('resource_type', ''),
                "price_value": resource.get('price_value', 0),
                "district": resource.get('district', ''),
                "source": "xhs_sample_resources"
            }
        )
        documents.append(doc)
    
        print(f"[OK] 从 JSON 加载了 {len(documents)} 个资源")
    return documents

def load_notes_from_markdown() -> List[Document]:
    """从 Markdown 文件加载笔记数据"""
    print(f"正在加载笔记数据: {NOTES_DIR}")
    
    if not NOTES_DIR.exists():
        print(f"警告: 笔记目录不存在: {NOTES_DIR}")
        return []
    
    documents = []
    md_files = list(NOTES_DIR.glob("*.md"))
    
    for md_file in md_files:
        # 跳过索引文件
        if "index" in md_file.name.lower():
            continue
        
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 提取文件名中的信息（格式：note_id_标题.md）
            filename = md_file.stem
            parts = filename.split('_', 1)
            note_id = parts[0] if len(parts) > 0 else ''
            
            # 创建文档
            doc = Document(
                page_content=content,
                metadata={
                    "note_id": note_id,
                    "filename": md_file.name,
                    "source": "extracted_notes"
                }
            )
            documents.append(doc)
        
        except Exception as e:
            print(f"警告: 无法读取文件 {md_file}: {e}")
            continue
    
    print(f"[OK] 从 Markdown 加载了 {len(documents)} 个笔记")
    return documents

def build_index():
    """构建向量索引"""
    print("=" * 60)
    print("开始构建艺术疗愈资源向量索引")
    print("=" * 60)
    
    # 1. 加载数据
    print("\n[1/3] 加载数据...")
    resource_docs = load_resources_from_json()
    note_docs = load_notes_from_markdown()
    
    all_docs = resource_docs + note_docs
    
    if not all_docs:
        print("[ERROR] 错误: 没有找到任何文档数据")
        return
    
    print(f"\n总共加载了 {len(all_docs)} 个文档")
    
    # 2. 初始化 Embedding 模型
    print(f"\n[2/3] 初始化 Embedding 模型: {EMBEDDING_MODEL}")
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    
    # 3. 构建 FAISS 索引
    print("\n[3/3] 构建 FAISS 向量索引...")
    vector_store = FAISS.from_documents(all_docs, embeddings)
    
    # 4. 保存索引
    save_faiss_local(vector_store, OUTPUT_DIR)
    
    print(f"\n[OK] 索引构建完成！")
    print(f"[PATH] 保存位置: {OUTPUT_DIR}")
    print(f"[COUNT] 文档数量: {len(all_docs)}")
    print(f"   - 资源数据: {len(resource_docs)}")
    print(f"   - 笔记数据: {len(note_docs)}")
    print("=" * 60)
    
    # 5. 测试索引
    print("\n测试索引...")
    test_queries = [
        "绘画疗愈去哪体验比较好？",
        "推荐一些性价比较高的疗愈活动",
        "静安区有哪些颂钵疗愈工作室？"
    ]
    
    for query in test_queries:
        print(f"\n查询: {query}")
        results = vector_store.similarity_search(query, k=2)
        for i, doc in enumerate(results, 1):
            print(f"  结果 {i}: {doc.page_content[:100]}...")
    
    print("\n[OK] 测试完成！")

if __name__ == "__main__":
    build_index()
