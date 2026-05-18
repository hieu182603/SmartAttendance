"""Conversation management for RAG service"""
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.utils.config import CHATBOT_MAX_MESSAGES, RAG_CONTEXT_WINDOW

logger = logging.getLogger(__name__)


class ConversationManager:
    """Manage chat conversations with context window optimization"""
    
    def __init__(self, conversations_collection):
        """
        Initialize with conversations collection
        
        Args:
            conversations_collection: Motor collection for conversations
        """
        self.conversations_collection = conversations_collection
        self._context_window = RAG_CONTEXT_WINDOW
    
    async def load_or_create(
        self,
        conversation_id: Optional[str],
        user_id: str,
        department_id: Optional[str],
        role: str
    ) -> Dict[str, Any]:
        """
        Load existing conversation or create new one
        
        Uses projection to only load last N messages for context window optimization.
        
        Args:
            conversation_id: Existing conversation ID (if any)
            user_id: User ID
            department_id: User's department ID
            role: User role
            
        Returns:
            Conversation dict
        """
        if conversation_id:
            # Use aggregation to get only last N messages (context window)
            pipeline = [
                {"$match": {
                    "conversation_id": conversation_id,
                    "user_id": user_id
                }},
                {"$project": {
                    "conversation_id": 1,
                    "user_id": 1,
                    "department_id": 1,
                    "role": 1,
                    "created_at": 1,
                    "last_activity": 1,
                    # Only get last N messages for context
                    "messages": {"$slice": ["$messages", -self._context_window]},
                    "total_messages": {"$size": {"$ifNull": ["$messages", []]}}
                }}
            ]
            
            cursor = self.conversations_collection.aggregate(pipeline)
            conversations = await cursor.to_list(length=1)
            
            if conversations:
                conversation = conversations[0]
                logger.debug(f"Loaded conversation with {len(conversation.get('messages', []))} messages (context window: {self._context_window})")
                return conversation
        
        # Create new conversation
        conversation_id = str(uuid.uuid4())
        conversation = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "department_id": department_id,
            "role": role,
            "messages": [],
            "created_at": datetime.now(timezone.utc),
            "last_activity": datetime.now(timezone.utc)
        }
        
        return conversation
    
    async def save(self, conversation: Dict[str, Any]):
        """
        Save conversation to database
        
        Args:
            conversation: Conversation dict to save
        """
        conversation["last_activity"] = datetime.now(timezone.utc)
        
        # Remove temporary fields before saving
        save_data = {k: v for k, v in conversation.items() if k != "total_messages"}
        
        await self.conversations_collection.replace_one(
            {"conversation_id": conversation["conversation_id"]},
            save_data,
            upsert=True
        )
    
    def add_message(
        self,
        conversation: Dict[str, Any],
        role: str,
        content: str,
        sources: List[Dict[str, Any]] = None
    ):
        """
        Add message to conversation
        
        Args:
            conversation: Conversation to modify
            role: Message role ('user' or 'assistant')
            content: Message content
            sources: Optional sources for assistant messages
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc)
        }
        
        if sources:
            message["sources"] = sources
        
        conversation["messages"].append(message)

    
    def enforce_limits(self, conversation: Dict[str, Any]):
        """
        Enforce message count limits
        
        Args:
            conversation: Conversation to check
        """
        max_messages = CHATBOT_MAX_MESSAGES or 50
        
        if len(conversation["messages"]) > max_messages:
            # Keep most recent messages
            conversation["messages"] = conversation["messages"][-max_messages:]
    
    async def get_user_conversations(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get user's conversation history
        
        Args:
            user_id: User ID
            page: Page number
            limit: Number of conversations per page
            
        Returns:
            List of formatted conversations
        """
        skip = (page - 1) * limit
        
        conversations = await self.conversations_collection.find(
            {"user_id": user_id}
        ).sort("last_activity", -1).skip(skip).limit(limit).to_list(length=None)
        
        # Format conversations
        formatted_conversations = []
        for conv in conversations:
            formatted_conversations.append({
                "id": conv["conversation_id"],
                "lastActivity": conv["last_activity"],
                "messageCount": len(conv.get("messages", [])),
                "preview": self._get_preview(conv),
                "departmentId": conv.get("department_id"),
                "role": conv.get("role")
            })
        
        return formatted_conversations
    
    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific conversation
        
        Args:
            conversation_id: Conversation ID
            user_id: User ID (for verification)
            
        Returns:
            Conversation dict or None
        """
        conversation = await self.conversations_collection.find_one({
            "conversation_id": conversation_id,
            "user_id": user_id
        })
        
        if not conversation:
            return None
        
        return {
            "id": conversation["conversation_id"],
            "messages": conversation.get("messages", []),
            "lastActivity": conversation["last_activity"],
            "departmentId": conversation.get("department_id"),
            "role": conversation.get("role")
        }
    
    async def delete(
        self,
        conversation_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a conversation
        
        Args:
            conversation_id: Conversation ID
            user_id: User ID (for verification)
            
        Returns:
            True if deleted, False if not found
        """
        result = await self.conversations_collection.delete_one({
            "conversation_id": conversation_id,
            "user_id": user_id
        })
        
        return result.deleted_count > 0
    
    async def update_metadata(self, conversation_id: str):
        """
        Update conversation metadata (background task)
        
        Args:
            conversation_id: Conversation ID
        """
        try:
            await self.conversations_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"last_activity": datetime.now(timezone.utc)}}
            )
        except Exception as e:
            logger.error(f"Error updating conversation metadata: {str(e)}")
    
    def _get_preview(self, conversation: Dict[str, Any]) -> str:
        """Get conversation preview from last assistant message"""
        messages = conversation.get("messages", [])
        
        # Find last assistant message
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                content = msg.get("content", "")
                return content[:100] + "..." if len(content) > 100 else content
        
        return "No messages yet"

