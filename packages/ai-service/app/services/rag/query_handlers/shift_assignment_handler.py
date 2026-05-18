"""Shift Assignment query handler for employee shift assignments"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class ShiftAssignmentQueryHandler(BaseQueryHandler):
    """Handle employee shift assignment queries (collection: employeeshiftassignments)"""
    
    @property
    def collection_name(self) -> str:
        return "employeeshiftassignments"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập phân ca làm việc"
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle shift assignment count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        count = await collection.count_documents(query)
        return f"📊 **Thống kê phân ca:**\n\n🔹 **Tổng số phân ca đang hoạt động:** {count}"
    
    async def _handle_list(self, query: Dict[str, Any], limit: int = 30) -> str:
        """Handle shift assignment list with user and shift details"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$lookup": {
                "from": "shifts",
                "localField": "shiftId",
                "foreignField": "_id",
                "as": "shift_info"
            }},
            {"$unwind": {"path": "$shift_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"effectiveFrom": -1}},
            {"$limit": limit}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
        if not records:
            return "Không tìm thấy phân ca nào."
        
        response = f"📋 **Danh sách phân ca:**\n\n"
        response += f"- **Tìm thấy:** {len(records)} phân ca\n\n"
        
        pattern_map = {
            "all": "Tất cả các ngày",
            "weekdays": "Ngày thường (T2-T6)",
            "weekends": "Cuối tuần (T7-CN)",
            "custom": "Tùy chỉnh",
            "specific": "Ngày cụ thể"
        }
        
        for i, r in enumerate(records[:10], 1):
            user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
            shift_name = r.get("shift_info", {}).get("name", "N/A") if r.get("shift_info") else "N/A"
            pattern = pattern_map.get(r.get("pattern", ""), r.get("pattern", "N/A"))
            effective_from = r.get("effectiveFrom")
            if isinstance(effective_from, datetime):
                effective_from = effective_from.strftime("%d/%m/%Y")
            else:
                effective_from = str(effective_from) if effective_from else "N/A"
            
            effective_to = r.get("effectiveTo")
            if isinstance(effective_to, datetime):
                effective_to = effective_to.strftime("%d/%m/%Y")
            else:
                effective_to = "Không giới hạn" if effective_to is None else str(effective_to)
            
            response += f"**{i}. {user_name}**\n"
            response += f"   - Ca: **{shift_name}** | Mẫu lịch: {pattern}\n"
            response += f"   - Hiệu lực: {effective_from} → {effective_to}\n\n"
        
        if len(records) > 10:
            response += f"*... và {len(records) - 10} phân ca khác*"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format shift assignment item"""
        pattern = item.get("pattern", "N/A")
        effective_from = item.get("effectiveFrom", "N/A")
        is_active = "✅" if item.get("isActive", False) else "❌"
        return f"**{index}.** Pattern: {pattern} | Từ: {effective_from} | {is_active}\n"
