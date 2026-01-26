"""RAG Service - Core service for RAG functionality with MongoDB Atlas Vector Search"""
import os
import logging
import sys
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
import json

# CRITICAL: Force reload environment variables FIRST (before any other imports)
# This ensures we always get the freshest values from .env
if os.path.exists(os.path.join(os.path.dirname(__file__), '..', '..', '.env')):
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'), override=True)

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

from app.utils.config import (
    MONGODB_ATLAS_URI,
    VECTOR_SEARCH_INDEX_NAME,
    RAG_COLLECTION_NAME,
    CHATBOT_MAX_CONVERSATIONS,
    CHATBOT_MAX_MESSAGES
)

# Configure logging
logger = logging.getLogger(__name__)

class RAGService:
    """RAG Service for document retrieval and conversational AI"""

    def __init__(self):
        """Initialize RAG service with lazy loading"""
        self.mongodb_client = None
        self.async_mongodb_client = None
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.qa_chain = None
        self.conversations_collection = None
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
            # This avoids SecretStr issues by letting the libraries read from environment
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
            # NOTE: DO NOT pass google_api_key parameter - let it read from environment
            # This avoids SecretStr issues
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004"
            )
            logger.info("Initialized Google Generative AI embeddings")

            # Initialize vector store (requires synchronous client)
            self.vector_store = MongoDBAtlasVectorSearch(
                collection=db[RAG_COLLECTION_NAME],
                embedding=self.embeddings,
                index_name=VECTOR_SEARCH_INDEX_NAME,
                relevance_score_fn="cosine"
            )
            logger.info(f"Initialized MongoDB Atlas Vector Search with index: {VECTOR_SEARCH_INDEX_NAME}")

            # Initialize LLM (Gemini 2.5 Flash - updated to available model)
            # NOTE: DO NOT pass google_api_key parameter - let it read from environment
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.7,
                max_tokens=2000
            )
            logger.info("Initialized Gemini 2.5 Flash LLM")

            # Initialize conversations collection (async Motor collection)
            self.conversations_collection = async_db["rag_conversations"]

            # Create QA chain
            self._create_qa_chain()

        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize RAG components: {str(e)}")
            raise

    def _create_qa_chain(self):
        """Create the RAG QA chain with custom prompt"""
        # Custom prompt template
        prompt_template = """
        Bạn là trợ lý AI thông minh của hệ thống SmartAttendance. Nhiệm vụ của bạn là trả lời câu hỏi dựa trên thông tin được cung cấp trong ngữ cảnh.

        NGỮ CẢNH:
        {context}

        CÂU HỎI: {question}

        HƯỚNG DẪN:
        1. Chỉ trả lời dựa trên thông tin có trong ngữ cảnh được cung cấp.
        2. Nếu không có thông tin liên quan trong ngữ cảnh, hãy trả lời "Tôi không biết" hoặc "Tôi không có thông tin về vấn đề này".
        3. Trả lời bằng tiếng Việt một cách tự nhiên và hữu ích.
        4. Nếu có nhiều thông tin, hãy tổng hợp và trình bày rõ ràng.
        5. Luôn lịch sự và chuyên nghiệp.

        TRẢ LỜI:
        """

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

        logger.info("Created RAG QA chain")

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_id: Optional[str] = None,
        department_id: Optional[str] = None,
        role: str = "employee",
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a user message using RAG

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
            conversation = await self._load_or_create_conversation(
                conversation_id, user_id, department_id, role
            )

            # Add user message to conversation
            conversation["messages"].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.utcnow()
            })

            # Check if this is a simple greeting or general question
            if self._is_general_question(message):
                # Use direct LLM response for general questions
                response_text = await self._handle_general_question(message, role, department_id)
                sources = []
            else:
                # Use RAG for document-based questions
                rag_result = await self._run_rag_query(message, department_id, role, user_context)

                response_text = rag_result["answer"]
                sources = rag_result.get("sources", [])

            # Add assistant response to conversation
            conversation["messages"].append({
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow(),
                "sources": sources
            })

            # Enforce message limits
            self._enforce_message_limits(conversation)

            # Save conversation
            await self._save_conversation(conversation)

            return {
                "conversation_id": conversation["conversation_id"],
                "message": response_text,
                "timestamp": datetime.utcnow(),
                "sources": sources
            }

        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise

    def _is_general_question(self, message: str) -> bool:
        """Check if message is a general question not requiring document retrieval"""
        general_keywords = [
            "xin chào", "hello", "hi", "chào", "cảm ơn", "thank", "bye", "tạm biệt",
            "bạn là ai", "who are you", "giúp", "help", "hướng dẫn"
        ]

        message_lower = message.lower().strip()
        return any(keyword in message_lower for keyword in general_keywords)

    async def _handle_general_question(
        self,
        message: str,
        role: str,
        department_id: Optional[str]
    ) -> str:
        """Handle general questions without document retrieval"""
        # Lazy initialize
        self._ensure_initialized()

        prompt = f"""
        Bạn là trợ lý AI của hệ thống SmartAttendance. Người dùng có vai trò: {role}
        {f', phòng ban: {department_id}' if department_id else ''}

        Hãy trả lời câu hỏi chung sau một cách thân thiện và hữu ích bằng tiếng Việt:

        "{message}"

        Chỉ trả lời những câu hỏi chung, không cung cấp thông tin cụ thể về dữ liệu.
        """

        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error in general question handling: {str(e)}")
            return "Xin chào! Tôi là trợ lý AI của hệ thống SmartAttendance. Tôi có thể giúp bạn với các câu hỏi về chấm công, lương, nghỉ phép và các thông tin khác trong hệ thống."

    async def _run_rag_query(
        self,
        question: str,
        department_id: Optional[str],
        role: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run RAG query with filtering"""
        try:
            # Add role and department context to the query
            enhanced_query = self._enhance_query_with_context(question, role, department_id)

            # Run QA chain
            result = await self.qa_chain.acall({"query": enhanced_query})

            # Extract answer and sources
            answer = result.get("result", "Tôi không có thông tin về câu hỏi này.")
            source_docs = result.get("source_documents", [])

            # Format sources
            sources = []
            for doc in source_docs:
                sources.append({
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                    "score": getattr(doc, 'score', None)
                })

            return {
                "answer": answer,
                "sources": sources
            }

        except Exception as e:
            logger.error(f"Error in RAG query: {str(e)}")
            return {
                "answer": "Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại.",
                "sources": []
            }

    def _enhance_query_with_context(
        self,
        query: str,
        role: str,
        department_id: Optional[str]
    ) -> str:
        """Enhance query with user context for better retrieval"""
        context_parts = [query]

        # Add role context (roles are normalized to lowercase in auth.py)
        role_context = {
            "employee": "nhân viên",
            "supervisor": "quản lý phòng ban",
            "manager": "trưởng phòng",
            "hr_manager": "quản lý nhân sự",
            "admin": "quản trị viên",
            "super_admin": "quản trị viên cao cấp",
            "trial": "tài khoản dùng thử"
        }

        if role in role_context:
            context_parts.append(f"trong vai trò {role_context[role]}")

        # Add department context if available
        if department_id:
            context_parts.append(f"thuộc phòng ban {department_id}")

        return " ".join(context_parts)

    async def _load_or_create_conversation(
        self,
        conversation_id: Optional[str],
        user_id: str,
        department_id: Optional[str],
        role: str
    ) -> Dict[str, Any]:
        """Load existing conversation or create new one"""
        if conversation_id:
            conversation = await self.conversations_collection.find_one({
                "conversation_id": conversation_id,
                "user_id": user_id
            })

            if conversation:
                return conversation

        # Create new conversation
        conversation_id = str(uuid.uuid4())
        conversation = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "department_id": department_id,
            "role": role,
            "messages": [],
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }

        return conversation

    async def _save_conversation(self, conversation: Dict[str, Any]):
        """Save conversation to database"""
        conversation["last_activity"] = datetime.utcnow()

        await self.conversations_collection.replace_one(
            {"conversation_id": conversation["conversation_id"]},
            conversation,
            upsert=True
        )

    def _enforce_message_limits(self, conversation: Dict[str, Any]):
        """Enforce message count limits"""
        max_messages = CHATBOT_MAX_MESSAGES or 50

        if len(conversation["messages"]) > max_messages:
            # Keep most recent messages
            conversation["messages"] = conversation["messages"][-max_messages:]

    async def ingest_documents(
        self,
        documents: List[Dict[str, Any]],
        collection_name: str = "documents",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ) -> Dict[str, Any]:
        """Ingest documents into vector database"""
        # Lazy initialize
        self._ensure_initialized()

        try:
            # Create text splitter
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )

            # Process documents
            langchain_docs = []
            total_chunks = 0

            for doc_data in documents:
                content = doc_data.get("content", "")
                metadata = doc_data.get("metadata", {})

                # Add processing metadata
                metadata.update({
                    "ingested_at": datetime.utcnow(),
                    "source": doc_data.get("source", "unknown"),
                    "doc_type": doc_data.get("doc_type", "text")
                })

                # Split text into chunks
                chunks = text_splitter.split_text(content)

                for i, chunk in enumerate(chunks):
                    chunk_metadata = metadata.copy()
                    chunk_metadata["chunk_index"] = i
                    chunk_metadata["total_chunks"] = len(chunks)

                    langchain_docs.append(Document(
                        page_content=chunk,
                        metadata=chunk_metadata
                    ))

                total_chunks += len(chunks)

            # Add to vector store
            if langchain_docs:
                await self.vector_store.aadd_documents(langchain_docs)
                logger.info(f"Successfully ingested {len(langchain_docs)} chunks from {len(documents)} documents")
            else:
                logger.warning("No documents to ingest")

            return {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "collection_name": collection_name
            }

        except Exception as e:
            logger.error(f"Error ingesting documents: {str(e)}")
            raise

    async def search_documents(
        self,
        query: str,
        collection_name: str = "documents",
        limit: int = 5,
        user_role: str = "employee",
        department_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search documents using vector similarity with access controls"""
        # Lazy initialize
        self._ensure_initialized()

        try:
            # Apply access controls based on user role
            filter_criteria = {}

            # Admin can see all documents
            if user_role == "admin":
                pass  # No filters
            # HR managers can see documents from their department and general documents
            elif user_role == "hr_manager":
                if department_id:
                    filter_criteria = {
                        "$or": [
                            {"department_id": department_id},
                            {"department_id": {"$exists": False}},  # General documents
                            {"access_level": "public"}
                        ]
                    }
                else:
                    filter_criteria = {
                        "$or": [
                            {"department_id": {"$exists": False}},  # General documents
                            {"access_level": "public"}
                        ]
                    }
            # Managers can see documents from their department and below
            elif user_role == "manager":
                if department_id:
                    filter_criteria = {
                        "$or": [
                            {"department_id": department_id},
                            {"department_id": {"$exists": False}},  # General documents
                            {"access_level": "public"}
                        ]
                    }
                else:
                    filter_criteria = {
                        "$or": [
                            {"department_id": {"$exists": False}},  # General documents
                            {"access_level": "public"}
                        ]
                    }
            # Supervisors and employees can only see general/public documents
            else:
                filter_criteria = {
                    "$or": [
                        {"department_id": {"$exists": False}},  # General documents
                        {"access_level": "public"}
                    ]
                }

            # Perform similarity search with filters
            if filter_criteria:
                # Note: MongoDBAtlasVectorSearch may not support all filter operations
                # This is a simplified implementation
                docs = await self.vector_store.asimilarity_search_with_score(
                    query=query,
                    k=limit
                )

                # Apply post-filtering since vector store may not support complex filters
                filtered_results = []
                for doc, score in docs:
                    metadata = doc.metadata
                    include_doc = False

                    # Check if document matches filter criteria
                    if user_role == "admin":
                        include_doc = True
                    elif "access_level" in metadata and metadata["access_level"] == "public":
                        include_doc = True
                    elif "department_id" not in metadata or not metadata.get("department_id"):
                        include_doc = True  # General documents
                    elif department_id and metadata.get("department_id") == department_id:
                        if user_role in ["hr_manager", "manager"]:
                            include_doc = True

                    if include_doc:
                        filtered_results.append({
                            "content": doc.page_content,
                            "metadata": metadata,
                            "score": score
                        })

                        if len(filtered_results) >= limit:
                            break

                results = filtered_results
            else:
                docs = await self.vector_store.asimilarity_search_with_score(
                    query=query,
                    k=limit
                )

                results = []
                for doc, score in docs:
                    results.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "score": score
                    })

            return results

        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise

    async def get_user_conversations(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get user's conversation history"""
        # Lazy initialize
        self._ensure_initialized()

        try:
            skip = (page - 1) * limit

            conversations = await self.conversations_collection.find(
                {"user_id": user_id}
            ).sort("last_activity", -1).skip(skip).limit(limit).to_list(length=None)

            # Format conversations with camelCase field names for frontend compatibility
            formatted_conversations = []
            for conv in conversations:
                formatted_conversations.append({
                    "id": conv["conversation_id"],
                    "lastActivity": conv["last_activity"],
                    "messageCount": len(conv.get("messages", [])),
                    "preview": self._get_conversation_preview(conv),
                    "departmentId": conv.get("department_id"),
                    "role": conv.get("role")
                })

            return formatted_conversations

        except Exception as e:
            logger.error(f"Error getting user conversations: {str(e)}")
            raise

    def _get_conversation_preview(self, conversation: Dict[str, Any]) -> str:
        """Get conversation preview from last assistant message"""
        messages = conversation.get("messages", [])

        # Find last assistant message
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                content = msg.get("content", "")
                return content[:100] + "..." if len(content) > 100 else content

        return "No messages yet"

    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get specific conversation"""
        # Lazy initialize
        self._ensure_initialized()

        try:
            conversation = await self.conversations_collection.find_one({
                "conversation_id": conversation_id,
                "user_id": user_id
            })

            if not conversation:
                raise ValueError("Conversation not found")

            return {
                "id": conversation["conversation_id"],
                "messages": conversation.get("messages", []),
                "lastActivity": conversation["last_activity"],
                "departmentId": conversation.get("department_id"),
                "role": conversation.get("role")
            }

        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            raise

    async def delete_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Delete a conversation"""
        # Lazy initialize
        self._ensure_initialized()

        try:
            result = await self.conversations_collection.delete_one({
                "conversation_id": conversation_id,
                "user_id": user_id
            })

            if result.deleted_count == 0:
                raise ValueError("Conversation not found")

            return {"success": True}

        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            raise

    async def update_conversation_metadata(self, conversation_id: str):
        """Update conversation metadata (background task)"""
        try:
            # Update last activity timestamp
            await self.conversations_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"last_activity": datetime.utcnow()}}
            )
        except Exception as e:
            logger.error(f"Error updating conversation metadata: {str(e)}")

    async def health_check(self) -> Dict[str, Any]:
        """Health check for RAG service"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "components": {}
        }

        # Lazy initialize
        self._ensure_initialized()

        try:
            # Check MongoDB connection (use sync client for health check)
            self.mongodb_client.admin.command('ping')
            health_status["components"]["mongodb"] = "connected"
        except Exception as e:
            health_status["components"]["mongodb"] = f"error: {str(e)}"
            health_status["status"] = "unhealthy"

        # NOTE: Skipping actual API calls to Google to avoid SecretStr issues
        # The embeddings and LLM will be tested when actually used
        # If there's an issue, it will be caught in the actual request
        health_status["components"]["embeddings"] = "configured"
        health_status["components"]["llm"] = "configured"

        return health_status

