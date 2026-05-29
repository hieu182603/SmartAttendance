"""RAG Chatbot Router - Handles RAG-based conversations and document queries"""
from app.limiter import limiter
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from app.services.rag_service import RAGService
from app.utils.auth import get_current_user, UserPrincipal
from app.utils.config import RAG_COLLECTION_NAME

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/rag",
    tags=["RAG Chatbot"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user/assistant)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class ConversationRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_id: Optional[str] = Field(None, description="Conversation ID (optional)")

class ConversationResponse(BaseModel):
    conversation_id: str
    message: str
    timestamp: datetime
    sources: Optional[List[Dict[str, Any]]] = None

class DataIngestionRequest(BaseModel):
    documents: List[Dict[str, Any]] = Field(..., description="List of documents to ingest")
    collection_name: str = Field(RAG_COLLECTION_NAME, description="MongoDB collection name")
    chunk_size: int = Field(1000, description="Text chunk size")
    chunk_overlap: int = Field(200, description="Overlap between chunks")

class RegulationIngestRequest(BaseModel):
    """Request body for ingesting a company regulation document into the vector store."""
    regulation_id: str = Field(..., description="MongoDB _id of the regulation record (from backend metadata DB)")
    title: str = Field(..., description="Human-readable title of the regulation document")
    content: str = Field(..., description="Plain-text content extracted from the uploaded file")
    doc_type: str = Field("company_regulation", description="Document category tag")
    chunk_size: int = Field(1000, description="Text chunk size")
    chunk_overlap: int = Field(200, description="Overlap between chunks")

class ConversationListResponse(BaseModel):
    conversations: List[Dict[str, Any]]

# Singleton instance for RAGService (avoids re-initialization per request)
_rag_service_instance: RAGService = None

def get_rag_service() -> RAGService:
    """Dependency to get RAGService singleton instance"""
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance

@router.post("/chat", response_model=ConversationResponse)
@limiter.limit("10/minute")
async def chat_with_rag(
    request: Request,
    body: ConversationRequest,
    background_tasks: BackgroundTasks,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Process a chat message using RAG (Retrieval-Augmented Generation)

    - **message**: User message to process
    - **conversation_id**: Optional conversation ID for continuing conversation
    """
    try:
        logger.info(f"Processing RAG chat request for user {current_user.user_id}")

        # Check if user has permission for RAG operations
        # Roles are normalized to lowercase in auth.py
        allowed_roles = ["employee", "manager", "hr_manager", "admin", "super_admin"]
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for RAG operations"
            )

        # Process the message with RAG
        response = await rag_service.process_message(
            user_id=current_user.user_id,
            message=body.message,
            conversation_id=body.conversation_id,
            department_id=current_user.department_id,
            role=current_user.role,
            company_id=current_user.company_id,
        )

        # Add background task to update conversation metadata
        background_tasks.add_task(
            rag_service.update_conversation_metadata,
            response["conversation_id"]
        )

        return ConversationResponse(**response)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error processing RAG chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@router.post("/ingest", response_model=Dict[str, Any])
async def ingest_documents(
    request: DataIngestionRequest,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ingest documents into the vector database for RAG

    - **documents**: List of documents with content and metadata
    - **collection_name**: MongoDB collection name (default: from RAG_COLLECTION_NAME env var)
    - **chunk_size**: Size of text chunks (default: 1000)
    - **chunk_overlap**: Overlap between chunks (default: 200)

    Requires admin or manager role.
    """
    try:
        # Restrict to privileged roles only
        # Roles are normalized to lowercase in auth.py
        privileged_roles = ["admin", "manager", "hr_manager", "super_admin"]
        if current_user.role not in privileged_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for document ingestion"
            )

        logger.info(f"Ingesting {len(request.documents)} documents into {request.collection_name}")

        result = await rag_service.ingest_documents(
            documents=request.documents,
            collection_name=request.collection_name,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )

        return {
            "status": "success",
            "message": f"Successfully ingested {result['total_chunks']} chunks from {len(request.documents)} documents",
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest documents: {str(e)}")

# ---------------------------------------------------------------------------
# Regulation-specific endpoints (multitenant company knowledge base)
# ---------------------------------------------------------------------------

@router.post("/regulations/ingest", response_model=Dict[str, Any])
async def ingest_regulation(
    request: RegulationIngestRequest,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ingest a single company regulation document into the vector store.

    - **regulation_id**: The MongoDB _id of the regulation record stored in the backend DB.
    - **title**: Human-readable title.
    - **content**: Plain text extracted from the uploaded file.

    The `company_id` is **always taken from the JWT token** and cannot be supplied
    by the client, preventing cross-tenant data injection.

    Requires admin or hr_manager role.
    """
    try:
        privileged_roles = ["admin", "hr_manager", "super_admin"]
        if current_user.role not in privileged_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for regulation ingestion"
            )

        company_id = current_user.company_id
        if not company_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot determine company from token. Please re-login."
            )

        logger.info(
            f"Ingesting regulation '{request.title}' "
            f"(id={request.regulation_id}) for company_id={company_id}"
        )

        # Build a document with regulation-specific metadata
        document = {
            "content": request.content,
            "source": request.title,
            "doc_type": request.doc_type,
            "metadata": {
                "regulation_id": request.regulation_id,
                "title": request.title,
                "doc_type": request.doc_type,
                "access_level": "public",
                # company_id will also be stamped by DocumentManager.ingest()
            },
        }

        result = await rag_service.ingest_documents(
            documents=[document],
            collection_name=RAG_COLLECTION_NAME,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            company_id=company_id,
        )

        return {
            "status": "success",
            "regulation_id": request.regulation_id,
            "company_id": company_id,
            "chunks_ingested": result.get("total_chunks", 0),
            "message": f"Regulation '{request.title}' ingested successfully with {result.get('total_chunks', 0)} chunks."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting regulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest regulation: {str(e)}")


@router.delete("/regulations/{regulation_id}", response_model=Dict[str, Any])
async def delete_regulation_vectors(
    regulation_id: str,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Delete all vector chunks associated with a regulation document.

    The tenant guard (`company_id` from JWT) ensures a company can only
    delete its own regulation chunks, never another tenant's data.

    Requires admin or hr_manager role.
    """
    try:
        privileged_roles = ["admin", "hr_manager", "super_admin"]
        if current_user.role not in privileged_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for regulation deletion"
            )

        company_id = current_user.company_id
        if not company_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot determine company from token. Please re-login."
            )

        deleted_count = await rag_service.delete_regulation(
            regulation_id=regulation_id,
            company_id=company_id,
        )

        logger.info(
            f"Deleted {deleted_count} vector chunks for regulation_id={regulation_id}, "
            f"company_id={company_id}"
        )

        return {
            "status": "success",
            "regulation_id": regulation_id,
            "deleted_chunks": deleted_count,
            "message": f"Deleted {deleted_count} vector chunks for regulation '{regulation_id}'."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting regulation vectors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete regulation vectors: {str(e)}")

@router.get("/conversations", response_model=ConversationListResponse)
async def get_user_conversations(
    page: int = 1,
    limit: int = 10,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get authenticated user's conversation history

    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 10)
    """
    try:
        conversations = await rag_service.get_user_conversations(
            user_id=current_user.user_id,
            page=page,
            limit=limit
        )

        return ConversationListResponse(conversations=conversations)

    except Exception as e:
        logger.error(f"Error getting conversations for user {current_user.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversations: {str(e)}")

@router.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get specific conversation details

    - **conversation_id**: Conversation ID
    """
    try:
        conversation = await rag_service.get_conversation(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )

        return conversation

    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Delete a conversation

    - **conversation_id**: Conversation ID
    """
    try:
        result = await rag_service.delete_conversation(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )

        return result

    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

@router.get("/search")
async def search_documents(
    query: str,
    collection_name: str = RAG_COLLECTION_NAME,
    limit: int = 5,
    current_user: UserPrincipal = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Search documents using vector similarity

    - **query**: Search query
    - **collection_name**: Collection to search in
    - **limit**: Maximum results to return

    Requires admin or manager role.
    """
    try:
        # Restrict to privileged roles only
        # Roles are normalized to lowercase in auth.py
        privileged_roles = ["admin", "manager", "hr_manager", "super_admin"]
        if current_user.role not in privileged_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for document search"
            )

        results = await rag_service.search_documents(
            query=query,
            collection_name=collection_name,
            limit=limit,
            user_role=current_user.role,
            department_id=current_user.department_id,
            company_id=current_user.company_id,
        )

        return {"results": results}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/health")
async def rag_health_check(rag_service: RAGService = Depends(get_rag_service)):
    """Health check for RAG service"""
    try:
        health_status = await rag_service.health_check()
        return health_status
    except Exception as e:
        logger.error(f"RAG health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc)
        }

