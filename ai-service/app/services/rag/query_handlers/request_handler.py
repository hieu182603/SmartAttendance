"""Request query handler"""
import logging
from typing import Dict, Any
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class RequestQueryHandler(BaseQueryHandler):
    """Handle leave/request-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "requests"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin đơn từ"
    
    async def _handle_pending(self, query: Dict[str, Any]) -> str:
        """Handle pending requests"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        query["status"] = "pending"
        count = await collection.count_documents(query)
        
        # Get recent pending requests
        requests = await collection.find(query).sort("createdAt", -1).limit(10).to_list(length=None)
        
        response = f"📋 **Đơn từ đang chờ duyệt:**\n\n"
        response += f"🔍 **Số lượng đơn:** {count} đơn\n"
        
        if requests:
            response += "\n**📅 Danh sách đơn gần đây:**\n"
            for req in requests[:5]:
                req_type = req.get("type", "N/A")
                start_date = str(req.get("startDate", ""))
                end_date = str(req.get("endDate", ""))
                type_name = req_type.replace('_', ' ').title()
                response += f"🔹 **{type_name}** | {start_date} - {end_date}\n"
        
        return response
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle request count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        count = await collection.count_documents(query)
        return f"📊 **Thống kê đơn từ:**\n\n🔹 **Số lượng:** {count} đơn"
    
    async def _handle_by_type(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle requests by type"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        req_type = filters.get('type', 'leave') if filters else 'leave'
        query["type"] = req_type
        count = await collection.count_documents(query)
        
        type_names = {
            "leave": "nghỉ phép",
            "sick": "nghỉ ốm",
            "unpaid": "nghỉ không lương",
            "compensatory": "nghỉ bù",
            "maternity": "thai sản",
            "overtime": "tăng ca",
            "remote": "làm việc từ xa",
            "late": "đi muộn",
            "correction": "điều chỉnh",
            "other": "khác"
        }
        
        status_map = {"pending": "⏳ Đang chờ", "approved": "✅ Đã duyệt", "rejected": "❌ Đã từ chối"}
        type_name = type_names.get(req_type, req_type)
        return f"📊 **Thống kê đơn {type_name}:**\n\n🔹 **Số lượng:** {count} đơn"
    
    async def _handle_by_status(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle requests by status"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        status = filters.get('status', 'pending') if filters else 'pending'
        query["status"] = status
        count = await collection.count_documents(query)
        
        status_names = {
            "pending": "đang chờ",
            "approved": "đã duyệt",
            "rejected": "đã từ chối"
        }
        
        status_name = status_names.get(status, status)
        status_emoji = {"pending": "⏳", "approved": "✅", "rejected": "❌"}.get(status, "🔹")
        return f"📊 **Thống kê đơn {status_name}:**\n\n{status_emoji} **Số lượng:** {count} đơn"
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle request list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        requests = await collection.find(query).sort("createdAt", -1).limit(20).to_list(length=None)
        
        if not requests:
            return "Không tìm thấy đơn từ nào."
        
        response = f"📋 **Danh sách đơn từ:**\n\n"
        
        for i, req in enumerate(requests[:10], 1):
            req_type = req.get("type", "N/A")
            status = req.get("status", "N/A")
            start_date = str(req.get("startDate", ""))
            end_date = str(req.get("endDate", ""))
            type_name = req_type.replace('_', ' ').title()
            response += f"**{i}.** {type_name} - {status}\n"
            response += f"   Thời gian: {start_date} - {end_date}\n\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format request item"""
        req_type = item.get("type", "N/A")
        status = item.get("status", "N/A")
        start_date = str(item.get("startDate", ""))
        end_date = str(item.get("endDate", ""))
        type_name = req_type.replace('_', ' ').title()
        return f"**{index}.** {type_name} - {status} ({start_date} - {end_date})\n"

