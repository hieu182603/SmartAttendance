"""Attendance query handler"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class AttendanceQueryHandler(BaseQueryHandler):
    """Handle attendance-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "attendance"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin chấm công"
    
    async def _handle_today(self, query: Dict[str, Any]) -> str:
        """Handle today's attendance"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        count = await collection.count_documents(query)
        records = await collection.find(query).limit(20).to_list(length=None)
        
        response = f"📅 **Chấm công hôm nay:**\n\n"
        response += f"✅ **Số người đã điểm danh:** {count} nhân viên\n"
        
        if records:
            response += "\n**🔍 Chi tiết điểm danh:**\n"
            for r in records[:5]:
                status = r.get("status", "N/A")
                check_in = str(r.get("checkIn", "")) if r.get("checkIn") else "N/A"
                # Map status to emoji/text
                status_map = {"present": "✅ Có mặt", "late": "⏰ Đi muộn", "absent": "❌ Vắng mặt"}
                status_display = status_map.get(status, status)
                response += f"🔹 **{status_display}** | 🕒 Check-in: *{check_in}*\n"
        
        return response
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle attendance count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        count = await collection.count_documents(query)
        return f"📊 **Thống kê chấm công:**\n\n🔹 **Tổng số bản ghi:** {count} bản ghi"
    
    async def _handle_by_status(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle attendance by status"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        status = filters.get('status', 'present') if filters else 'present'
        query["status"] = status
        
        count = await collection.count_documents(query)
        
        status_names = {
            "present": "đã điểm danh",
            "absent": "vắng mặt",
            "late": "đi muộn",
            "on_leave": "nghỉ phép",
            "weekend": "cuối tuần",
            "overtime": "tăng ca"
        }
        
        status_name = status_names.get(status, status)
        return f"📊 **Thống kê theo trạng thái:**\n\n🔹 **Số người {status_name}:** {count} nhân viên"
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle attendance list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        records = await collection.find(query).limit(20).to_list(length=None)
        
        if not records:
            return "Không tìm thấy bản ghi chấm công nào."
        
        response = f"📋 **Danh sách chấm công:**\n\n"
        
        for i, r in enumerate(records[:10], 1):
            date = r.get("date", "N/A")
            status = r.get("status", "N/A")
            check_in = str(r.get("checkIn", "")) if r.get("checkIn") else "N/A"
            response += f"**{i}.** Ngày: {date}, Trạng thái: {status}, Check-in: {check_in}\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format attendance item"""
        date = item.get("date", "N/A")
        status = item.get("status", "N/A")
        check_in = str(item.get("checkIn", "")) if item.get("checkIn") else "N/A"
        return f"**{index}.** Ngày: {date}, Trạng thái: {status}, Check-in: {check_in}\n"

