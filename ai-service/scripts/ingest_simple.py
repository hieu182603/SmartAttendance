#!/usr/bin/env python3
"""
Simple ingestion script that bypasses RAGService to avoid cache issues.
"""
import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Load env FIRST with absolute path
env_path = os.path.join(project_root, ".env")
print(f"Loading .env from: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")

from dotenv import load_dotenv
load_dotenv(dotenv_path=env_path, override=True)

# Verify API key is loaded
api_key = os.environ.get("GOOGLE_API_KEY", "")
print(f"API Key from env: {api_key[:15] if api_key else 'NOT FOUND'}...")

if not api_key:
    print("ERROR: No API key found!")
    sys.exit(1)

# Import after env is loaded
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain.schema import Document
from pymongo import MongoClient

# Config
MONGODB_URI = os.environ.get("MONGODB_ATLAS_CLUSTER_URI", "")
COLLECTION_NAME = "rag_documents"
INDEX_NAME = "vector_index_rag"

print("=" * 60)
print("SIMPLE INGESTION SCRIPT")
print("=" * 60)
print(f"MongoDB URI: {MONGODB_URI[:50]}...")
print(f"Collection: {COLLECTION_NAME}")
print(f"Index: {INDEX_NAME}")
print("=" * 60)

# Initialize MongoDB
client = MongoClient(MONGODB_URI)
db = client.get_database("smartattendance")
collection = db[COLLECTION_NAME]

# Initialize embeddings (read key from environment internally)
print("Initializing embeddings...")
emb = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

# Test embedding
print("Testing embedding...")
try:
    test_result = emb.embed_query("test")
    print(f"Embedding test OK! Dimensions: {len(test_result)}")
except Exception as e:
    print(f"Embedding test FAILED: {e}")
    sys.exit(1)

# Initialize vector store
print("Initializing vector store...")
vector_store = MongoDBAtlasVectorSearch(
    collection=collection,
    embedding=emb,
    index_name=INDEX_NAME,
    relevance_score_fn="cosine"
)

# Sample documents
documents = [
    {
        "content": "Hệ thống SmartAttendance là giải pháp chấm công thông minh sử dụng trí tuệ nhân tạo. Tính năng: 1. Chấm công tự động bằng khuôn mặt 2. Theo dõi thời gian làm việc 3. Quản lý nghỉ phép 4. Báo cáo lương tự động 5. Chatbot hỗ trợ nhân viên. Các vai trò: Nhân viên, Quản lý phòng ban, HR Manager, Admin",
        "metadata": {
            "doc_type": "system_overview",
            "source": "system_docs",
            "title": "Tổng quan hệ thống SmartAttendance",
            "language": "vi",
            "access_level": "public"
        }
    },
    {
        "content": "Chính sách nghỉ phép SmartAttendance: - Dưới 1 năm: 12 ngày/năm - 1-3 năm: 15 ngày/năm - 3-5 năm: 18 ngày/năm - Trên 5 năm: 20 ngày/năm - Quản lý: 24 ngày/năm. Nghỉ ốm: Cần giấy khám bệnh, tối đa 30 ngày/năm",
        "metadata": {
            "doc_type": "leave_policy",
            "source": "hr_policies",
            "title": "Chính sách nghỉ phép",
            "language": "vi",
            "access_level": "public"
        }
    },
    {
        "content": "Quy trình chấm công: - Check-in: 07:00 - 09:00 sáng - Check-out: 17:00 - 19:00 tối - Sử dụng camera để nhận diện khuôn mặt. Xử lý ngoại lệ: - Nghỉ phép: Đăng ký trước - Đi muộn: Tự động ghi nhận",
        "metadata": {
            "doc_type": "attendance_policy",
            "source": "hr_policies",
            "title": "Quy trình chấm công",
            "language": "vi",
            "access_level": "public"
        }
    },
    {
        "content": "Quy trình tính lương: - Lương cơ bản theo cấp bậc - Phụ cấp chức vụ: 10-30% - Phụ cấp xăng xe: 500,000 VND/tháng - Thưởng hiệu suất: tối đa 50%. Khấu trừ: BHXH 8%, BHYT 1.5%, BHTN 1%. Kỳ lương: 25 hàng tháng",
        "metadata": {
            "doc_type": "payroll_policy",
            "source": "finance_docs",
            "title": "Quy trình tính lương",
            "language": "vi",
            "access_level": "public"
        }
    },
    {
        "content": "Chatbot SmartAttendance hỗ trợ: Thông tin cá nhân, chấm công, nghỉ phép, lương, chính sách công ty. Ví dụ: 'Tôi còn bao nhiêu ngày nghỉ phép?', 'Lương tháng này?', 'Chính sách nghỉ ốm?'",
        "metadata": {
            "doc_type": "chatbot_guide",
            "source": "user_guide",
            "title": "Hướng dẫn sử dụng Chatbot",
            "language": "vi",
            "access_level": "public"
        }
    }
]

# Create LangChain documents
print(f"\nProcessing {len(documents)} documents...")
langchain_docs = []
for doc_data in documents:
    content = doc_data["content"]
    metadata = doc_data["metadata"]
    metadata["ingested_at"] = "2026-01-26"
    
    langchain_docs.append(Document(
        page_content=content,
        metadata=metadata
    ))

print(f"Created {len(langchain_docs)} documents")

# Add to vector store
print("\nAdding documents to vector store...")
try:
    vector_store.add_documents(langchain_docs)
    print(f"SUCCESS! Added {len(langchain_docs)} documents to vector store!")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("DONE!")
print("=" * 60)
