"""Attendance query handler"""
import logging
import re
from typing import Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from app.services.rag.query_handlers.base import (
    BaseQueryHandler,
    get_today_range,
    get_date_range_for_period,
    VN_TZ
)

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
        
        # Force override userId for personal queries (Comment 2: don't use setdefault)
        if user_id:
            query["userId"] = self._convert_user_id(user_id)
        
        # Use Vietnam timezone (UTC+7) for "today" calculation (Comment 1)
        today_start, today_end = get_today_range(tz_offset_hours=7)
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        # Use aggregation pipeline with $lookup to branches for location name (Comment 4)
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "branches",
                "localField": "locationId",
                "foreignField": "_id",
                "as": "branch_info"
            }},
            {"$unwind": {"path": "$branch_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"checkIn": 1}},
            {"$limit": 3}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
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
        
        # Get location name from $lookup result (Comment 4)
        location = first.get("branch_info", {}).get("name", "") if first.get("branch_info") else ""
        
        # Format thời gian HH:MM nếu là datetime (hiển thị theo giờ Việt Nam).
        # MongoDB driver trả về datetime *naive* (không có tzinfo) nhưng mặc định là UTC,
        # nên cần gắn tz UTC rồi convert sang VN_TZ để tránh lệch giờ.
        if isinstance(check_in, datetime):
            if check_in.tzinfo is None:
                check_in = check_in.replace(tzinfo=timezone.utc)
            local_check_in = check_in.astimezone(VN_TZ)
            check_in_str = local_check_in.strftime("%H:%M")
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
        message: str,
        user_id: str = None
    ) -> str:
        """
        Handle custom attendance query types.
        """
        if query_type == "history_range":
            # Khoảng thời gian được IntentDetector truyền vào qua khóa đặc biệt __range__
            range_value = query.pop("__range__", "week")
            absence_only = query.pop("__absence_only__", False)
            return await self._handle_history_range(query, range_value, absence_only, user_id=user_id)

        # Fallback về behavior mặc định
        return await super()._handle_custom(query_type, query, message, user_id=user_id)

    async def _handle_history_range(
        self,
        query: Dict[str, Any],
        range_value: str = "week",
        absence_only: bool = False,
        user_id: str = None,
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

        # Inject user's own userId for personal history queries (Comment 7)
        if user_id:
            query["userId"] = self._convert_user_id(user_id)

        # Use shared utility for date range calculation with Vietnam timezone (Comment 1)
        start, end, range_label = get_date_range_for_period(range_value, tz_offset_hours=7)

        if absence_only:
            return await self._handle_absence_count(query, start, end, range_label)

        # --- Ngày đi làm: dựa trên trạng thái chấm công, không phụ thuộc workCredit ---
        # Xem các bản ghi trong khoảng thời gian với status không phải nghỉ/vắng.
        query["date"] = {"$gte": start, "$lt": end}
        query["status"] = {"$nin": ["absent", "on_leave"]}

        records = await collection.find(query).to_list(length=None)

        if not records:
            return (
                f"📅 Trong **{range_label}**, hệ thống **chưa ghi nhận ngày đi làm nào** của bạn. "
                f"Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ bộ phận nhân sự."
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
            f"📅 **Thống kê ngày đi làm {range_label}:**",
            "",
            f"- **Tổng số lần chấm công (có mặt/đi làm):** {total_days} bản ghi",
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
        """Handle today's attendance with user names via $lookup"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Use Vietnam timezone (UTC+7) for "today" calculation (Comment 1)
        today_start, today_end = get_today_range(tz_offset_hours=7)
        
        # Base query for today's records
        query["date"] = {"$gte": today_start, "$lt": today_end}
        
        # Count totals (all statuses)
        total_records = await collection.count_documents(query)
        present_query = query.copy()
        present_query["status"] = {"$in": ["present", "late"]}
        present_count = await collection.count_documents(present_query)
        
        # Pipeline for list: only show present/late employees
        list_query = query.copy()
        list_query["status"] = {"$in": ["present", "late"]}
        
        pipeline = [
            {"$match": list_query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"status": 1, "checkIn": 1}},
            {"$limit": 20}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
        response = f"📅 **Danh sách chấm công hôm nay:**\n\n"
        response += f"✅ **Số người đã điểm danh (có mặt/đi muộn):** {present_count} / {total_records} nhân viên\n"
        
        if records:
            response += "\n**🔍 Danh sách nhân viên đã đi làm:**\n\n"
            for r in records[:10]:
                status = r.get("status", "N/A")
                check_in = r.get("checkIn")
                if isinstance(check_in, datetime):
                    if check_in.tzinfo is None:
                        check_in = check_in.replace(tzinfo=timezone.utc)
                    local_check_in = check_in.astimezone(VN_TZ)
                    check_in_str = local_check_in.strftime("%H:%M")
                else:
                    check_in_str = str(check_in) if check_in else "N/A"
                
                # Get user name from $lookup result
                user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
                
                status_map = {"present": "✅ Có mặt", "late": "⏰ Đi muộn"}
                status_display = status_map.get(status, status)
                response += f"- **{user_name}** | {status_display} | 🕒 Check-in: *{check_in_str}*\n"
            
            if present_count > 10:
                response += f"\n*... và {present_count - 10} nhân viên khác*\n"
        
        return response
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle attendance count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        count = await collection.count_documents(query)
        return f"📊 **Thống kê chấm công:**\n\n🔹 **Tổng số bản ghi:** {count} bản ghi"
    
    async def _handle_by_status(self, query: Dict[str, Any], filters: Dict[str, Any] = None) -> str:
        """Handle attendance by status with user names via $lookup.
        
        Mặc định lọc theo hôm nay (VN timezone). Nếu filters/query có __range__
        thì dùng khoảng thời gian tương ứng (week/month/last_week/last_month).
        """
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Determine date range: today by default, or theo __range__ nếu có
        range_value = None
        if filters:
            range_value = filters.get('__range__')
        if not range_value:
            range_value = query.pop('__range__', None)
        
        if range_value:
            start, end, range_label = get_date_range_for_period(range_value, tz_offset_hours=7)
        else:
            start, end = get_today_range(tz_offset_hours=7)
            range_label = "hôm nay"
        
        query["date"] = {"$gte": start, "$lt": end}
        
        status = filters.get('status', 'present') if filters else 'present'
        query["status"] = status
        
        count = await collection.count_documents(query)
        
        # Xác định truy vấn cá nhân (self) nếu có userId cụ thể trong query
        # PermissionChecker cho employee/trial đã set userId = chính user đó (không phải $in list).
        is_self_query = False
        user_id_filter = query.get("userId")
        if user_id_filter is not None and not isinstance(user_id_filter, dict):
            is_self_query = True
        
        status_names = {
            "present": "đã điểm danh",
            "absent": "vắng mặt",
            "late": "đi muộn",
            "on_leave": "nghỉ phép",
            "weekend": "cuối tuần",
            "overtime": "tăng ca"
        }
        
        status_name = status_names.get(status, status)
        
        # Nếu là truy vấn cá nhân (employee hỏi về chính mình) → dùng câu chữ "bạn ..."
        if is_self_query:
            if status == "late":
                human_label = f"{range_label}"
                response = f"📊 **Thống kê đi muộn của bạn {human_label}:**\n\n"
                if count == 0:
                    response += "✅ Trong khoảng thời gian này bạn **không có ngày nào đi muộn** được ghi nhận."
                else:
                    response += f"🔹 **Bạn đi muộn {count} lần trong {human_label}.**\n"
            else:
                response = f"📊 **Thống kê trạng thái {status_name} của bạn {range_label}:**\n\n"
                response += f"🔹 **Số lần có trạng thái {status_name}:** {count}\n"
        else:
            response = f"📊 **Thống kê theo trạng thái {range_label}:**\n\n"
            response += f"🔹 **Số người {status_name} trong {range_label}:** {count} nhân viên\n"
        
        # Show list of employees with names
        if count > 0:
            pipeline = self._build_lookup_user_pipeline(query, limit=10)
            records = await collection.aggregate(pipeline).to_list(length=None)
            if records:
                response += "\n**Danh sách:**\n\n"
                for i, r in enumerate(records[:10], 1):
                    user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
                    check_in = r.get("checkIn")
                    if isinstance(check_in, datetime):
                        if check_in.tzinfo is None:
                            check_in = check_in.replace(tzinfo=timezone.utc)
                        local_check_in = check_in.astimezone(VN_TZ)
                        check_in_str = local_check_in.strftime("%H:%M")
                    else:
                        check_in_str = str(check_in) if check_in else "N/A"
                    response += f"{i}. **{user_name}** | Check-in: {check_in_str}\n"
                if count > 10:
                    response += f"\n*... và {count - 10} nhân viên khác*\n"
        
        return response
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle attendance list with user names via $lookup"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"date": -1}},
            {"$limit": 20}
        ]
        
        records = await collection.aggregate(pipeline).to_list(length=None)
        
        if not records:
            return "Không tìm thấy bản ghi chấm công nào."
        
        response = f"📋 **Danh sách chấm công:**\n\n"
        
        for i, r in enumerate(records[:10], 1):
            user_name = r.get("user_info", {}).get("name", "N/A") if r.get("user_info") else "N/A"
            date = r.get("date", "N/A")
            if isinstance(date, datetime):
                date = date.strftime("%d/%m/%Y")
            status = r.get("status", "N/A")
            status_map = {"present": "✅ Có mặt", "late": "⏰ Đi muộn", "absent": "❌ Vắng", "on_leave": "🔵 Nghỉ phép"}
            status_display = status_map.get(status, status)
            check_in = r.get("checkIn")
            if isinstance(check_in, datetime):
                if check_in.tzinfo is None:
                    check_in = check_in.replace(tzinfo=timezone.utc)
                local_check_in = check_in.astimezone(VN_TZ)
                check_in_str = local_check_in.strftime("%H:%M")
            else:
                check_in_str = str(check_in) if check_in else "N/A"
            response += f"- **{user_name}** | {status_display} | Ngày: {date} | Check-in: {check_in_str}\n"
        
        if len(records) > 10:
            response += f"\n*... và {len(records) - 10} bản ghi khác*\n"
        
        return response
    
    async def handle(
        self, 
        query_type: str, 
        message: str, 
        role: str, 
        department_id: str = None,
        filters: Dict[str, Any] = None,
        user_id: str = None
    ) -> str:
        """Handle attendance query with employee_name param support (Comment 2)"""
        # If filters contain employee_name, resolve it to userId first
        if filters and 'employee_name' in filters:
            employee_name = filters.pop('employee_name')
            employee = await self._resolve_employee_by_name(employee_name)
            if employee:
                filters['userId'] = employee['_id']
            else:
                return f"Xin lỗi, tôi không tìm thấy nhân viên nào tên **{employee_name}** trong hệ thống."
        
        return await super().handle(query_type, message, role, department_id, filters, user_id)
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format attendance item"""
        date = item.get("date", "N/A")
        status = item.get("status", "N/A")
        check_in = str(item.get("checkIn", "")) if item.get("checkIn") else "N/A"
        return f"**{index}.** Ngày: {date}, Trạng thái: {status}, Check-in: {check_in}\n"

