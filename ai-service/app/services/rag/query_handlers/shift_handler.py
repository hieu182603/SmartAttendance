"""Shift query handler"""
import logging
from typing import Dict, Any
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class ShiftQueryHandler(BaseQueryHandler):
    """Handle shift-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "shifts"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin ca làm việc"
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle shift count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Add default filter
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        count = await collection.count_documents(query)
        return f"⏰ **Thống kê ca làm việc:**\n\n🔹 **Tổng số ca hiện có:** {count} ca"
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle shift list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "deletedAt" not in query:
            query["deletedAt"] = None
        
        shifts = await collection.find(query).limit(50).to_list(length=None)
        
        if not shifts:
            return "Không tìm thấy ca làm việc nào."
        
        response = f"⏰ **Danh sách ca làm việc:**\n\n"
        
        for i, shift in enumerate(shifts[:10], 1):
            name = shift.get("name", "N/A")
            code = shift.get("code", "N/A")
            start_time = str(shift.get("startTime", "")) if shift.get("startTime") else "N/A"
            end_time = str(shift.get("endTime", "")) if shift.get("endTime") else "N/A"
            response += f"**{i}. {name}** ({code})\n"
            response += f"   🕒 **Thời gian:** {start_time} - {end_time}\n\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format shift item"""
        name = item.get("name", "N/A")
        code = item.get("code", "N/A")
        start_time = str(item.get("startTime", "")) if item.get("startTime") else "N/A"
        end_time = str(item.get("endTime", "")) if item.get("endTime") else "N/A"
        return f"**{index}.** {name} ({code}) - {start_time} - {end_time}\n"

