# RAG Chatbot System - SmartAttendance

Hệ thống RAG (Retrieval-Augmented Generation) sử dụng Google Gemini API và MongoDB Atlas Vector Search cho SmartAttendance.

## Tổng quan

Hệ thống RAG này cho phép chatbot thông minh có khả năng:
- Trả lời câu hỏi dựa trên dữ liệu văn bản được lưu trữ
- Tìm kiếm thông tin liên quan từ MongoDB Atlas Vector Search
- Sử dụng Gemini 1.5 Flash để tạo câu trả lời chất lượng cao
- Quản lý lịch sử cuộc trò chuyện
- Hỗ trợ đa ngôn ngữ (tiếng Việt/tiếng Anh)

## Kiến trúc hệ thống

```
User Query → Embedding → Vector Search → Context Retrieval → LLM Generation → Response
     ↓             ↓            ↓              ↓                ↓           ↓
  Chatbot     text-embedding-004  MongoDB Atlas   Relevant Docs   Gemini 1.5   Formatted
  Interface   (Google)         Vector Search     + Metadata      Flash      Response
```

## Yêu cầu hệ thống

### Phần mềm
- Python 3.11+
- MongoDB Atlas account
- Google Cloud API key (Gemini API)

### Thư viện Python
```
langchain>=0.1.0
langchain-google-genai>=1.0.0
langchain-mongodb>=0.1.0
langchain-community>=0.0.20
pymongo>=4.6.0
motor>=3.3.0
fastapi==0.104.1
uvicorn[standard]==0.24.0
```

## Cài đặt và cấu hình

### 1. Chuẩn bị MongoDB Atlas

1. Tạo MongoDB Atlas cluster
2. Tạo database user với quyền đọc/ghi
3. Lấy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

4. Tạo Vector Search Index:
   - Vào Atlas Dashboard → Search → Create Search Index
   - Chọn "JSON Editor"
   - Copy nội dung từ file `mongodb_vector_index.json`
   - Đặt tên index: `vector_index`

### 2. Chuẩn bị Google Gemini API

1. Vào [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Tạo API key mới
3. Enable Gemini API trong Google Cloud Console

### 3. Cấu hình Environment Variables

Copy và chỉnh sửa file `env.example`:

```bash
# RAG Configuration
MONGODB_ATLAS_CLUSTER_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
GOOGLE_API_KEY=your_google_api_key_here
VECTOR_SEARCH_INDEX_NAME=vector_index
RAG_COLLECTION_NAME=documents
CONVERSATIONS_COLLECTION_NAME=rag_conversations

# JWT Authentication (CRITICAL: must match backend JWT_SECRET for shared authentication)
# This enables the RAG endpoints to accept JWT tokens from the frontend
JWT_SECRET=your-shared-jwt-secret-here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Chatbot Configuration
CHATBOT_MAX_CONVERSATIONS=50
CHATBOT_MAX_MESSAGES=50
CHATBOT_TEMPERATURE=0.7
CHATBOT_MAX_TOKENS=2000
```

**⚠️ Deployment Requirement**: The `JWT_SECRET` must exactly match the backend service's `JWT_SECRET` to enable seamless authentication between frontend, backend, and AI service.

### 4. Cài đặt Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 5. Ingest dữ liệu mẫu

```bash
cd ai-service
python scripts/ingest_sample_data.py
```

## API Endpoints

### Chat với AI
```http
POST /rag/chat
Content-Type: application/json

{
  "message": "Chính sách nghỉ phép như thế nào?",
  "user_id": "user123",
  "department_id": "dept456",
  "role": "employee",
  "conversation_id": "conv789"  // optional
}
```

**Response:**
```json
{
  "conversation_id": "conv789",
  "message": "Theo chính sách nghỉ phép của công ty...",
  "timestamp": "2024-01-01T10:00:00Z",
  "sources": [
    {
      "content": "Nghỉ phép có lương: 12 ngày/năm...",
      "metadata": {
        "doc_type": "leave_policy",
        "source": "hr_policies"
      },
      "score": 0.85
    }
  ]
}
```

### Thêm tài liệu vào Vector DB
```http
POST /rag/ingest
Content-Type: application/json

{
  "documents": [
    {
      "content": "Nội dung tài liệu...",
      "metadata": {
        "doc_type": "policy",
        "source": "hr_manual",
        "title": "Chính sách mới"
      }
    }
  ],
  "collection_name": "documents",
  "chunk_size": 1000,
  "chunk_overlap": 200
}
```

### Lịch sử cuộc trò chuyện
```http
GET /rag/conversations/{user_id}?page=1&limit=10
```

### Tìm kiếm tài liệu
```http
GET /rag/search?query=chính+sách+nghỉ+phép&limit=5
```

### Health Check
```http
GET /rag/health
```

## Cấu trúc dữ liệu

### Document Format
```json
{
  "content": "Nội dung văn bản cần index",
  "metadata": {
    "doc_type": "leave_policy",
    "source": "hr_manual",
    "title": "Chính sách nghỉ phép",
    "department_id": "dept123",
    "language": "vi",
    "ingested_at": "2024-01-01T00:00:00Z"
  }
}
```

### Conversation Format
```json
{
  "conversation_id": "conv123",
  "user_id": "user456",
  "department_id": "dept789",
  "role": "employee",
  "messages": [
    {
      "role": "user",
      "content": "Câu hỏi của user",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Câu trả lời của AI",
      "timestamp": "2024-01-01T10:00:01Z",
      "sources": [...]
    }
  ],
  "created_at": "2024-01-01T10:00:00Z",
  "last_activity": "2024-01-01T10:00:01Z"
}
```

## Sử dụng trong ứng dụng

### JavaScript/Node.js Client

```javascript
// Gửi tin nhắn chat
const response = await fetch('http://localhost:8001/rag/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: userMessage,
    user_id: currentUser.id,
    department_id: currentUser.department,
    role: currentUser.role,
    conversation_id: currentConversationId
  })
});

const result = await response.json();
```

### Python Client

```python
import requests

def chat_with_rag(message, user_id, department_id=None, role="employee"):
    response = requests.post("http://localhost:8001/rag/chat", json={
        "message": message,
        "user_id": user_id,
        "department_id": department_id,
        "role": role
    })

    return response.json()
```

## Tối ưu hóa hiệu suất

### 1. Chunking Strategy
- **Chunk Size**: 800-1200 tokens cho văn bản tiếng Việt
- **Overlap**: 10-20% chunk size
- **Separators**: `\n\n`, `\n`, `. `, ` `, ``

### 2. Embedding Model
- Sử dụng `text-embedding-004` (768 dimensions)
- Cosine similarity cho tìm kiếm
- Batch embedding cho hiệu suất cao

### 3. Vector Search Index
- Sử dụng filter fields để tối ưu query
- Index trên metadata quan trọng
- Monitor performance metrics

### 4. Caching
- Cache embeddings cho documents thường dùng
- Cache conversation history
- Implement Redis cho session management

## Xử lý lỗi và Monitoring

### Error Handling
- Timeout handling cho API calls
- Retry logic cho network errors
- Fallback responses khi không tìm thấy thông tin

### Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Health Checks
- MongoDB connection status
- Embedding service availability
- LLM API status
- Vector search performance

## Bảo mật

### Authentication
- **JWT Token Authentication**: RAG endpoints require JWT tokens matching the backend service
- **API Key Fallback**: Legacy API key support for backward compatibility
- **User Context**: Department and role-based access control

### API Security
- JWT token validation for all RAG endpoints
- API key authentication (deprecated, use JWT)
- Rate limiting
- Input validation
- SQL injection prevention

### Data Privacy
- User context filtering
- Department-based access control
- Audit logging cho sensitive queries
- Data encryption at rest

## Troubleshooting

### Lỗi thường gặp

1. **MongoDB Connection Failed**
   - Kiểm tra connection string
   - Verify network access
   - Check IP whitelist trong Atlas

2. **Vector Search Index Error**
   - Đảm bảo index đã được tạo
   - Kiểm tra index name trong config
   - Verify field mappings

3. **Gemini API Error**
   - Check API key validity
   - Verify quota limits
   - Test API access separately

4. **Low Quality Responses**
   - Kiểm tra data quality
   - Adjust chunking parameters
   - Fine-tune retrieval parameters

### Debug Tools

```bash
# Test MongoDB connection
python -c "from pymongo import MongoClient; client = MongoClient('your_uri'); print(client.admin.command('ping'))"

# Test embeddings
python -c "from langchain_google_genai import GoogleGenerativeAIEmbeddings; emb = GoogleGenerativeAIEmbeddings(); print(emb.embed_query('test'))"

# Check vector search
curl "http://localhost:8001/rag/search?query=test&limit=1"
```

## Contributing

1. Fork repository
2. Create feature branch
3. Add tests cho new functionality
4. Ensure all tests pass
5. Submit pull request

## License

Copyright © 2024 SmartAttendance Team. All rights reserved.


