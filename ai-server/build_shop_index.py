import os

# 解决 Anaconda/PyTorch/FAISS 在 Windows 下可能出现的 OpenMP 运行库冲突
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

from pathlib import Path
import json
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

BASE_DIR = Path(__file__).parent
INDEX_DIR = BASE_DIR / 'vector_index'
INDEX_DIR.mkdir(exist_ok=True)

def save_faiss_local(vector_store, index_dir: Path):
    """Save FAISS via an ASCII relative path to avoid Windows non-ASCII path issues."""
    index_dir.mkdir(parents=True, exist_ok=True)
    original_cwd = Path.cwd()
    try:
        os.chdir(index_dir.parent)
        vector_store.save_local(index_dir.name)
    finally:
        os.chdir(original_cwd)

SHOPS_JSON = BASE_DIR.parent / 'miniprogram' / 'utils' / 'shopsData.json'
# If shopsData.json not exists, try load from shopsData.js by extracting the array
if not SHOPS_JSON.exists():
    # try to load from shopsData.js by importing as module
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('shopsData', str(BASE_DIR.parent / 'miniprogram' / 'utils' / 'shopsData.js'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        shops = getattr(module, 'shopsData', None)
        if shops is None:
            raise FileNotFoundError('shopsData not found in shopsData.js')
    except Exception as e:
        raise FileNotFoundError('请先导出 JSON 到 miniprogram/utils/shopsData.json 或确保 shopsData.js 可被导入')
else:
    with open(SHOPS_JSON, 'r', encoding='utf-8') as f:
        shops = json.load(f)

# 准备搜索文本
texts = []
metadatas = []
for s in shops:
    search_text = ' '.join([s.get('name','') , s.get('content',''), ' '.join(s.get('tags',[])), s.get('address','')])
    texts.append(search_text)
    metadatas.append({ 'name': s.get('name'), 'address': s.get('address'), 'tags': s.get('tags'), 'ratingNum': s.get('ratingNum',0) })

# 生成 embeddings 并构建 FAISS
embeddings = HuggingFaceEmbeddings(model_name=os.getenv('EMBEDDING_MODEL', 'BAAI/bge-small-zh-v1.5'))
vector_store = FAISS.from_texts(texts, embeddings, metadatas=metadatas)

# 保存索引
save_faiss_local(vector_store, INDEX_DIR)

# 保存元数据
with open(INDEX_DIR / 'shop_metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadatas, f, ensure_ascii=False, indent=2)

print('已生成店铺向量索引:', INDEX_DIR)
