"""RAG Chatbot Router - Handles RAG-based conversations and document queries"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.rag_service import RAGService
from app.utils.auth import get_current_user, UserPrincipal

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/rag",
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
    collection_name: str = Field("documents", description="MongoDB collection name")
    chunk_size: int = Field(1000, description="Text chunk size")
    chunk_overlap: int = Field(200, description="Overlap between chunks")

class ConversationListResponse(BaseModel):
    conversations: List[Dict[str, Any]]

# Dependency injection for RAG service
def get_rag_service():
    """Dependency to get RAG service instance"""
    return RAGService()

@router.post("/chat", response_model=ConversationResponse)
async def chat_with_rag(
    request: ConversationRequest,
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
        allowed_roles = ["employee", "supervisor", "manager", "hr_manager", "admin", "super_admin", "trial"]
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Role '{current_user.role}' not authorized for RAG operations"
            )

        # Process the message with RAG
        response = await rag_service.process_message(
            user_id=current_user.user_id,
            message=request.message,
            conversation_id=request.conversation_id,
            department_id=current_user.department_id,
            role=current_user.role,
            user_context={"user_id": current_user.user_id, "role": current_user.role, "department_id": current_user.department_id}
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
        logger.error(f"Error processing RAG chat: {str(e)}")
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
    - **collection_name**: MongoDB collection name (default: "documents")
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
    collection_name: str = "documents",
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
            department_id=current_user.department_id
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
            "timestamp": datetime.utcnow()
        }

