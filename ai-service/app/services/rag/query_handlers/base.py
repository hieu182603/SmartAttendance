"""Base query handler for RAG service"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
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
    
    async def _resolve_department_user_ids(self, department_id: str) -> List[Any]:
        """
        Resolve department ID to list of user ObjectIds belonging to that department.
        Used for collections (attendance, requests) that don't have department_id field.
        
        Args:
            department_id: Department ObjectId string
            
        Returns:
            List of ObjectId instances belonging to the department.
            Returns ObjectId (not str) so that $in queries match MongoDB ObjectId fields correctly.
        """
        users_collection = getattr(self.collections, 'users_collection', None)
        if users_collection is None:
            logger.warning("users_collection not available for department resolution")
            return []
        
        try:
            # Try to convert to ObjectId for proper matching
            try:
                dept_oid = ObjectId(department_id)
            except Exception:
                dept_oid = department_id
            
            # Find all active users in this department
            users = await users_collection.find(
                {"department": dept_oid, "isActive": True},
                {"_id": 1}
            ).to_list(length=None)
            
            # Return ObjectId list (not str) for proper MongoDB $in matching
            user_ids = [u["_id"] for u in users]
            logger.debug(f"Resolved department {department_id} to {len(user_ids)} user IDs")
            return user_ids
        except Exception as e:
            logger.error(f"Error resolving department user IDs: {str(e)}")
            return []
    
    async def _resolve_department_filter(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """
        If query contains __department_filter__, resolve it to userId $in filter.
        
        Args:
            query: Query dict that may contain __department_filter__
            
        Returns:
            Updated query dict with __department_filter__ replaced by userId filter
        """
        dept_id = query.pop('__department_filter__', None)
        if dept_id:
            user_ids = await self._resolve_department_user_ids(dept_id)
            if user_ids:
                query['userId'] = {'$in': user_ids}
            else:
                # No users found in department - return impossible filter
                query['userId'] = {'$in': []}
        return query
    
    def _convert_user_id(self, user_id: str) -> Any:
        """
        Convert user_id string to ObjectId if valid, for proper MongoDB matching.
        
        Args:
            user_id: User ID string
            
        Returns:
            ObjectId or original string
        """
        if user_id:
            try:
                return ObjectId(user_id)
            except Exception:
                return user_id
        return user_id
    
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
            filters: Additional filters (may contain special keys like __range__, __absence_only__)
            user_id: User ID for employee-level filtering
            
        Returns:
            Response string
        """
        try:
            # Check permission
            has_access, permission_filter = self.check_permission(role, department_id, user_id)
            if not has_access:
                return f"Xin lỗi, {self.error_message}. Bạn có thể hỏi tôi về thông tin cá nhân của bạn thay vì thông tin chung."
            
            # Build query - separate special params from MongoDB filters
            query = permission_filter.copy()
            special_params = {}
            if filters:
                for key, value in filters.items():
                    if key.startswith('__') and key.endswith('__'):
                        # Special params (e.g., __range__, __absence_only__)
                        special_params[key] = value
                    else:
                        query[key] = value
            
            # Re-inject special params into query for handlers that expect them
            query.update(special_params)
            
            # Resolve __department_filter__ to actual userId $in filter
            query = await self._resolve_department_filter(query)
            
            # Convert userId string to ObjectId for proper matching
            if 'userId' in query and isinstance(query['userId'], str):
                query['userId'] = self._convert_user_id(query['userId'])
            
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
            elif query_type == 'status_today':
                return await self._handle_status_today(query, user_id)
            elif query_type == 'with_employees':
                return await self._handle_with_employees(query)
            elif query_type == 'by_city':
                return await self._handle_by_city(query)
            elif query_type == 'total':
                return await self._handle_total(query)
            elif query_type == 'average':
                return await self._handle_average(query)
            else:
                return await self._handle_custom(query_type, query, message)
        
        except Exception as e:
            logger.error(f"Error handling {self.collection_name} query: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ."
    
    async def _resolve_employee_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Find an employee by name using case-insensitive regex matching.
        
        Args:
            name: Employee name (or partial name) to search for
            
        Returns:
            User document dict if found, None otherwise
        """
        users_collection = getattr(self.collections, 'users_collection', None)
        if users_collection is None:
            logger.warning("users_collection not available for employee name resolution")
            return None
        
        try:
            user = await users_collection.find_one(
                {"name": {"$regex": name, "$options": "i"}, "isActive": True}
            )
            if user:
                logger.debug(f"Resolved employee name '{name}' to userId: {user['_id']}")
            else:
                logger.debug(f"No employee found with name matching: '{name}'")
            return user
        except Exception as e:
            logger.error(f"Error resolving employee by name: {str(e)}")
            return None
    
    def _build_lookup_user_pipeline(self, match_query: Dict[str, Any], limit: int = 20) -> list:
        """
        Build a standard aggregation pipeline that joins with users collection
        to include user names in the result.
        
        Args:
            match_query: The $match stage query
            limit: Maximum number of results
            
        Returns:
            Aggregation pipeline list
        """
        return [
            {"$match": match_query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$limit": limit}
        ]
    
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
            "payroll": "payroll_collection",
            "employeeschedules": "employeeschedules_collection",
            "employeeshiftassignments": "employeeshiftassignments_collection"
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
    
    async def _handle_status_today(self, query: Dict[str, Any], user_id: str | None = None) -> str:
        """
        Handle personal \"status today\" query.
        Mặc định fallback về _handle_today; các handler cụ thể có thể override.
        """
        return await self._handle_today(query)
    
    async def _handle_with_employees(self, query: Dict[str, Any]) -> str:
        """Handle with_employees query (for departments)"""
        return "Chức năng đang được phát triển"
    
    async def _handle_by_city(self, query: Dict[str, Any]) -> str:
        """Handle by_city query - override in subclasses"""
        return "Xin lỗi, tôi chưa hỗ trợ truy vấn theo thành phố cho loại dữ liệu này."
    
    async def _handle_total(self, query: Dict[str, Any]) -> str:
        """Handle total aggregation query - override in subclasses"""
        return await self._handle_count(query)
    
    async def _handle_average(self, query: Dict[str, Any]) -> str:
        """Handle average aggregation query - override in subclasses"""
        return "Xin lỗi, tôi chưa hỗ trợ tính trung bình cho loại dữ liệu này."
    
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

