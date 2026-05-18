"""Department query handler"""
import logging
from typing import Dict, Any
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class DepartmentQueryHandler(BaseQueryHandler):
    """Handle department-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "departments"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin phòng ban"
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle department count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Add default filters for departments
        if "status" not in query:
            query["status"] = "active"
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        count = await collection.count_documents(query)
        return f"🏢 **Thống kê phòng ban:**\n\n🔹 **Tổng số phòng ban đang hoạt động:** {count} phòng"
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle department list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "status" not in query:
            query["status"] = "active"
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        depts = await collection.find(query).limit(50).to_list(length=None)
        
        if not depts:
            return "Không tìm thấy phòng ban nào."
        
        response = f"🏢 **Danh sách phòng ban:**\n\n"
        
        for i, dept in enumerate(depts[:15], 1):
            name = dept.get("name", "N/A")
            code = dept.get("code", "N/A")
            response += f"**{i}. {name}** | 🆔 Mã: {code}\n"
        
        return response
    
    async def _handle_with_employees(self, query: Dict[str, Any]) -> str:
        """Handle departments with employee count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Add default filters
        if "status" not in query:
            query["status"] = "active"
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        pipeline = [
            {"$match": query},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"dept_id": "$_id"},
                    "pipeline": [
                        {"$match": {
                            "$expr": {"$eq": ["$department", "$$dept_id"]},
                            "isActive": True
                        }}
                    ],
                    "as": "employees"
                }
            },
            {
                "$project": {
                    "name": 1,
                    "code": 1,
                    "employee_count": {"$size": "$employees"}
                }
            },
            {"$sort": {"employee_count": -1}}
        ]
        results = await self._aggregate(pipeline)
        
        if not results:
            return "Không tìm thấy thông tin phù hợp."
        
        response = f"🏢 **Phòng ban theo số nhân viên (đang hoạt động):**\n\n"
        
        for item in results[:15]:
            response += f"🔹 **{item['name']}**: {item['employee_count']} nhân viên\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format department item"""
        name = item.get("name", "N/A")
        code = item.get("code", "N/A")
        return f"**{index}.** {name} ({code})\n"

