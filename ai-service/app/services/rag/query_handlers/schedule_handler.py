"""Schedule query handler for employee work schedules"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from app.services.rag.query_handlers.base import BaseQueryHandler

logger = logging.getLogger(__name__)


class ScheduleQueryHandler(BaseQueryHandler):
    """Handle employee schedule-related queries (collection: employeeschedules)"""
    
    @property
    def collection_name(self) -> str:
        return "employeeschedules"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập lịch làm việc"
    
    async def _handle_today(self, query: Dict[str, Any]) -> str:
        """Handle today's schedule query"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        # Use $lookup to get user names
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"startTime": 1}},
            {"$limit": 30}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
        if not records:
            return "📅 Hôm nay **không có lịch làm việc** nào được ghi nhận."
        
        response = f"📅 **Lịch làm việc hôm nay ({today.strftime('%d/%m/%Y')}):**\n\n"
        response += f"- **Tổng số:** {len(records)} lịch\n\n"
        
        for i, r in enumerate(records[:10], 1):
            user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
            shift_name = r.get("shiftName", "N/A")
            start_time = r.get("startTime", "N/A")
            end_time = r.get("endTime", "N/A")
            status = r.get("status", "scheduled")
            
            status_map = {
                "scheduled": "📋 Đã lên lịch",
                "completed": "✅ Hoàn thành",
                "missed": "❌ Vắng",
                "off": "🔵 Nghỉ"
            }
            status_display = status_map.get(status, status)
            
            response += f"**{i}. {user_name}**\n"
            response += f"   - Ca: **{shift_name}** ({start_time} - {end_time})\n"
            response += f"   - Trạng thái: {status_display}\n\n"
        
        if len(records) > 10:
            response += f"*... và {len(records) - 10} lịch khác*"
        
        return response
    
    async def _handle_custom(
        self,
        query_type: str,
        query: Dict[str, Any],
        message: str
    ) -> str:
        """Handle custom schedule query types"""
        if query_type == "week":
            return await self._handle_week(query)
        elif query_type == "by_shift":
            return await self._handle_by_shift(query)
        return await super()._handle_custom(query_type, query, message)
    
    async def _handle_week(self, query: Dict[str, Any]) -> str:
        """Handle weekly schedule query"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        today = datetime.now()
        weekday = today.weekday()  # 0=Monday
        week_start = datetime(today.year, today.month, today.day) - timedelta(days=weekday)
        week_end = week_start + timedelta(days=7)
        
        query["date"] = {"$gte": week_start, "$lt": week_end}
        
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"date": 1, "startTime": 1}},
            {"$limit": 50}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
        if not records:
            return "📅 Tuần này **không có lịch làm việc** nào được ghi nhận."
        
        response = f"📅 **Lịch làm việc tuần này ({week_start.strftime('%d/%m')} - {week_end.strftime('%d/%m/%Y')}):**\n\n"
        response += f"- **Tổng số:** {len(records)} lịch\n\n"
        
        # Group by date
        current_date = None
        day_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
        count = 0
        for r in records:
            date_val = r.get("date")
            if isinstance(date_val, datetime):
                date_str = date_val.strftime('%d/%m')
                day_name = day_names[date_val.weekday()]
            else:
                date_str = str(date_val)
                day_name = ""
            
            if date_str != current_date:
                current_date = date_str
                response += f"\n**📆 {day_name} ({date_str}):**\n"
            
            count += 1
            if count > 20:
                response += f"\n*... và thêm lịch khác*"
                break
            
            user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
            shift_name = r.get("shiftName", "N/A")
            start_time = r.get("startTime", "N/A")
            end_time = r.get("endTime", "N/A")
            response += f"  🔹 **{user_name}** | Ca: {shift_name} ({start_time}-{end_time})\n"
        
        return response
    
    async def _handle_by_shift(self, query: Dict[str, Any]) -> str:
        """Handle schedule grouped by shift"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$shiftName",
                "count": {"$sum": 1},
                "shift_id": {"$first": "$shiftId"},
                "start_time": {"$first": "$startTime"},
                "end_time": {"$first": "$endTime"}
            }},
            {"$sort": {"start_time": 1}}
        ]
        
        results = await collection.aggregate(pipeline).to_list(length=None)
        
        if not results:
            return "📅 Hôm nay **không có lịch làm việc** theo ca nào."
        
        response = "📅 **Thống kê lịch làm việc hôm nay theo ca:**\n\n"
        
        for item in results:
            shift_name = item['_id'] or "Chưa xác định"
            start_time = item.get('start_time', 'N/A')
            end_time = item.get('end_time', 'N/A')
            response += f"🔹 **{shift_name}** ({start_time}-{end_time}): {item['count']} nhân viên\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format schedule item"""
        shift_name = item.get("shiftName", "N/A")
        date = item.get("date", "N/A")
        status = item.get("status", "N/A")
        start_time = item.get("startTime", "N/A")
        end_time = item.get("endTime", "N/A")
        return f"**{index}.** {date} | Ca: {shift_name} ({start_time}-{end_time}) | Trạng thái: {status}\n"
