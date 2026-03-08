"""Attendance query handler"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
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
    
    async def _handle_status_today(self, query: Dict[str, Any], user_id: str | None = None) -> str:
        """
        Trả lời \"Hôm nay tôi đã chấm công chưa?\" cho người dùng hiện tại.
        """
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Giới hạn theo user nếu có - convert to ObjectId for proper matching
        if user_id:
            try:
                query.setdefault("userId", ObjectId(user_id))
            except Exception:
                query.setdefault("userId", user_id)
        
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        records = await collection.find(query).sort("checkIn", 1).limit(3).to_list(length=None)
        
        if not records:
            return (
                "⚠️ Hôm nay hệ thống **chưa ghi nhận bản ghi chấm công** nào của bạn.\n\n"
                "💡 **Gợi ý:**\n"
                "- Bạn có thể mở mục **Chấm công** trên menu để thực hiện chấm công ngay.\n"
                "- Nếu bạn đã chấm công nhưng không thấy, hãy liên hệ quản lý trực tiếp."
            )
        
        # Lấy bản ghi check-in đầu tiên trong ngày
        first = records[0]
        check_in = first.get("checkIn")
        status = first.get("status", "present")
        location = first.get("locationName") or first.get("location") or ""
        
        # Format thời gian HH:MM nếu là datetime
        if isinstance(check_in, datetime):
            check_in_str = check_in.strftime("%H:%M")
        else:
            check_in_str = str(check_in) if check_in else "N/A"
        
        status_map = {
            "present": "đã chấm công",
            "late": "đã chấm công (đi muộn)",
            "absent": "vắng mặt",
        }
        status_display = status_map.get(status, status)
        
        response = f"✅ Hôm nay bạn **{status_display}** lúc **{check_in_str}**.\n"
        if location:
            response += f"- Địa điểm: **{location}**\n"
        
        # Nếu có nhiều bản ghi (check-in lại), báo thêm cho rõ
        if len(records) > 1:
            response += f"- Hệ thống ghi nhận tổng cộng **{len(records)}** lần chấm công hôm nay."
        
        return response

    async def _handle_custom(
        self,
        query_type: str,
        query: Dict[str, Any],
        message: str
    ) -> str:
        """
        Handle custom attendance query types.
        """
        if query_type == "history_range":
            # Khoảng thời gian được IntentDetector truyền vào qua khóa đặc biệt __range__
            range_value = query.pop("__range__", "week")
            absence_only = query.pop("__absence_only__", False)
            return await self._handle_history_range(query, range_value, absence_only)

        # Fallback về behavior mặc định
        return await super()._handle_custom(query_type, query, message)

    async def _handle_history_range(
        self,
        query: Dict[str, Any],
        range_value: str = "week",
        absence_only: bool = False,
    ) -> str:
        """
        Thống kê ngày công / ngày nghỉ của user trong khoảng thời gian.

        Quy tắc:
        - "week": tuần lịch Thứ 2–Chủ nhật hiện tại.
        - "month": tháng lịch hiện tại.
        - "last_week": tuần lịch trước.
        - "last_month": tháng lịch trước.
        - absence_only=True: đếm ngày vắng/nghỉ thay vì ngày công.
        """
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"

        today = datetime.now()

        # Xác định khoảng thời gian
        if range_value == "last_month":
            # Tháng trước
            if today.month == 1:
                start = datetime(today.year - 1, 12, 1)
                end = datetime(today.year, 1, 1)
            else:
                start = datetime(today.year, today.month - 1, 1)
                end = datetime(today.year, today.month, 1)
            range_label = "tháng trước"
        elif range_value == "last_week":
            # Tuần trước (Thứ 2–Chủ nhật)
            weekday = today.weekday()  # 0 = Monday
            this_week_start = datetime(today.year, today.month, today.day) - timedelta(days=weekday)
            start = this_week_start - timedelta(days=7)
            end = this_week_start
            range_label = "tuần trước"
        elif range_value == "month":
            start = datetime(today.year, today.month, 1)
            if today.month == 12:
                end = datetime(today.year + 1, 1, 1)
            else:
                end = datetime(today.year, today.month + 1, 1)
            range_label = "tháng này"
        else:
            # Mặc định: tuần hiện tại (Thứ 2–Chủ nhật)
            weekday = today.weekday()  # 0 = Monday
            start = datetime(today.year, today.month, today.day) - timedelta(days=weekday)
            end = start + timedelta(days=7)
            range_label = "tuần này"

        if absence_only:
            return await self._handle_absence_count(query, start, end, range_label)

        # --- Ngày công (workCredit > 0) ---
        query["date"] = {"$gte": start, "$lt": end}
        query["workCredit"] = {"$gt": 0}

        records = await collection.find(query).to_list(length=None)

        if not records:
            return (
                f"📅 Trong **{range_label}**, hệ thống **chưa ghi nhận ngày công nào** của bạn "
                f"(workCredit > 0). Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ bộ phận nhân sự."
            )

        total_days = len(records)

        # Breakdown cơ bản theo loại ngày / trạng thái
        weekday_days = 0
        weekend_days = 0
        overtime_days = 0

        for r in records:
            status = r.get("status", "")
            date_value = r.get("date")

            # Xác định ngày trong tuần nếu là datetime
            if isinstance(date_value, datetime):
                is_weekend = date_value.weekday() >= 5
            else:
                is_weekend = False

            if status == "overtime":
                overtime_days += 1

            if is_weekend:
                weekend_days += 1
            else:
                weekday_days += 1

        response_lines = [
            f"📅 **Thống kê ngày công {range_label}:**",
            "",
            f"- **Tổng ngày công (workCredit > 0):** {total_days} ngày",
        ]

        # Chỉ hiển thị breakdown nếu có dữ liệu thực sự
        breakdown_parts = []
        if weekday_days:
            breakdown_parts.append(f"{weekday_days} ngày thường")
        if weekend_days:
            breakdown_parts.append(f"{weekend_days} ngày cuối tuần")
        if overtime_days:
            breakdown_parts.append(f"{overtime_days} ngày có trạng thái tăng ca (overtime)")

        if breakdown_parts:
            breakdown_text = ", ".join(breakdown_parts)
            response_lines.append(f"- **Chi tiết:** {breakdown_text}")

        return "\n".join(response_lines)

    async def _handle_absence_count(
        self,
        query: Dict[str, Any],
        start: datetime,
        end: datetime,
        range_label: str,
    ) -> str:
        """
        Đếm ngày vắng/nghỉ phép của user trong khoảng thời gian.
        Đếm các bản ghi có status = 'absent' hoặc 'on_leave'.
        """
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"

        query["date"] = {"$gte": start, "$lt": end}
        query["status"] = {"$in": ["absent", "on_leave"]}

        records = await collection.find(query).to_list(length=None)
        absent_count = len(records)

        if absent_count == 0:
            return (
                f"✅ Trong **{range_label}**, bạn **không có ngày nghỉ/vắng** nào được ghi nhận. "
                f"Bạn đã đi làm đầy đủ! 🎉"
            )

        # Breakdown theo loại
        absent_days = sum(1 for r in records if r.get("status") == "absent")
        leave_days = sum(1 for r in records if r.get("status") == "on_leave")

        response_lines = [
            f"📅 **Thống kê ngày nghỉ/vắng {range_label}:**",
            "",
            f"- **Tổng ngày nghỉ/vắng:** {absent_count} ngày",
        ]

        detail_parts = []
        if absent_days:
            detail_parts.append(f"{absent_days} ngày vắng mặt")
        if leave_days:
            detail_parts.append(f"{leave_days} ngày nghỉ phép")

        if detail_parts:
            response_lines.append(f"- **Chi tiết:** {', '.join(detail_parts)}")

        return "\n".join(response_lines)
    
    async def _handle_today(self, query: Dict[str, Any]) -> str:
        """Handle today's attendance"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        today = datetime.now()
        today_start = datetime(today.year, today.month, today.day)
        today_end = today_start + timedelta(days=1)
        
        # Base query for today's records
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        # Calculate totals
        total_records = await collection.count_documents(query)
        
        # Query specific to people who actually came to work (present or late)
        present_query = query.copy()
        present_query["status"] = {"$in": ["present", "late"]}
        present_count = await collection.count_documents(present_query)
        
        # Get up to 20 present/late records for listing details
        records = await collection.find(present_query).limit(20).to_list(length=None)
        
        response = f"📅 **Chấm công hôm nay:**\n\n"
        response += f"✅ **Số người đã điểm danh (có mặt/đi muộn):** {present_count} / {total_records} nhân viên\n"
        
        if records:
            response += "\n**🔍 Danh sách điểm danh mới nhất:**\n"
            for r in records[:10]:
                status = r.get("status", "N/A")
                check_in = str(r.get("checkIn", "")) if r.get("checkIn") else "N/A"
                # Get the user name from the attendance record if populate happened, else we might need user_id
                user_id = str(r.get("user", "Unknown User"))
                # Sometimes user is populated as an object by the pipeline, sometimes not. Let's just keep it simple.
                # Since we don't have populate here in motor, we just show status
                
                # Map status to emoji/text
                status_map = {"present": "✅ Có mặt", "late": "⏰ Đi muộn"}
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

