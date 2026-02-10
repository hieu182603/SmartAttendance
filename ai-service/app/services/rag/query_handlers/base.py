"""Base query handler for RAG service"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.services.rag.permissions import PermissionChecker

logger = logging.getLogger(__name__)


class BaseQueryHandler(ABC):
    """Base class for query handlers"""
    
    def __init__(self, collections: Dict[str, Any]):
        """
        Initialize with MongoDB collections
        
        Args:
            collections: Dict with collection names as keys and Motor collection objects as values
        """
        self.collections = collections
    
    @property
    @abstractmethod
    def collection_name(self) -> str:
        """Name of the collection this handler manages"""
        pass
    
    @property
    @abstractmethod
    def error_message(self) -> str:
        """Error message when access is denied"""
        pass
    
    def check_permission(self, role: str, department_id: str = None, user_id: str = None) -> tuple[bool, Dict[str, Any]]:
        """Check if user has permission to access this collection"""
        return PermissionChecker.check(role, self.collection_name, department_id, user_id)
    
    async def handle(
        self, 
        query_type: str, 
        message: str, 
        role: str, 
        department_id: str = None,
        filters: Dict[str, Any] = None,
        user_id: str = None
    ) -> str:
        """
        Handle a query
        
        Args:
            query_type: Type of query (count, list, etc.)
            message: Original message from user
            role: User role
            department_id: User's department ID
            filters: Additional filters
            user_id: User ID for employee-level filtering
            
        Returns:
            Response string
        """
        try:
            # Check permission
            has_access, permission_filter = self.check_permission(role, department_id, user_id)
            if not has_access:
                return f"Xin lỗi, {self.error_message}"
            
            # Build query
            query = permission_filter.copy()
            if filters:
                query.update(filters)
            
            # Handle query based on type
            if query_type == 'count':
                return await self._handle_count(query)
            elif query_type == 'list':
                return await self._handle_list(query)
            elif query_type == 'detail':
                return await self._handle_detail(query)
            elif query_type == 'by_status':
                return await self._handle_by_status(query, filters)
            elif query_type == 'by_type':
                return await self._handle_by_type(query, filters)
            elif query_type == 'pending':
                return await self._handle_pending(query)
            elif query_type == 'today':
                return await self._handle_today(query)
            elif query_type == 'with_employees':
                return await self._handle_with_employees(query)
            else:
                return await self._handle_custom(query_type, query, message)
        
        except Exception as e:
            logger.error(f"Error handling {self.collection_name} query: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: {str(e)}"
    
    async def _get_collection(self):
        """Get the collection object"""
        from motor.motor_asyncio import AsyncIOMotorClient
        collection_map = {
            "users": "users_collection",
            "departments": "departments_collection",
            "branches": "branches_collection",
            "attendance": "attendance_collection",
            "requests": "requests_collection",
            "shifts": "shifts_collection",
            "payroll": "payroll_collection"
        }
        attr_name = collection_map.get(self.collection_name)
        if attr_name:
            return getattr(self.collections, attr_name, None)
        return None
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle count query"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        count = await collection.count_documents(query)
        return f"📊 **Thống kê:**\n\n- **Tổng số:** {count}"
    
    async def _handle_list(self, query: Dict[str, Any], limit: int = 50) -> str:
        """Handle list query"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        items = await collection.find(query).limit(limit).to_list(length=None)
        return await self._format_list(items)
    
    async def _handle_detail(self, query: Dict[str, Any]) -> str:
        """Handle detail query"""
        return await self._handle_list(query, limit=10)
    
    async def _handle_by_status(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle by_status query"""
        if filters and 'status' in filters:
            query["status"] = filters['status']
        return await self._handle_count(query)
    
    async def _handle_by_type(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle by_type query"""
        if filters and 'type' in filters:
            query["type"] = filters['type']
        return await self._handle_count(query)
    
    async def _handle_pending(self, query: Dict[str, Any]) -> str:
        """Handle pending query"""
        query["status"] = "pending"
        return await self._handle_count(query)
    
    async def _handle_today(self, query: Dict[str, Any]) -> str:
        """Handle today query"""
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        return await self._handle_count(query)
    
    async def _handle_with_employees(self, query: Dict[str, Any]) -> str:
        """Handle with_employees query (for departments)"""
        return "Chức năng đang được phát triển"
    
    async def _handle_custom(
        self, 
        query_type: str, 
        query: Dict[str, Any], 
        message: str
    ) -> str:
        """Handle custom query types"""
        return f"Xin lỗi, tôi chưa hiểu rõ câu hỏi về {self.collection_name}."
    
    async def _format_list(self, items: list) -> str:
        """Format a list of items for display"""
        if not items:
            return "Không có dữ liệu phù hợp."
        
        response = f"📋 **Danh sách:**\n\n"
        response += f"- **Tìm thấy:** {len(items)} kết quả\n\n"
        
        for i, item in enumerate(items[:10], 1):
            response += await self._format_item(item, i)
        
        if len(items) > 10:
            response += f"\n... và {len(items) - 10} kết quả khác"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format a single item for display - override in subclasses"""
        return f"{index}. {item}\n"
    
    async def _aggregate(
        self, 
        pipeline: list, 
        collection_name: str = None
    ) -> list:
        """Run aggregation pipeline"""
        collection = await self._get_collection()
        if collection is None:
            return []
        
        return await collection.aggregate(pipeline).to_list(length=None)

