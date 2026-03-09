"""RAG Service - Core service for RAG functionality with MongoDB Atlas Vector Search

MODULAR ARCHITECTURE:
This file has been refactored into separate modules for better maintainability:
- rag/models.py: Data models and schemas
- rag/permissions.py: Role-based access control
- rag/query_generators/intent_detector.py: Intent detection
- rag/query_generators/dynamic_query.py: Dynamic query generation
- rag/query_handlers/: Domain-specific query handlers (employee, department, etc.)
- rag/conversations.py: Conversation management
- rag/documents.py: Document ingestion and search
"""
import os
import logging
import sys
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
import uuid

# CRITICAL: Force reload environment variables FIRST (before any other imports)
if os.path.exists(os.path.join(os.path.dirname(__file__), '..', '..', '.env')):
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'), override=True)

# LangChain imports
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import numpy as np

# Local imports
from app.utils.config import (
    MONGODB_ATLAS_URI,
    MAIN_MONGODB_URI,
    VECTOR_SEARCH_INDEX_NAME,
    RAG_COLLECTION_NAME,
    CHATBOT_MAX_CONVERSATIONS,
    CHATBOT_MAX_MESSAGES,
    RAG_PARALLEL_QUERIES
)

# RAG package imports (modularized components)
from app.services.rag.models import COLLECTION_SCHEMAS
from app.services.rag.permissions import PermissionChecker
from app.services.rag.query_generators.intent_detector import IntentDetector
from app.services.rag.query_generators.dynamic_query import (
    DynamicQueryGenerator,
    DynamicQueryExecutor,
    DynamicQueryResultFormatter
)
from app.services.rag.query_handlers.employee_handler import EmployeeQueryHandler
from app.services.rag.query_handlers.department_handler import DepartmentQueryHandler
from app.services.rag.query_handlers.attendance_handler import AttendanceQueryHandler
from app.services.rag.query_handlers.request_handler import RequestQueryHandler
from app.services.rag.query_handlers.branch_handler import BranchQueryHandler
from app.services.rag.query_handlers.shift_handler import ShiftQueryHandler
from app.services.rag.query_handlers.payroll_handler import PayrollQueryHandler
from app.services.rag.conversations import ConversationManager
from app.services.rag.documents import DocumentManager
from app.services.rag.cache import get_rag_cache, RAGCache

logger = logging.getLogger(__name__)

# Minimum relevance score for vector search results (0.0 - 1.0)
VECTOR_SEARCH_MIN_SCORE = 0.3

SYSTEM_PROMPT = """
Bạn là **SmartBot** – trợ lý AI của hệ thống chấm công & nhân sự SmartAttendance.

PHONG CÁCH TRẢ LỜI
- Luôn dùng **tiếng Việt**, giọng điệu **thân thiện, rõ ràng, tôn trọng người dùng**.
- Ưu tiên **ngắn gọn, súc tích**: thường 2–6 câu là đủ cho mỗi câu hỏi.
- Cách trình bày:
  - Dùng gạch đầu dòng (-) cho danh sách.
  - Dùng **in đậm** cho thông tin chính (kết luận, số liệu, trạng thái quan trọng).
- Có thể dùng emoji phù hợp (📅, 📊, ✅, ⚠️, 💰, 🏢) để câu trả lời dễ đọc hơn, nhưng **không lạm dụng**.

QUY TẮC DỮ LIỆU & MINH BẠCH
1. Chỉ sử dụng thông tin từ **ngữ cảnh** và **dữ liệu hệ thống** (MongoDB, RAG documents).
2. Nếu **không có dữ liệu đủ rõ**, hãy nói thẳng:
   "Xin lỗi, tôi không tìm thấy thông tin này trong hệ thống. Bạn có thể liên hệ bộ phận nhân sự để được hỗ trợ thêm."
3. **Không bịa số liệu** (giờ công, ngày công, tiền lương, số ngày phép...). Không phỏng đoán khi không có dữ liệu chính xác.
4. Khi trả lời có số liệu, luôn định dạng dễ đọc, ví dụ:
   - **Lương**: 15.000.000 VNĐ
   - **Tổng ngày công**: 22 ngày
   - **Ngày phép còn lại**: 5 ngày

TRẢ LỜI CÁC CÂU HỎI TRẠNG THÁI / KẾT QUẢ
- Với các câu như: đã chấm công chưa, còn bao nhiêu ngày phép, lương tháng này bao nhiêu…
  - **Dòng 1**: Kết luận ngắn gọn, rõ ràng (có/không + số liệu chính), ví dụ:
    - "**✅ Hôm nay bạn đã chấm công lúc 08:05.**"
    - "**⚠️ Hôm nay hệ thống chưa ghi nhận chấm công nào của bạn.**"
  - **Dòng 2–3**: Thêm chi tiết liên quan (thời gian, ca làm, địa điểm, loại phép, chi nhánh… nếu có).
  - **Dòng 4 (tuỳ chọn)**: Gợi ý bước tiếp theo (mở màn hình chấm công, xem lịch làm, liên hệ HR, v.v.).

GỢI Ý HÀNH ĐỘNG TIẾP THEO
- Sau mỗi câu trả lời, **gợi ý 1-2 câu hỏi liên quan** mà người dùng có thể muốn hỏi tiếp.
- Ví dụ: Sau khi trả lời về chấm công → gợi ý "Bạn muốn xem lịch sử chấm công tuần này không?"
- Ví dụ: Sau khi trả lời về ngày phép → gợi ý "Bạn muốn tạo đơn xin nghỉ phép không?"

TỐI ƯU HIỆU NĂNG & TRẢI NGHIỆM
- Trả lời **trực tiếp vào câu hỏi**, tránh vòng vo hoặc nhắc lại nguyên văn câu hỏi nếu không cần thiết.
- Khi ngữ cảnh đã rõ, **đưa thẳng kết luận và số liệu**, không cần giải thích dài dòng.
- Nếu câu hỏi mơ hồ, hãy **hỏi lại 1 câu làm rõ** thay vì tự suy đoán.
- Luôn tham khảo **LỊCH SỬ HỘI THOẠI** (nếu có) để hiểu ngữ cảnh trước đó, tránh hỏi lại những gì đã nói.

VÍ DỤ MẪU

User: "Xin chào"
Assistant: "Chào bạn! 👋 Tôi là SmartBot – trợ lý AI của hệ thống SmartAttendance. Tôi có thể giúp bạn với:\n- 📅 Tra cứu chấm công\n- 💰 Thông tin lương\n- 📋 Đơn nghỉ phép, tăng ca\n- 🏢 Thông tin phòng ban, chi nhánh\nBạn cần hỗ trợ gì?"

User: "Hôm nay tôi đã chấm công chưa?"
Assistant: "**✅ Hôm nay bạn đã chấm công.**\n- Check-in: **08:02 AM** tại chi nhánh Hà Nội\n- Ca làm việc: Sáng (08:00 – 12:00)\n\nBạn chưa check-out. Nhớ check-out khi kết thúc ca nhé!"

User: "Tháng này tôi còn bao nhiêu ngày phép?"
Assistant: "📅 **Bạn còn 5 ngày phép** trong tháng này.\n- Đã sử dụng: 2 ngày (10/03, 15/03)\n- Tổng phép năm: 12 ngày\n\nBạn muốn tạo đơn xin nghỉ phép không?"
"""

# Role-specific prompt additions for friendlier, contextual responses
ROLE_PROMPTS = {
    "employee": """
THÔNG TIN VAI TRÒ: Người dùng là **Nhân viên** (Employee).
- Xưng hô: "bạn" – thân thiện, gần gũi.
- Phạm vi dữ liệu: Chỉ thông tin CÁ NHÂN (chấm công, ngày phép, đơn từ của chính họ).
- Khi họ hỏi thông tin ngoài phạm vi, nhẹ nhàng giải thích và gợi ý liên hệ quản lý.
- Gợi ý hành động phù hợp: chấm công, xem lịch làm, tạo đơn nghỉ phép, xem ngày phép còn lại.
""",
    "supervisor": """
THÔNG TIN VAI TRÒ: Người dùng là **Supervisor** (Giám sát viên).
- Xưng hô: "anh/chị" hoặc "bạn" – tôn trọng, chuyên nghiệp.
- Phạm vi dữ liệu: Thông tin cá nhân + nhân viên trong phòng ban.
- Có thể xem chấm công, đơn từ của nhân viên trong phòng ban.
- Gợi ý: duyệt đơn, xem báo cáo chấm công phòng ban, kiểm tra nhân viên đi muộn.
""",
    "manager": """
THÔNG TIN VAI TRÒ: Người dùng là **Manager** (Quản lý).
- Xưng hô: "anh/chị" – tôn trọng, chuyên nghiệp.
- Phạm vi dữ liệu: Thông tin cá nhân + toàn bộ phòng ban quản lý.
- Có thể xem/duyệt đơn từ, xem báo cáo chấm công, thống kê nhân viên phòng ban.
- Gợi ý: báo cáo tổng hợp, duyệt đơn chờ, xem hiệu suất nhân viên.
""",
    "hr_manager": """
THÔNG TIN VAI TRÒ: Người dùng là **HR Manager** (Quản lý nhân sự).
- Xưng hô: "anh/chị" – tôn trọng, chuyên nghiệp.
- Phạm vi dữ liệu: TOÀN BỘ dữ liệu nhân sự, chấm công, lương, đơn từ.
- Có thể truy cập mọi thông tin trong hệ thống.
- Gợi ý: báo cáo nhân sự, thống kê lương, quản lý phòng ban, xem đơn từ toàn công ty.
""",
    "admin": """
THÔNG TIN VAI TRÒ: Người dùng là **Admin** (Quản trị viên).
- Xưng hô: "anh/chị" – tôn trọng, chuyên nghiệp.
- Phạm vi dữ liệu: TOÀN BỘ dữ liệu hệ thống.
- Có quyền truy cập và quản lý mọi thông tin.
- Gợi ý: thống kê tổng quan, quản lý chi nhánh, báo cáo toàn hệ thống.
""",
    "super_admin": """
THÔNG TIN VAI TRÒ: Người dùng là **Super Admin** (Quản trị viên cấp cao).
- Xưng hô: "anh/chị" – tôn trọng, chuyên nghiệp.
- Phạm vi dữ liệu: TOÀN BỘ dữ liệu hệ thống, bao gồm cấu hình.
- Có quyền cao nhất trong hệ thống.
- Gợi ý: thống kê tổng quan, quản lý hệ thống, báo cáo toàn diện.
"""
}

# Suggested follow-up actions by intent type
FOLLOW_UP_SUGGESTIONS = {
    "attendance": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Tuần này tôi đi làm mấy ngày?\"\n- \"Tháng này tôi có đi muộn ngày nào không?\"",
    "employee": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Danh sách nhân viên phòng ban\"\n- \"Tôi còn bao nhiêu ngày phép?\"",
    "department": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Phòng ban nào có nhiều nhân viên nhất?\"\n- \"Danh sách phòng ban đang hoạt động\"",
    "request": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Tôi có đơn nào đang chờ duyệt?\"\n- \"Danh sách đơn nghỉ phép của tôi\"",
    "branch": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Chi nhánh nào ở TP.HCM?\"\n- \"Có bao nhiêu chi nhánh đang hoạt động?\"",
    "shift": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Ca làm việc nào bắt đầu sớm nhất?\"\n- \"Danh sách tất cả ca làm việc\"",
    "payroll": "\n\n💡 **Bạn có thể hỏi thêm:**\n- \"Lương trung bình của công ty\"\n- \"Tổng quỹ lương tháng này\"",
}

def _get_role_prompt(role: str) -> str:
    """Get role-specific prompt addition"""
    role_lower = role.lower() if role else "employee"
    return ROLE_PROMPTS.get(role_lower, ROLE_PROMPTS["employee"])

def _get_follow_up_suggestion(intent_type: str) -> str:
    """Get follow-up suggestion based on intent type"""
    return FOLLOW_UP_SUGGESTIONS.get(intent_type, "")


class RAGService:
    """RAG Service for document retrieval and conversational AI
    
    This is the main entry point that orchestrates all RAG components.
    Individual responsibilities have been delegated to specialized modules:
    - Intent detection: IntentDetector
    - Query generation: DynamicQueryGenerator, DynamicQueryExecutor
    - Query handling: Domain-specific handlers (EmployeeQueryHandler, etc.)
    - Conversations: ConversationManager
    - Documents: DocumentManager
    - Permissions: PermissionChecker
    """
    
    def __init__(self):
        """Initialize RAG service with lazy loading"""
        # MongoDB clients
        self.mongodb_client = None
        self.async_mongodb_client = None
        self.main_mongodb_client = None
        
        # LangChain components
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.qa_chain = None
        
        # Database collections
        self.conversations_collection = None
        self.users_collection = None
        self.departments_collection = None
        self.branches_collection = None
        self.attendance_collection = None
        self.requests_collection = None
        self.shifts_collection = None
        self.payroll_collection = None
        
        # Service managers (initialized lazily)
        self._conversation_manager: Optional[ConversationManager] = None
        self._document_manager: Optional[DocumentManager] = None
        self._query_handlers: Dict[str, Any] = {}
        
        # Cache for performance optimization
        self._cache: RAGCache = get_rag_cache()
        
        # Parallel query configuration
        self._parallel_queries = RAG_PARALLEL_QUERIES
        
        self._initialized = False
    
    def _ensure_initialized(self):
        """Lazy initialization - only initialize when actually needed"""
        if self._initialized:
            return
        self._initialize_components()
        self._initialized = True
    
    def _initialize_components(self):
        """Initialize all RAG components"""
        try:
            # Initialize synchronous MongoDB client for vector search
            self.mongodb_client = MongoClient(MONGODB_ATLAS_URI)
            db = self.mongodb_client.get_database()
            
            # Initialize async MongoDB client for conversations
            self.async_mongodb_client = AsyncIOMotorClient(MONGODB_ATLAS_URI)
            async_db = self.async_mongodb_client.get_database()
            
            # Test connection
            self.mongodb_client.admin.command('ping')
            logger.info("Successfully connected to MongoDB Atlas")
            
            # CRITICAL: Ensure API key is in environment BEFORE creating embeddings/LLM
            if "GOOGLE_API_KEY" not in os.environ:
                from dotenv import load_dotenv
                env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
                if os.path.exists(env_path):
                    load_dotenv(dotenv_path=env_path, override=True)
            
            # Verify API key is available
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not found in environment variables")
            
            # Set API key explicitly in environment for this process
            os.environ["GOOGLE_API_KEY"] = str(api_key)
            
            # Initialize embeddings (Google text-embedding-004)
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004"
            )
            logger.info("Initialized Google Generative AI embeddings")
            
            # Initialize vector store
            self.vector_store = MongoDBAtlasVectorSearch(
                collection=db[RAG_COLLECTION_NAME],
                embedding=self.embeddings,
                index_name=VECTOR_SEARCH_INDEX_NAME,
                relevance_score_fn="cosine"
            )
            logger.info(f"Initialized MongoDB Atlas Vector Search with index: {VECTOR_SEARCH_INDEX_NAME}")
            
            # Initialize LLM (Gemini 2.5 Flash) với cấu hình tối ưu hơn cho tốc độ và độ ngắn gọn
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.5,
                max_tokens=800
            )
            logger.info("Initialized Gemini 2.5 Flash LLM")
            
            # Initialize conversations collection
            self.conversations_collection = async_db["rag_conversations"]
            
            # Initialize main database connection
            self._init_main_database()
            
            # Create QA chain
            self._create_qa_chain()
            
            # Initialize service managers
            self._init_service_managers()
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize RAG components: {str(e)}")
            raise
    
    def _init_main_database(self):
        """Initialize main database collections"""
        try:
            self.main_mongodb_client = AsyncIOMotorClient(MAIN_MONGODB_URI)
            main_db = self.main_mongodb_client.get_database()
            
            # Initialize all collections
            self.users_collection = main_db["users"]
            self.departments_collection = main_db["departments"]
            self.branches_collection = main_db["branches"]
            self.attendance_collection = main_db["attendance"]
            self.requests_collection = main_db["requests"]
            self.shifts_collection = main_db["shifts"]
            self.payroll_collection = main_db["payroll"]
            
            logger.info("Successfully connected to main MongoDB database. All collections initialized.")
        except Exception as e:
            logger.warning(f"Failed to connect to main database: {str(e)}. Direct database queries will not be available.")
            self.main_mongodb_client = None
    
    def _init_service_managers(self):
        """Initialize service managers"""
        # Conversation manager
        self._conversation_manager = ConversationManager(self.conversations_collection)
        
        # Document manager
        self._document_manager = DocumentManager(self.vector_store)
        
        # Set LLM for intent detector fallback
        IntentDetector.set_llm(self.llm)
        
        # Query handlers
        collections = self._get_collections_object()
        self._query_handlers = {
            'employee': EmployeeQueryHandler(collections),
            'department': DepartmentQueryHandler(collections),
            'attendance': AttendanceQueryHandler(collections),
            'request': RequestQueryHandler(collections),
            'branch': BranchQueryHandler(collections),
            'shift': ShiftQueryHandler(collections),
            'payroll': PayrollQueryHandler(collections)
        }
    
    def _get_collections_object(self):
        """Get collections object for query handlers"""
        class Collections:
            pass
        
        collections = Collections()
        collections.users_collection = self.users_collection
        collections.departments_collection = self.departments_collection
        collections.branches_collection = self.branches_collection
        collections.attendance_collection = self.attendance_collection
        collections.requests_collection = self.requests_collection
        collections.shifts_collection = self.shifts_collection
        collections.payroll_collection = self.payroll_collection
        return collections
    
    def _create_qa_chain(self):
        """Create the RAG QA chain with custom prompt including source citation"""
        prompt_template = """Bạn là trợ lý AI thông minh của hệ thống SmartAttendance. Nhiệm vụ của bạn là trả lời câu hỏi dựa trên thông tin được cung cấp trong ngữ cảnh.

NGỮ CẢNH:
{context}

CÂU HỎI: {question}

HƯỚNG DẪN:
1. Chỉ trả lời dựa trên thông tin có trong ngữ cảnh được cung cấp.
2. Nếu không có thông tin liên quan trong ngữ cảnh, hãy trả lời "Tôi không biết" hoặc "Tôi không có thông tin về vấn đề này".
3. Trả lời bằng tiếng Việt một cách tự nhiên và hữu ích.
4. Nếu có nhiều thông tin, hãy tổng hợp và trình bày rõ ràng.
5. Luôn lịch sự và chuyên nghiệp.
6. Khi trích dẫn thông tin từ ngữ cảnh, hãy đề cập đến nguồn một cách tự nhiên (ví dụ: "Theo tài liệu về...", "Dựa trên thông tin...")

TRẢ LỜI:"""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        # Create QA chain
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5}
            ),
            chain_type_kwargs={"prompt": PROMPT},
            return_source_documents=True
        )

        logger.info("Created RAG QA chain with source citation support")
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_id: Optional[str] = None,
        department_id: Optional[str] = None,
        role: str = "employee"
    ) -> Dict[str, Any]:
        """
        Process a user message using RAG
        
        This is the main entry point for processing chat messages.
        It orchestrates intent detection, query handling, and response generation.
        
        Args:
            user_id: User ID
            message: User message
            conversation_id: Optional conversation ID
            department_id: Optional department ID for filtering
            role: User role for context
            
        Returns:
            Dict containing response data
        """
        # Lazy initialize
        self._ensure_initialized()

        try:
            # Load or create conversation
            conversation = await self._conversation_manager.load_or_create(
                conversation_id, user_id, department_id, role
            )

            # Build conversation history BEFORE adding current message
            # so the history contains only prior exchanges
            conversation_history = self._format_conversation_history(
                conversation.get("messages", [])
            )

            # Add user message to conversation
            self._conversation_manager.add_message(conversation, "user", message)

            # Detect intent and route to appropriate handler
            response_text, sources = await self._route_query(
                message, role, user_id, department_id,
                conversation_history=conversation_history
            )

            # Add assistant response to conversation
            self._conversation_manager.add_message(
                conversation, "assistant", response_text, sources
            )

            # Enforce message limits
            self._conversation_manager.enforce_limits(conversation)

            # Save conversation
            await self._conversation_manager.save(conversation)

            return {
                "conversation_id": conversation["conversation_id"],
                "message": response_text,
                "timestamp": datetime.now(timezone.utc),
                "sources": sources or []
            }

        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise
    
    def _should_use_vector_search(
        self,
        intent_type: str,
        message: str
    ) -> bool:
        """
        Determine if vector search should be used for this query
        
        Args:
            intent_type: Detected intent type
            message: User message
            
        Returns:
            True if vector search should be used
        """
        # Always use vector search for general questions
        if intent_type == 'general':
            return True
        
        # Use vector search for policy/guide related queries
        policy_keywords = ['chính sách', 'quy định', 'hướng dẫn', 'quy trình', 
                          'policy', 'guide', 'procedure', 'rule', 'regulation']
        message_lower = message.lower()
        if any(keyword in message_lower for keyword in policy_keywords):
            return True
        
        # For other intents, use direct DB queries
        return False
    
    def _should_use_hybrid(
        self,
        intent_type: str,
        message: str
    ) -> bool:
        """
        Determine if hybrid approach (both vector search and DB query) should be used
        
        Args:
            intent_type: Detected intent type
            message: User message
            
        Returns:
            True if hybrid approach should be used
        """
        # Use hybrid for complex queries that might need both structured data and documents
        complex_keywords = ['tổng hợp', 'chi tiết', 'đầy đủ', 'comprehensive', 
                          'detailed', 'complete', 'summary']
        message_lower = message.lower()
        
        # If it's a general question with complex keywords, use hybrid
        if intent_type == 'general' and any(keyword in message_lower for keyword in complex_keywords):
            return True
        
        return False
    
    def _format_conversation_history(
        self,
        messages: List[Dict[str, Any]],
        max_messages: int = 10
    ) -> str:
        """
        Format conversation history for inclusion in LLM prompts.
        
        Takes the most recent messages and formats them into a readable
        string for the LLM to understand conversation context.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            max_messages: Maximum number of messages to include
            
        Returns:
            Formatted conversation history string, or empty string if no history
        """
        if not messages:
            return ""
        
        # Take only the last N messages (excluding the current user message)
        recent_messages = messages[-max_messages:]
        
        if not recent_messages:
            return ""
        
        history_parts = []
        for msg in recent_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # Truncate very long messages to avoid token overflow
            if len(content) > 500:
                content = content[:500] + "..."
            
            if role == "user":
                history_parts.append(f"Người dùng: {content}")
            elif role == "assistant":
                history_parts.append(f"SmartBot: {content}")
        
        if not history_parts:
            return ""
        
        return "\n".join(history_parts)
    
    async def _route_query(
        self,
        message: str,
        role: str,
        user_id: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Route query to appropriate handler based on intent with hybrid retrieval support
        
        Uses caching when available to improve performance.
        
        Args:
            message: User message
            role: User role
            user_id: User ID
            department_id: Department ID
            conversation_history: Formatted prior conversation context
        
        Returns:
            Tuple of (response_text, sources)
        """
        sources = []
        response_text = None
        
        # Check cache for intent first
        cached_intent = self._cache.get_intent(message)
        if cached_intent:
            intent_type, details = cached_intent
            logger.debug(f"Intent cache HIT: {intent_type}")
        else:
            # Detect intent and cache it
            intent_type, details = IntentDetector.detect_intent(message)
            
            # If regex couldn't determine intent, try LLM-based classification
            if intent_type == 'dynamic':
                logger.info(f"Regex intent returned 'dynamic', trying LLM fallback for: '{message}'")
                try:
                    llm_intent, llm_details = await IntentDetector.detect_intent_with_llm(message)
                    if llm_intent != 'general':  # LLM found a specific intent
                        intent_type = llm_intent
                        details = llm_details
                        logger.info(f"LLM fallback classified as: '{intent_type}'")
                except Exception as e:
                    logger.warning(f"LLM intent fallback failed: {str(e)}")
            
            self._cache.set_intent(message, intent_type, details)
            logger.debug(f"Intent detected: {intent_type}")
        
        # Check if hybrid approach should be used
        use_hybrid = self._should_use_hybrid(intent_type, message)
        use_vector_search = self._should_use_vector_search(intent_type, message) or use_hybrid
        
        # Route based on intent and retrieval strategy
        if use_hybrid:
            # Hybrid approach: combine vector search and DB query
            response_text, sources = await self._handle_hybrid_query(
                message, intent_type, details, role, user_id, department_id,
                conversation_history=conversation_history
            )
        elif use_vector_search and intent_type == 'general':
            # Use vector search for general questions
            response_text, sources = await self._handle_general_question_with_rag(
                message, role, department_id,
                conversation_history=conversation_history
            )
        elif intent_type == 'general':
            # Fallback for general questions without vector search
            response_text = await self._handle_general_question(
                message, role, department_id,
                conversation_history=conversation_history
            )
            sources = []
        
        elif intent_type in ('employee', 'department', 'request', 'attendance', 'branch', 'shift', 'payroll'):
            # Unified domain handler routing with conversation_history support
            handler = self._query_handlers.get(intent_type)
            if handler:
                # Map default query types per domain
                default_query_types = {
                    'employee': 'count',
                    'department': 'list',
                    'request': 'pending',
                    'attendance': 'today',
                    'branch': 'list',
                    'shift': 'list',
                    'payroll': 'total'
                }
                query_type = details.get('query_type', default_query_types.get(intent_type, 'list'))
                
                response_text = await handler.handle(
                    query_type,
                    message, role, department_id,
                    details.get('params', {}),
                    user_id=user_id
                )
                sources = self._create_db_query_sources(intent_type, query_type)
                
                # Add follow-up suggestions for domain queries
                follow_up = _get_follow_up_suggestion(intent_type)
                if follow_up and response_text and not response_text.startswith("Xin lỗi"):
                    response_text += follow_up
            else:
                domain_names = {
                    'employee': 'nhân viên', 'department': 'phòng ban',
                    'request': 'đơn từ', 'attendance': 'chấm công',
                    'branch': 'chi nhánh', 'shift': 'ca làm việc',
                    'payroll': 'lương'
                }
                domain_name = domain_names.get(intent_type, intent_type)
                response_text = f"Xin lỗi, tôi không thể xử lý câu hỏi về {domain_name} lúc này. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ."
                sources = []
        
        else:
            # Dynamic query for unknown intents
            response_text = await self._handle_dynamic_query(
                message, role, user_id, department_id
            )
            sources = self._create_db_query_sources('dynamic', 'query')
        
        # Ensure response_text is never None
        if response_text is None:
            response_text = "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau."
            logger.warning(f"response_text is None for intent_type: {intent_type}, message: {message}")
        
        return response_text, sources
    
    async def _handle_hybrid_query(
        self,
        message: str,
        intent_type: str,
        details: Dict[str, Any],
        role: str,
        user_id: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Handle query using hybrid approach (vector search + DB query)
        
        Args:
            message: User message
            intent_type: Detected intent type
            details: Intent details
            role: User role
            user_id: User ID
            department_id: Department ID
            conversation_history: Prior conversation context
            
        Returns:
            Tuple of (response_text, sources)
        """
        all_sources = []
        vector_context = ""
        db_response = ""
        
        # Step 1: Vector search for document context
        try:
            retrieved_docs = await self._document_manager.search(
                query=message,
                limit=3,
                user_role=role,
                department_id=department_id
            )
            # Filter out low-relevance results
            retrieved_docs = [
                doc for doc in retrieved_docs
                if doc.get("score", 0) >= VECTOR_SEARCH_MIN_SCORE
            ]
            vector_context = self._augment_context_with_documents(retrieved_docs)
            vector_sources = self._format_sources_from_documents(retrieved_docs)
            all_sources.extend(vector_sources)
        except Exception as e:
            logger.warning(f"Vector search failed in hybrid query: {str(e)}")
        
        # Step 2: DB query for structured data (if applicable)
        if intent_type != 'general':
            try:
                # Route to appropriate handler
                handler = self._query_handlers.get(intent_type)
                if handler:
                    query_type_map = {
                        'employee': 'count',
                        'department': 'list',
                        'request': 'pending',
                        'attendance': 'today',
                        'branch': 'list',
                        'shift': 'list',
                        'payroll': 'total'
                    }
                    default_query_type = query_type_map.get(intent_type, 'list')
                    db_response = await handler.handle(
                        details.get('query_type', default_query_type),
                        message, role, department_id,
                        details.get('params', {}),
                        user_id=user_id
                    )
                    all_sources.extend(self._create_db_query_sources(intent_type, details.get('query_type', default_query_type)))
                else:
                    logger.warning(f"No handler found for intent_type: {intent_type} in hybrid query")
            except Exception as e:
                logger.warning(f"DB query failed in hybrid query: {str(e)}")
        
        # Step 3: Combine contexts and generate unified response
        combined_context = ""
        if vector_context:
            combined_context += f"THÔNG TIN TỪ TÀI LIỆU:\n{vector_context}\n\n"
        if db_response:
            combined_context += f"THÔNG TIN TỪ DỮ LIỆU:\n{db_response}\n\n"
        
        if combined_context:
            prompt = self._create_hybrid_prompt(
                message, combined_context, role, department_id,
                conversation_history=conversation_history
            )
            try:
                response = await self.llm.ainvoke(prompt)
                response_text = response.content if hasattr(response, 'content') else str(response)
            except Exception as e:
                logger.error(f"Error in hybrid LLM generation: {str(e)}")
                # Fallback: combine responses
                if vector_context and db_response:
                    response_text = f"{vector_context}\n\n{db_response}"
                elif vector_context:
                    response_text = vector_context
                elif db_response:
                    response_text = db_response
                else:
                    response_text = await self._handle_general_question(
                        message, role, department_id,
                        conversation_history=conversation_history
                    )
        else:
            # Fallback if no context available
            response_text = await self._handle_general_question(
                message, role, department_id,
                conversation_history=conversation_history
            )
        
        # Ensure response_text is never None or empty
        if not response_text or response_text.strip() == "":
            response_text = "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp để trả lời câu hỏi của bạn."
        
        return response_text, all_sources
    
    def _create_hybrid_prompt(
        self,
        question: str,
        combined_context: str,
        role: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> str:
        """
        Create prompt for hybrid query combining vector search and DB query results
        
        Args:
            question: User question
            combined_context: Combined context from both sources
            role: User role
            department_id: Department ID
            conversation_history: Prior conversation context
            
        Returns:
            Formatted prompt string
        """
        history_section = ""
        if conversation_history:
            history_section = f"\n=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===\n{conversation_history}\n"
        
        role_prompt = _get_role_prompt(role)
        
        return f"""{SYSTEM_PROMPT}
{role_prompt}
{history_section}
Nhiệm vụ của bạn là tổng hợp và trả lời câu hỏi dựa trên thông tin từ cả tài liệu và dữ liệu hệ thống.

=== THÔNG TIN TỔNG HỢP ===
{combined_context}

=== CÂU HỎI CỦA NGƯỜI DÙNG ===
{question}

=== THÔNG TIN NGƯỜI DÙNG ===
- Vai trò: {role}
{f'- Phòng ban: {department_id}' if department_id else ''}

HƯỚNG DẪN TRẢ LỜI:
1. Tổng hợp thông tin một cách logic.
2. Ưu tiên dữ liệu hệ thống (số liệu cụ thể).
3. Sử dụng Markdown để trình bày đẹp (bullet points, bảng).
4. Tham khảo lịch sử hội thoại để trả lời đúng ngữ cảnh.
5. Gợi ý 1-2 hành động tiếp theo phù hợp với vai trò người dùng.
"""
    
    async def _handle_general_question_with_rag(
        self,
        message: str,
        role: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Handle general questions with RAG (vector search + context augmentation)"""
        try:
            # Retrieve relevant documents using vector search
            retrieved_docs = await self._document_manager.search(
                query=message,
                limit=5,
                user_role=role,
                department_id=department_id
            )
            
            # Filter out low-relevance results
            retrieved_docs = [
                doc for doc in retrieved_docs
                if doc.get("score", 0) >= VECTOR_SEARCH_MIN_SCORE
            ]
            logger.debug(f"Vector search returned {len(retrieved_docs)} relevant docs (min_score={VECTOR_SEARCH_MIN_SCORE})")
            
            # Augment context with retrieved documents
            context = self._augment_context_with_documents(retrieved_docs)
            
            # Create prompt with context and conversation history
            prompt = self._create_rag_prompt(
                message, context, role, department_id,
                conversation_history=conversation_history
            )
            
            # Generate response using LLM
            response = await self.llm.ainvoke(prompt)
            # Handle different response types from LLM
            if hasattr(response, 'content'):
                response_text = response.content
            elif isinstance(response, str):
                response_text = response
            else:
                response_text = str(response)
            
            # Ensure response_text is not None or empty
            if not response_text or response_text.strip() == "":
                response_text = "Xin lỗi, tôi không thể tìm thấy thông tin phù hợp để trả lời câu hỏi của bạn."
            
            # Format sources from retrieved documents
            sources = self._format_sources_from_documents(retrieved_docs)
            
            return response_text, sources
            
        except Exception as e:
            logger.error(f"Error in RAG general question handling: {str(e)}")
            # Fallback to simple response
            return "Xin chào! Tôi là trợ lý AI của hệ thống SmartAttendance. Tôi có thể giúp bạn với các câu hỏi về chấm công, lương, nghỉ phép và các thông tin khác trong hệ thống.", []
    
    async def _handle_general_question(
        self,
        message: str,
        role: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> str:
        """Handle general questions without document retrieval (fallback)"""
        history_section = ""
        if conversation_history:
            history_section = f"\n=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===\n{conversation_history}\n"
        
        role_prompt = _get_role_prompt(role)
        
        prompt = f"""{SYSTEM_PROMPT}
{role_prompt}
{history_section}
Bạn đang trả lời một câu hỏi chung hoặc câu chào hỏi.

=== THÔNG TIN NGƯỜI DÙNG ===
- Vai trò: {role}
{f'- Phòng ban: {department_id}' if department_id else ''}

CÂU HỎI: "{message}"

HƯỚNG DẪN:
- Nếu là lời chào, hãy chào lại một cách thân thiện và giới thiệu ngắn gọn khả năng giúp đỡ phù hợp với vai trò người dùng.
- Chỉ trả lời những kiến thức chung về hệ thống hoặc quy trình.
- Không cung cấp dữ liệu giả định nếu không được phép.
- Tham khảo lịch sử hội thoại (nếu có) để trả lời đúng ngữ cảnh.
- Gợi ý 1-2 hành động phù hợp với vai trò người dùng.
"""

        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error in general question handling: {str(e)}")
            return "Xin chào! Tôi là trợ lý AI SmartBot của hệ thống SmartAttendance. Tôi có thể giúp bạn với các câu hỏi về chấm công, lương, nghỉ phép và các thông tin khác trong hệ thống."
    
    def _augment_context_with_documents(
        self,
        retrieved_docs: List[Dict[str, Any]]
    ) -> str:
        """
        Augment context with retrieved documents
        
        Args:
            retrieved_docs: List of retrieved documents with content and metadata
            
        Returns:
            Formatted context string
        """
        if not retrieved_docs:
            return ""
        
        context_parts = []
        context_parts.append("=== THÔNG TIN THAM KHẢO ===\n")
        
        for i, doc in enumerate(retrieved_docs, 1):
            content = doc.get("content", "")
            metadata = doc.get("metadata", {})
            score = doc.get("score", 0.0)
            
            title = metadata.get("title", f"Tài liệu {i}")
            doc_type = metadata.get("doc_type", "text")
            source = metadata.get("source", "unknown")
            
            context_parts.append(f"\n[{i}] {title} (Loại: {doc_type}, Nguồn: {source}, Độ liên quan: {score:.2f})")
            context_parts.append(f"{content}\n")
        
        context_parts.append("\n=== HẾT THÔNG TIN THAM KHẢO ===\n")
        
        return "\n".join(context_parts)
    
    def _create_rag_prompt(
        self,
        question: str,
        context: str,
        role: str,
        department_id: Optional[str],
        conversation_history: str = ""
    ) -> str:
        """
        Create RAG prompt with context augmentation and conversation history
        
        Args:
            question: User question
            context: Augmented context from retrieved documents
            role: User role
            department_id: User's department ID
            conversation_history: Prior conversation context
            
        Returns:
            Formatted prompt string
        """
        history_section = ""
        if conversation_history:
            history_section = f"\n=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ===\n{conversation_history}\n"
        
        role_prompt = _get_role_prompt(role)
        
        if context:
            prompt = f"""{SYSTEM_PROMPT}
{role_prompt}
{history_section}
Nhiệm vụ của bạn là trả lời câu hỏi dựa trên thông tin được cung cấp trong ngữ cảnh tham khảo bên dưới.

=== NGỮ CẢNH THAM KHẢO ===
{context}

=== CÂU HỎI CỦA NGƯỜI DÙNG ===
{question}

=== THÔNG TIN NGƯỜI DÙNG ===
- Vai trò: {role}
{f'- Phòng ban: {department_id}' if department_id else ''}

HƯỚNG DẪN TRẢ LỜI:
1. Chỉ trả lời dựa trên thông tin có trong ngữ cảnh.
2. Nếu ngữ cảnh không có thông tin, hãy nói rõ bạn không tìm thấy dữ liệu.
3. Trình bày đẹp bằng Markdown.
4. Tham khảo lịch sử hội thoại để trả lời đúng ngữ cảnh.
5. Gợi ý 1-2 hành động tiếp theo phù hợp với vai trò người dùng.

TRẢ LỜI:"""
        else:
            # Fallback when no context available
            prompt = f"""{SYSTEM_PROMPT}
{role_prompt}
{history_section}
=== THÔNG TIN NGƯỜI DÙNG ===
- Vai trò: {role}
{f'- Phòng ban: {department_id}' if department_id else ''}

Hãy trả lời câu hỏi chung sau một cách thân thiện và hữu ích bằng tiếng Việt:

"{question}"

Chỉ trả lời những câu hỏi chung, không cung cấp thông tin cụ thể về dữ liệu. Gợi ý hành động phù hợp với vai trò người dùng."""
        
        return prompt
    
    def _format_sources_from_documents(
        self,
        retrieved_docs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Format sources from retrieved documents for citation
        
        Args:
            retrieved_docs: List of retrieved documents
            
        Returns:
            List of formatted source dictionaries
        """
        sources = []
        
        for doc in retrieved_docs:
            metadata = doc.get("metadata", {})
            score = doc.get("score", 0.0)
            
            source = {
                "title": metadata.get("title", "Tài liệu không có tiêu đề"),
                "doc_type": metadata.get("doc_type", "text"),
                "source": metadata.get("source", "unknown"),
                "relevance_score": float(score),
                "chunk_index": metadata.get("chunk_index", 0),
                "collection_name": metadata.get("collection_name", "documents"),
                "access_level": metadata.get("access_level", "public"),
                "ingested_at": metadata.get("ingested_at"),
                "source_type": "vector_search"
            }
            
            # Add document ID if available
            if "_id" in metadata:
                source["document_id"] = str(metadata["_id"])
            
            sources.append(source)
        
        return sources
    
    def _create_db_query_sources(
        self,
        collection_name: str,
        query_type: str
    ) -> List[Dict[str, Any]]:
        """
        Create source citation for database queries
        
        Args:
            collection_name: Name of the MongoDB collection
            query_type: Type of query performed
            
        Returns:
            List of source dictionaries
        """
        return [{
            "collection": collection_name,
            "query_type": query_type,
            "source_type": "database_query",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    
    async def _handle_dynamic_query(
        self,
        message: str,
        role: str,
        user_id: str,
        department_id: Optional[str]
    ) -> str:
        """
        Handle dynamic queries using LLM to generate MongoDB queries
        """
        try:
            # Generate query from natural language
            prompt = DynamicQueryGenerator.build_prompt(message, role, user_id, department_id)
            response = await self.llm.ainvoke(prompt)
            
            # Parse response
            query_data = DynamicQueryGenerator.parse_response(response.content)
            
            if "error" in query_data:
                return f"Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. {query_data['error']}\n\n💡 Bạn có thể thử hỏi theo cách khác, ví dụ:\n- 'Có bao nhiêu nhân viên?'\n- 'Đơn nào đang chờ duyệt?'\n- 'Hôm nay có bao nhiêu người đi làm?'"
            
            # Execute query with RBAC enforcement
            collections = self._get_collections_object()
            executor = DynamicQueryExecutor(collections)
            result = await executor.execute(
                query_data=query_data,
                role=role,
                user_id=user_id,
                department_id=department_id
            )
            
            # Format result
            response = DynamicQueryResultFormatter.format(result, message)
            
            return response
        
        except Exception as e:
            logger.error(f"Error in dynamic query handler: {str(e)}")
            return "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau hoặc hỏi theo cách khác."
    
    # =========================================================================
    # Conversation Management Methods
    # =========================================================================
    
    async def get_user_conversations(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get user conversation history"""
        self._ensure_initialized()
        return await self._conversation_manager.get_user_conversations(user_id, page, limit)
    
    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get specific conversation"""
        self._ensure_initialized()
        return await self._conversation_manager.get_conversation(conversation_id, user_id)
    
    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Delete a conversation"""
        self._ensure_initialized()
        success = await self._conversation_manager.delete(conversation_id, user_id)
        if success:
            return {"success": True}
        raise ValueError("Conversation not found")
    
    # =========================================================================
    # Document Management Methods
    # =========================================================================
    
    async def ingest_documents(
        self,
        documents: List[Dict[str, Any]],
        collection_name: str = "documents",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ) -> Dict[str, Any]:
        """Ingest documents into vector database
        
        Args:
            documents: List of documents to ingest
            collection_name: Target collection name
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
        """
        self._ensure_initialized()
        return await self._document_manager.ingest(
            documents=documents,
            collection_name=collection_name,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
    
    async def search_documents(
        self,
        query: str,
        collection_name: str = "documents",
        limit: int = 5,
        user_role: str = "employee",
        department_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity with access controls
        
        Args:
            query: Search query
            collection_name: Target collection name for filtering
            limit: Maximum number of results
            user_role: User role for access control
            department_id: User department ID
        """
        self._ensure_initialized()
        return await self._document_manager.search(
            query=query,
            collection_name=collection_name,
            limit=limit,
            user_role=user_role,
            department_id=department_id
        )
    
    async def update_conversation_metadata(self, conversation_id: str):
        """Update conversation metadata (background task)
        
        Args:
            conversation_id: Conversation ID to update
        """
        self._ensure_initialized()
        await self._conversation_manager.update_metadata(conversation_id)
    
    # =========================================================================
    # Health Check
    # =========================================================================
    
    async def sync_collections_to_vector_store(
        self,
        collection_names: List[str] = None,
        limit_per_collection: int = 100
    ) -> Dict[str, Any]:
        """
        Sync structured data from MongoDB collections to vector store
        
        Args:
            collection_names: List of collection names to sync (None for all)
            limit_per_collection: Maximum records per collection to sync
            
        Returns:
            Dict with sync results
        """
        self._ensure_initialized()
        
        # Default collections to sync
        if collection_names is None:
            collection_names = ["users", "departments", "branches", "shifts"]
        
        results = {
            "total_synced": 0,
            "collections": {},
            "errors": []
        }
        
        collection_map = {
            "users": self.users_collection,
            "departments": self.departments_collection,
            "branches": self.branches_collection,
            "attendance": self.attendance_collection,
            "requests": self.requests_collection,
            "shifts": self.shifts_collection,
            "payroll": self.payroll_collection
        }
        
        for collection_name in collection_names:
            try:
                collection = collection_map.get(collection_name)
                if collection is None:
                    results["errors"].append(f"Collection '{collection_name}' not available")
                    continue
                
                logger.info(f"Syncing collection '{collection_name}' to vector store...")
                
                # Ingest from collection
                ingest_result = await self._document_manager.ingest_from_collection(
                    collection=collection,
                    collection_name=collection_name,
                    limit=limit_per_collection
                )
                
                if ingest_result.get("success", True):
                    results["collections"][collection_name] = {
                        "total_documents": ingest_result.get("total_documents", 0),
                        "total_chunks": ingest_result.get("total_chunks", 0),
                        "status": "success"
                    }
                    results["total_synced"] += ingest_result.get("total_documents", 0)
                else:
                    results["collections"][collection_name] = {
                        "status": "error",
                        "error": ingest_result.get("error", "Unknown error")
                    }
                    results["errors"].append(f"Failed to sync '{collection_name}': {ingest_result.get('error')}")
            
            except Exception as e:
                logger.error(f"Error syncing collection '{collection_name}': {str(e)}")
                results["errors"].append(f"Error syncing '{collection_name}': {str(e)}")
                results["collections"][collection_name] = {
                    "status": "error",
                    "error": str(e)
                }
        
        logger.info(f"Sync completed: {results['total_synced']} documents synced from {len(collection_names)} collections")
        
        return results
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for RAG service"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc),
            "components": {}
        }
        
        self._ensure_initialized()
        
        try:
            self.mongodb_client.admin.command('ping')
            health_status["components"]["mongodb"] = "connected"
        except Exception as e:
            health_status["components"]["mongodb"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"
        
        health_status["components"]["embeddings"] = "configured"
        health_status["components"]["llm"] = "configured"
        
        return health_status
