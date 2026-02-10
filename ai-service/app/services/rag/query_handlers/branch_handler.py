"""Branch query handler"""
import logging
from typing import Dict, Any
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class BranchQueryHandler(BaseQueryHandler):
    """Handle branch-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "branches"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin chi nhánh"
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle branch count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Add default filters
        if "status" not in query:
            query["status"] = "active"
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        count = await collection.count_documents(query)
        return f"🏪 **Thống kê chi nhánh:**\n\n🔹 **Tổng số chi nhánh đang hoạt động:** {count}"
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle branch list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "status" not in query:
            query["status"] = "active"
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        branches = await collection.find(query).limit(50).to_list(length=None)
        
        if not branches:
            return "Không tìm thấy chi nhánh nào."
        
        response = f"🏪 **Danh sách chi nhánh:**\n\n"
        
        for i, branch in enumerate(branches[:15], 1):
            name = branch.get("name", "N/A")
            city = branch.get("city", "N/A")
            code = branch.get("code", "N/A")
            response += f"**{i}. {name}**\n"
            response += f"   📍 **Vị trí:** {city} | 🆔 **Mã:** {code}\n\n"
        
        return response
    
    async def _handle_by_city(self, query: Dict[str, Any]) -> str:
        """Handle branches grouped by city"""
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
            {"$group": {"_id": "$city", "count": {"$sum": 1}, "branches": {"$push": "$name"}}},
            {"$sort": {"count": -1}}
        ]
        results = await self._aggregate(pipeline)
        
        if not results:
            return "Không tìm thấy thông tin phù hợp."
        
        response = f"🏪 **Chi nhánh theo thành phố:**\n\n"
        
        for item in results:
            city = item['_id'] or 'Chưa xác định'
            branches_list = ', '.join(item['branches'][:3])
            response += f"📍 **{city}**: {item['count']} chi nhánh ({branches_list})\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format branch item"""
        name = item.get("name", "N/A")
        city = item.get("city", "N/A")
        code = item.get("code", "N/A")
        return f"**{index}.** {name} ({city}) - Mã: {code}\n"

