"""Intent detection for RAG queries

Hybrid approach:
1. Fast regex-based detection (primary) — zero latency, handles common patterns
2. LLM-based classification (fallback) — handles complex/varied phrasings
"""

import re
import json
import logging
from typing import Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

# LLM intent classification prompt (simple - returns just intent word)
LLM_INTENT_PROMPT_SIMPLE = """Bạn là bộ phân loại intent cho hệ thống chấm công SmartAttendance.

Phân loại câu hỏi sau vào MỘT trong các intent:
- "general": chào hỏi, hỏi chung, hỏi về hệ thống, hỏi không liên quan
- "employee": hỏi về nhân viên (số lượng, danh sách, thông tin, ngày phép, nhân viên mới)
- "department": hỏi về phòng ban
- "attendance": hỏi về chấm công, đi làm, điểm danh, đi muộn, vắng mặt
- "request": hỏi về đơn từ (nghỉ phép, tăng ca, chờ duyệt)
- "branch": hỏi về chi nhánh
- "shift": hỏi về ca làm việc
- "payroll": hỏi về lương, thu nhập
- "schedule": hỏi về lịch làm việc, lịch ca

Câu hỏi: "{message}"

Trả lời ĐÚNG 1 từ intent (không giải thích, không thêm gì khác):"""

# LLM intent classification prompt (detailed - returns JSON with intent + query_type + params)
LLM_INTENT_PROMPT = """Bạn là bộ phân loại intent cho hệ thống chấm công SmartAttendance.
Phân tích câu hỏi và trả về JSON chính xác.

## QUY TẮC QUAN TRỌNG:
- "cho tôi", "giúp tôi", "cho tôi biết", "cho tôi xem" = YÊU CẦU, KHÔNG PHẢI câu hỏi cá nhân.
  VD: "cho tôi xem danh sách nhân viên" → employee/list (KHÔNG phải self_info)
- "của tôi", "tôi đã", "tôi có", "tôi còn" = câu hỏi CÁ NHÂN.
  VD: "tôi đã chấm công chưa" → attendance/status_today
- Nếu câu hỏi nhắc đến "nhân viên", "người", "ai" → đây là câu hỏi THỐNG KÊ CHUNG (không phải cá nhân).

## Các intent và query_type hợp lệ:

### general (chào hỏi, hỏi chung, hỏi về hệ thống)
- query_type: "greeting", "help", "system_info"

### employee (hỏi về nhân viên)
- query_type:
  - "count": đếm số lượng nhân viên. VD: "có bao nhiêu nhân viên", "tổng số nhân viên"
  - "list": danh sách nhân viên. VD: "danh sách nhân viên", "xem nhân viên"
  - "recently_joined": nhân viên mới vào làm gần đây. VD: "nhân viên nào mới vào làm", "ai mới gia nhập", "nhân viên mới tuyển"
  - "self_info": thông tin cá nhân CỦA TÔI. VD: "thông tin của tôi", "tôi là ai"
  - "self_leave_balance": ngày phép CỦA TÔI. VD: "tôi còn bao nhiêu ngày phép"
  - "by_department": nhân viên theo phòng ban
  - "by_role": nhân viên theo vai trò
  - "detail_by_name": thông tin nhân viên cụ thể theo tên
- params: {{"role": "..."}} nếu hỏi theo vai trò, {{"department_name": "..."}} nếu hỏi theo phòng ban, {{"employee_name": "..."}} nếu hỏi theo tên

### department (hỏi về phòng ban)
- query_type: "count" (đếm), "list" (danh sách), "with_employees" (phòng ban kèm số nhân viên)

### attendance (hỏi về chấm công)
- query_type:
  - "status_today": CÂU HỎI CÁ NHÂN về chấm công hôm nay. VD: "tôi chấm công chưa", "tôi đi làm chưa"
  - "today": THỐNG KÊ CHUNG chấm công hôm nay. VD: "hôm nay bao nhiêu người đi làm", "ai đi làm hôm nay"
  - "history_range": lịch sử chấm công theo khoảng thời gian
  - "by_status": theo trạng thái (late/absent/present). VD: "ai đi muộn hôm nay", "bao nhiêu người vắng"
  - "count": đếm tổng bản ghi chấm công
- params: {{"status": "late/absent/present/on_leave"}}, {{"__range__": "week/month/last_week/last_month"}}, {{"__absence_only__": true/false}}

### request (hỏi về đơn từ)
- query_type: "pending" (đơn chờ duyệt), "by_type" (theo loại), "by_status" (theo trạng thái), "count" (đếm), "list" (danh sách)
- params: {{"type": "leave/sick/overtime/..."}}, {{"status": "pending/approved/rejected"}}

### branch (hỏi về chi nhánh)
- query_type: "count" (đếm), "list" (danh sách), "by_city" (theo thành phố)

### shift (hỏi về ca làm việc)
- query_type: "count" (đếm), "list" (danh sách)

### schedule (hỏi về lịch làm việc, lịch ca)
- query_type: "today" (lịch hôm nay), "week" (lịch tuần này)

### payroll (hỏi về lương)
- query_type: "total" (tổng lương), "average" (lương trung bình), "count" (đếm), "list" (danh sách)

## Câu hỏi: "{message}"

## Trả lời ĐÚNG JSON (không giải thích thêm):
```json
{{"intent": "...", "query_type": "...", "params": {{}}}}
```"""


class IntentDetector:
    """Detect user intent from natural language queries
    
    Uses a hybrid approach:
    - Regex patterns for fast, exact matching (primary path)
    - LLM classification for complex queries (fallback when regex misses)
    """
    
    # Class-level LLM reference for fallback intent detection
    _llm = None
    
    @classmethod
    def set_llm(cls, llm):
        """Set the LLM instance for fallback intent detection"""
        cls._llm = llm
    
    # General question patterns
    GENERAL_PATTERNS = [
        r"\bxin chào\b", r"\bhello\b", r"\bhi\b", r"\bchào\b", r"\bcảm ơn\b", 
        r"\bthank\b", r"\bbye\b", r"\btạm biệt\b", r"\bbạn là ai\b", 
        r"\bwho are you\b", r"\bgiúp\b", r"\bhelp\b", r"\bhướng dẫn\b",
        r"^chào$", r"^hi$", r"^hello$", r"^hey$",
        r"\bbạn có thể làm gì\b", r"\bbạn giúp được gì\b",
        r"\bhệ thống.*là gì\b", r"\bsmartattendance.*là gì\b",
        r"\bcó gì mới\b", r"\btôi hỏi gì được\b",
        r"\bhỏi.*gì.*được\b", r"\blàm được.*gì\b",
        r"\bbot.*làm.*gì\b", r"\bxin lỗi\b",
        r"^ok$", r"^oke$", r"^okie$", r"^good$",
        r"\btôi hiểu rồi\b", r"\bđược rồi\b", r"\bvâng\b",
    ]
    
    # Employee query patterns
    BRANCH_CITY_PATTERNS = [
        r"chi nhánh.*có bao nhiêu.*nhân viên",
        r"thành phố.*có bao nhiêu.*nhân viên",
        r"tp\.hcm.*nhân viên",
        r"hà nội.*nhân viên",
        r"đà nẵng.*nhân viên",
        r"nhân viên.*ở.*thành phố",
        r"nhân viên.*ở.*chi nhánh",
        r"nhân viên.*làm.*chi nhánh",
        r"nhân viên.*làm.*thành phố"
    ]
    
    EMPLOYEE_COUNT_PATTERNS = [
        r"^có bao nhiêu nhân viên",
        r"^công ty có bao nhiêu nhân viên",
        r"^tổng số nhân viên",
        r"số lượng nhân viên",
        r"bao nhiêu người",
        r"how many employees",
        r"total employees",
        r"employee count",
        r"có bao nhiêu nhân viên",
        r"tổng nhân viên",
        r"đếm nhân viên",
        r"nhân viên.*bao nhiêu",
        r"mấy nhân viên",
    ]
    
    EMPLOYEE_RECENTLY_JOINED_PATTERNS = [
        r"nhân viên.*mới.*vào.*làm",
        r"nhân viên.*mới.*gia nhập",
        r"nhân viên.*mới.*tuyển",
        r"nhân viên.*mới.*nhất",
        r"nhân viên.*gần đây",
        r"nhân viên.*mới.*vào",
        r"nhân viên.*mới.*tham gia",
        r"ai.*mới.*vào.*làm",
        r"ai.*mới.*gia nhập",
        r"người.*mới.*vào.*làm",
        r"người.*mới.*gia nhập",
        r"recently.*joined",
        r"new.*employees",
        r"mới.*vào.*công ty",
    ]
    
    EMPLOYEE_LIST_PATTERNS = [
        r"danh sách.*nhân viên",
        r"list.*employees",
        r"xem.*nhân viên",
        r"nhân viên.*phòng nào$",
        r"cho.*xem.*nhân viên",
        r"liệt kê.*nhân viên",
        r"nhân viên.*thuộc",
        r"tất cả nhân viên",
        r"những nhân viên",
        r"nhân viên.*gồm.*ai",
        r"ai.*là.*nhân viên",
        r"cho tôi.*danh sách.*nhân viên",
        r"show.*employees",
    ]
    
    EMPLOYEE_DEPT_PATTERNS = [
        r"nhân viên.*phòng nào$",
        r"nhân viên.*bộ phận nào$",
        r"nhân viên.*thuộc.*phòng",
        r"nhân viên.*ở.*phòng",
        r"người.*bên.*phòng",
        r"danh sách.*phòng.*có ai",
    ]

    EMPLOYEE_ROLE_PATTERNS = [
        r"nhân viên.*chức vụ",
        r"danh sách.*quản lý",
        r"nhân viên.*vị trí",
        r"ai.*làm.*role",
        r"ai.*là.*quản lý",
        r"danh sách.*admin",
        r"những.*chức vụ",
    ]

    # Employee self-info patterns ("Thông tin cá nhân của tôi", "Hồ sơ của tôi")
    SELF_INFO_PATTERNS = [
        r"thông tin.*cá nhân.*(của)?\s*tôi",
        r"thông tin.*của tôi",
        r"hồ sơ.*của tôi",
        r"profile.*của tôi",
        r"tôi là ai",
        r"thông tin.*tài khoản",
        r"my.*profile",
        r"my.*info",
        r"xem.*thông tin.*tôi",
        r"cho.*xem.*hồ sơ",
        r"tài khoản.*của tôi",
        r"email.*của tôi",
        r"chức vụ.*của tôi",
        r"vị trí.*của tôi",
    ]

    # Employee self leave balance patterns ("Tôi còn bao nhiêu ngày phép?")
    LEAVE_BALANCE_SELF_PATTERNS = [
        r"tôi.*còn.*bao nhiêu.*(ngày)?\s*(phép|nghỉ)",
        r"ngày.*phép.*còn lại.*của tôi",
        r"còn.*bao nhiêu.*phép.*nữa",
        r"số.*ngày.*phép.*của tôi",
        r"tôi.*còn.*phép",
        r"phép.*của tôi.*còn",
        r"ngày nghỉ.*còn lại",
        r"tôi.*mấy ngày phép",
        r"xem.*ngày phép",
        r"check.*ngày phép",
    ]
    
    # Department query patterns
    DEPT_COUNT_PATTERNS = [
        r"có bao nhiêu.*phòng ban",
        r"số.*phòng ban",
        r"tổng.*phòng ban",
        r"how many.*departments",
        r"count.*departments"
    ]
    
    DEPT_LIST_PATTERNS = [
        r"danh sách.*phòng ban",
        r"list.*departments",
        r"phòng ban.*nào",
        r"các.*phòng ban",
        r"cho.*xem.*phòng ban",
        r"liệt kê.*phòng ban",
        r"tất cả.*phòng ban",
        r"những.*phòng ban",
        r"xem.*phòng ban",
    ]
    
    DEPT_WITH_EMP_PATTERNS = [
        r"phòng ban.*nhiều.*nhân viên",
        r"phòng ban.*ít.*nhân viên",
        r"phòng.*nào.*nhiều.*nhân viên",
        r"phòng.*nào.*ít.*nhân viên",
        r"nhân viên.*mỗi.*phòng",
        r"nhân viên.*từng.*phòng",
        r"phòng ban.*kèm.*nhân viên",
        r"thống kê.*phòng ban.*nhân viên",
        r"số nhân viên.*mỗi.*phòng",
        r"số nhân viên.*từng.*phòng",
        r"phòng ban.*nào.*có",
        r"tình hình.*nhân sự.*các phòng",
        r"báo cáo.*số lượng.*phòng ban",
    ]
    
    # Request query patterns
    REQUEST_PENDING_PATTERNS = [
        r"đơn.*chờ duyệt",
        r"đơn.*pending",
        r"đơn.*đang chờ",
        r"bao nhiêu.*đơn.*chờ",
        r"số.*đơn.*chờ",
        r"đơn.*chưa duyệt",
        r"đơn.*cần duyệt",
        r"có.*đơn.*nào.*chờ",
        r"đơn.*nào.*đang.*chờ",
        r"xem.*đơn.*chờ",
        r"tôi.*có.*đơn.*chờ",
        r"của tôi.*đơn.*chờ",
        r"đơn.*của tôi.*chờ",
        r"đơn.*tôi.*gửi",
        r"đơn.*tôi.*đã.*nộp",
        r"đơn.*chờ tôi duyệt",
        r"đơn.*tôi.*cần duyệt",
        r"có.*đơn.*nào.*cần.*duyệt",
        r"danh sách.*đơn.*chưa xử lý",
    ]
    
    REQUEST_TYPE_PATTERNS = [
        r"đơn.*nghỉ phép",
        r"đơn.*xin phép",
        r"đơn.*tăng ca",
        r"đơn.*làm thêm",
        r"leave.*request",
        r"overtime.*request",
        r"đơn.*nghỉ ốm",
        r"đơn.*xin nghỉ",
        r"đơn.*của tôi",
        r"tôi.*có.*đơn.*nào",
        r"xem.*đơn.*của tôi",
        r"danh sách.*đơn",
    ]
    
    REQUEST_STATUS_PATTERNS = [
        r"đơn.*đã duyệt",
        r"đơn.*đã từ chối",
        r"đơn.*approved",
        r"đơn.*rejected"
    ]
    
    # Attendance query patterns
    # Câu hỏi dạng "tôi đã chấm công chưa" (cá nhân)
    ATTENDANCE_SELF_STATUS_PATTERNS = [
        r"hôm nay.*tôi.*chấm công.*chưa",
        r"hôm nay.*tôi.*đi.*làm.*chưa",
        r"nay.*tôi.*chấm công.*chưa",
        r"tôi.*chấm công.*chưa",
        r"tôi.*điểm danh.*chưa",
        r"hôm nay.*mình.*chấm công.*chưa",
        r"nay.*tôi.*chấm công.*lúc mấy",
        r"tôi.*chấm công.*lúc mấy",
        r"tôi.*chấm công.*mấy giờ",
        r"tôi.*check.?in.*chưa",
        r"tôi.*đi làm.*lúc mấy",
        r"tôi.*đi làm.*mấy giờ",
        r"tôi.*vào.*lúc mấy",
        r"giờ.*chấm công.*của tôi",
        r"giờ.*check.?in.*của tôi",
        r"tôi.*đã.*chấm công",
        r"mình.*chấm công.*chưa",
        r"mình.*đi làm.*chưa",
        r"tôi.*đi muộn.*chưa",
        r"tôi.*có.*đi muộn",
        r"tôi.*vào ca.*chưa",
        r"tôi.*đã.*điểm danh",
        r"hôm nay.*tôi.*có.*đi làm",
        r"tôi.*đến.*công ty.*chưa",
        r"tôi.*có mặt.*chưa",
    ]

    # Câu hỏi dạng "tuần này / tháng này tôi đi làm mấy ngày"
    ATTENDANCE_SELF_HISTORY_WEEK_PATTERNS = [
        r"tuần này.*tôi.*(đi làm|chấm công|làm việc)",
        r"trong tuần này.*tôi.*(đi làm|chấm công|làm việc)",
    ]

    ATTENDANCE_SELF_HISTORY_MONTH_PATTERNS = [
        r"tháng này.*tôi.*(đi làm|chấm công|làm việc)",
        r"trong tháng này.*tôi.*(đi làm|chấm công|làm việc)",
    ]

    # Câu hỏi dạng "tuần trước / tháng trước tôi đi làm / nghỉ mấy ngày"
    ATTENDANCE_SELF_HISTORY_LAST_WEEK_PATTERNS = [
        r"tuần trước.*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
        r"trong tuần trước.*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
        r"tuần (vừa rồi|qua).*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
    ]

    ATTENDANCE_SELF_HISTORY_LAST_MONTH_PATTERNS = [
        r"tháng trước.*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
        r"trong tháng trước.*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
        r"tháng (vừa rồi|qua).*tôi.*(đi làm|chấm công|làm việc|nghỉ)",
    ]

    # Câu hỏi cá nhân về nghỉ phép / vắng mặt ("tôi nghỉ mấy ngày", "tháng trước tôi nghỉ bao nhiêu")
    ATTENDANCE_SELF_ABSENCE_PATTERNS = [
        r"tôi.*nghỉ.*(mấy|bao nhiêu).*ngày",
        r"(mấy|bao nhiêu).*ngày.*tôi.*nghỉ",
        r"tôi.*vắng.*(mấy|bao nhiêu)",
        r"tôi.*nghỉ.*tháng (này|trước|vừa rồi|qua)",
        r"tôi.*nghỉ.*tuần (này|trước|vừa rồi|qua)",
    ]

    # Câu hỏi về chấm công hôm nay nói chung (thống kê)
    ATTENDANCE_TODAY_PATTERNS = [
        r"hôm nay.*đi làm",
        r"hôm nay.*điểm danh",
        r"hôm nay.*có.*người",
        r"hôm nay.*chấm công",
        r"chấm công.*hôm nay",
        r"ai.*đi làm.*hôm nay",
        r"ai.*chấm công.*hôm nay",
        r"thống kê.*chấm công.*hôm nay",
        r"báo cáo.*chấm công.*hôm nay",
        r"tổng kết.*chấm công.*hôm nay",
        r"hôm nay.*ai.*có mặt",
        r"hôm nay.*ai.*vắng",
        r"tình hình.*chấm công.*hôm nay",
        r"hôm nay.*tình hình.*đi làm",
    ]
    
    ATTENDANCE_COUNT_PATTERNS = [
        r"có bao nhiêu.*đi làm",
        r"có bao nhiêu.*điểm danh",
        r"số.*người.*đi làm",
        r"tổng.*điểm danh",
        r"bao nhiêu.*người.*chấm công",
        r"bao nhiêu.*nhân viên.*đi làm",
        r"mấy người.*đi làm",
        r"thống kê.*chấm công",
        r"tổng.*chấm công",
        r"tháng.*bao nhiêu.*nhân viên.*đi làm",
        r"tuần.*bao nhiêu.*nhân viên.*đi làm",
        r"bao nhiêu.*nhân viên.*đi làm.*đầy đủ",
        r"nhân viên.*đi làm.*đầy đủ",
        r"tháng này.*nhân viên.*đi làm",
        r"tuần này.*nhân viên.*đi làm",
    ]
    
    # NOTE: Patterns with "tôi" (personal) are now handled by
    # ATTENDANCE_SELF_ABSENCE_PATTERNS above. These are for general/admin queries.
    ATTENDANCE_STATUS_PATTERNS = [
        r"ai.*đi muộn",
        r"ai.*vắng mặt",
        r"ai.*nghỉ",
        r"ai.*on leave",
        r"nghỉ.*bao nhiêu.*buổi",
        r"nhân viên.*đi muộn",
        r"nhân viên.*vắng",
        r"nhân viên.*nghỉ",
        r"người.*đi muộn",
        r"người.*vắng mặt",
        r"danh sách.*đi muộn",
        r"danh sách.*vắng",
        r"bao nhiêu.*đi muộn",
        r"bao nhiêu.*vắng",
        r"số.*người.*đi muộn",
        r"số.*người.*vắng",
        r"số.*người.*nghỉ",
        r"hôm nay.*ai.*đi muộn",
        r"hôm nay.*ai.*vắng",
        r"hôm nay.*ai.*nghỉ",
        r"nhân viên.*nào.*đi muộn",
        r"nhân viên.*nào.*vắng",
        r"nhân viên.*nào.*nghỉ",
        r"ai.*chưa.*chấm công",
        r"ai.*chưa.*đi làm",
        r"ai.*chưa.*điểm danh",
        r"nhân viên.*chưa.*chấm công",
        r"người.*chưa.*chấm công",
        r"danh sách.*nhân sự.*đi muộn",
        r"thống kê.*vắng mặt",
        r"tình hình.*nghỉ phép.*các phòng",
        r"danh sách.*nghỉ.*hôm nay",
    ]
    
    # Branch query patterns
    BRANCH_COUNT_PATTERNS = [
        r"có bao nhiêu.*chi nhánh",
        r"số.*chi nhánh",
        r"tổng.*chi nhánh",
        r"how many.*branches",
        r"count.*branches"
    ]
    
    BRANCH_LIST_PATTERNS = [
        r"danh sách.*chi nhánh",
        r"list.*branches",
        r"các.*chi nhánh"
    ]
    
    BRANCH_CITY_Q_PATTERNS = [
        r"chi nhánh.*thành phố",
        r"chi nhánh.*ở.*đâu",
        r"chi nhánh.*city"
    ]
    
    # Shift query patterns
    SHIFT_COUNT_PATTERNS = [
        r"có bao nhiêu.*ca làm việc",
        r"số.*ca",
        r"tổng.*ca",
        r"how many.*shifts",
        r"count.*shifts"
    ]
    
    SHIFT_LIST_PATTERNS = [
        r"danh sách.*ca",
        r"list.*shifts",
        r"các.*ca làm việc"
    ]
    
    # Schedule query patterns
    SCHEDULE_TODAY_PATTERNS = [
        r"lịch làm việc.*hôm nay",
        r"hôm nay.*làm ca nào",
        r"hôm nay.*làm ca gì",
        r"hôm nay.*có lịch làm.*không",
        r"ca làm.*hôm nay",
        r"lịch.*hôm nay",
        r"hôm nay.*lịch.*làm",
        r"tôi.*làm ca.*gì.*hôm nay",
        r"tôi.*có lịch.*hôm nay",
        r"hôm nay.*tôi.*làm ca",
    ]
    
    SCHEDULE_WEEK_PATTERNS = [
        r"lịch làm việc.*tuần (này|tới|sau)",
        r"tuần (này|tới|sau).*làm ca nào",
        r"lịch.*tuần này",
        r"ca làm.*tuần này",
        r"tuần này.*tôi.*làm ca",
        r"tôi.*làm ca.*tuần này",
        r"lịch ca.*tuần",
    ]
    
    # Employee name specific patterns (Comment 4: narrower matching with Unicode, require keyword prefix)
    # Names must follow explicit keywords like "nhân viên [tên]" or "của [tên]"
    # Limit name to 2-5 words to avoid matching entire sentences
    EMPLOYEE_NAME_PATTERNS = [
        r"thông tin\s+(?:của\s+)?nhân viên\s+(?P<name>[\w\s]{2,50})",
        r"(?:tìm|xem|chi tiết)\s+nhân viên\s+(?P<name>[\w\s]{2,50})",
    ]
    
    LEAVE_BALANCE_OTHER_PATTERNS = [
        r"nhân viên\s+(?P<name>[\w\s]{2,50})\s+còn.*bao nhiêu.*phép",
        r"ngày.*phép.*của\s+nhân viên\s+(?P<name>[\w\s]{2,50})",
        r"xem.*ngày phép.*của\s+nhân viên\s+(?P<name>[\w\s]{2,50})",
    ]
    
    # Payroll query patterns
    PAYROLL_TOTAL_PATTERNS = [
        r"tổng.*lương",
        r"tổng.*chi phí.*nhân sự",
        r"lương.*tháng nào",
        r"total.*payroll",
        r"quỹ lương",
        r"tổng quỹ lương",
        r"chi phí lương",
        r"lương.*tổng",
        r"lương.*tháng này",
        r"tổng.*tiền.*lương",
        r"chi.*lương.*tháng",
    ]
    
    PAYROLL_SELF_PATTERNS = [
        r"lương.*của tôi",
        r"tôi.*lương.*bao nhiêu",
        r"tôi.*được.*bao nhiêu.*lương",
        r"lương.*tôi.*tháng",
        r"tôi.*nhận.*lương",
        r"thu nhập.*của tôi",
        r"tôi.*thu nhập.*bao nhiêu",
        r"xem.*lương.*của tôi",
        r"lương.*tháng.*của tôi",
        r"salary.*my",
    ]
    
    PAYROLL_AVG_PATTERNS = [
        r"lương.*trung bình",
        r"average.*salary",
        r"lương.*bình quân"
    ]
    
    PAYROLL_COUNT_PATTERNS = [
        r"có bao nhiêu.*lương",
        r"số.*nhận.*lương"
    ]
    
    @classmethod
    def is_general_question(cls, message: str) -> bool:
        """Check if message is a general question not requiring document retrieval"""
        message_lower = message.lower().strip()
        for pattern in cls.GENERAL_PATTERNS:
            if re.search(pattern, message_lower):
                return True
        return False
    
    @classmethod
    def is_employee_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect employee-related queries"""
        message_lower = message.lower().strip()

        # Self-info first: "Thông tin cá nhân của tôi"
        for pattern in cls.SELF_INFO_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'self_info', {}

        # Self leave balance: "Tôi còn bao nhiêu ngày phép?"
        for pattern in cls.LEAVE_BALANCE_SELF_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'self_leave_balance', {}
        
        # Check for branch/city patterns first (should be handled by dynamic query)
        for pattern in cls.BRANCH_CITY_PATTERNS:
            if re.search(pattern, message_lower):
                return False, '', {}
        
        # Check recently joined patterns (before count to avoid "nhân viên nào" false match)
        for pattern in cls.EMPLOYEE_RECENTLY_JOINED_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'recently_joined', {}
        
        # Check count patterns
        for pattern in cls.EMPLOYEE_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        # Check list patterns
        for pattern in cls.EMPLOYEE_LIST_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'list', {}
        
        # Check department patterns
        for pattern in cls.EMPLOYEE_DEPT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'by_department', {}
                
        # Check role patterns
        for pattern in cls.EMPLOYEE_ROLE_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'by_role', {}
                
        # Check leave balance for other employees (Comment 4: expanded exclusion list + Unicode)
        for pattern in cls.LEAVE_BALANCE_OTHER_PATTERNS:
            match = re.search(pattern, message_lower, re.UNICODE)
            if match:
                name = match.group("name").strip()
                if name and name not in ["tôi", "mình", "em", "anh", "chị", "bạn", "họ", "người", "ai"]:
                    return True, 'employee_leave_balance', {'employee_name': name}
                    
        # Check employee name details (Comment 4: expanded exclusion list)
        exclusion_words = ["tôi", "mình", "em", "anh", "chị", "bạn", "họ", "người", "ai", "nào", "gì"]
        for pattern in cls.EMPLOYEE_NAME_PATTERNS:
            match = re.search(pattern, message_lower, re.UNICODE)
            if match:
                name = match.group("name").strip()
                # Validate: name must be 2+ chars, not a pronoun/generic word, and 2-5 words max
                if name and name not in exclusion_words and 1 <= len(name.split()) <= 5:
                    return True, 'detail_by_name', {'employee_name': name}
        
        return False, '', {}
    
    @classmethod
    def is_department_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect department-related queries"""
        message_lower = message.lower().strip()
        
        # Check with_employees FIRST (more specific patterns)
        for pattern in cls.DEPT_WITH_EMP_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'with_employees', {}
        
        for pattern in cls.DEPT_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        for pattern in cls.DEPT_LIST_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'list', {}
        
        return False, '', {}
    
    @classmethod
    def is_request_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect leave/request-related queries"""
        message_lower = message.lower().strip()
        
        for pattern in cls.REQUEST_PENDING_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'pending', {}
        
        for pattern in cls.REQUEST_TYPE_PATTERNS:
            if re.search(pattern, message_lower):
                # Determine request type
                if 'nghỉ' in message_lower or 'phép' in message_lower or 'leave' in message_lower:
                    return True, 'by_type', {'type': 'leave'}
                elif 'tăng ca' in message_lower or 'làm thêm' in message_lower or 'overtime' in message_lower:
                    return True, 'by_type', {'type': 'overtime'}
                return True, 'count', {}
        
        for pattern in cls.REQUEST_STATUS_PATTERNS:
            if re.search(pattern, message_lower):
                if 'đã duyệt' in message_lower or 'approved' in message_lower:
                    return True, 'by_status', {'status': 'approved'}
                elif 'đã từ chối' in message_lower or 'rejected' in message_lower:
                    return True, 'by_status', {'status': 'rejected'}
        
        return False, '', {}
    
    @classmethod
    def is_attendance_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect attendance-related queries"""
        message_lower = message.lower().strip()
        
        # Check self-status patterns trước: "hôm nay tôi đã chấm công chưa"
        for pattern in cls.ATTENDANCE_SELF_STATUS_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'status_today', {}

        # Check self-history patterns: "tuần này/tháng này tôi đi làm mấy ngày"
        for pattern in cls.ATTENDANCE_SELF_HISTORY_WEEK_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'history_range', {'__range__': 'week'}

        for pattern in cls.ATTENDANCE_SELF_HISTORY_MONTH_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'history_range', {'__range__': 'month'}

        # Check LAST week/month history patterns: "tuần trước/tháng trước tôi nghỉ mấy ngày"
        for pattern in cls.ATTENDANCE_SELF_HISTORY_LAST_WEEK_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'history_range', {'__range__': 'last_week'}

        for pattern in cls.ATTENDANCE_SELF_HISTORY_LAST_MONTH_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'history_range', {'__range__': 'last_month'}

        # Check personal absence patterns: "tôi nghỉ mấy ngày"
        # Detect time range from message context
        for pattern in cls.ATTENDANCE_SELF_ABSENCE_PATTERNS:
            if re.search(pattern, message_lower):
                # Detect time range from the message
                range_val = cls._detect_time_range(message_lower)
                return True, 'history_range', {'__range__': range_val, '__absence_only__': True}
        
        # Check today patterns first
        for pattern in cls.ATTENDANCE_TODAY_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'today', {}
        
        # Check count patterns - by default users usually mean today's count
        for pattern in cls.ATTENDANCE_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'today', {}
        
        # Check status patterns (general/admin queries only — no "tôi")
        for pattern in cls.ATTENDANCE_STATUS_PATTERNS:
            if re.search(pattern, message_lower):
                if 'đi muộn' in message_lower or 'late' in message_lower:
                    return True, 'by_status', {'status': 'late'}
                elif 'vắng' in message_lower or 'absent' in message_lower:
                    return True, 'by_status', {'status': 'absent'}
                elif 'chưa' in message_lower:
                    # "ai chưa chấm công" = absent
                    return True, 'by_status', {'status': 'absent'}
                elif 'nghỉ' in message_lower or 'on leave' in message_lower:
                    return True, 'by_status', {'status': 'on_leave'}
                # Default for unmatched status patterns
                return True, 'by_status', {'status': 'absent'}
        
        return False, '', {}
    
    @classmethod
    def is_branch_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect branch-related queries"""
        message_lower = message.lower().strip()
        
        for pattern in cls.BRANCH_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        for pattern in cls.BRANCH_LIST_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'list', {}
        
        for pattern in cls.BRANCH_CITY_Q_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'by_city', {}
        
        return False, '', {}
    
    @classmethod
    def is_shift_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect shift-related queries"""
        message_lower = message.lower().strip()
        
        for pattern in cls.SHIFT_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        for pattern in cls.SHIFT_LIST_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'list', {}
        
        return False, '', {}
    
    @classmethod
    def is_payroll_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect payroll-related queries"""
        message_lower = message.lower().strip()
        
        # Check personal salary patterns first
        for pattern in cls.PAYROLL_SELF_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'self_salary', {}
        
        for pattern in cls.PAYROLL_TOTAL_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'total', {}
        
        for pattern in cls.PAYROLL_AVG_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'average', {}
        
        for pattern in cls.PAYROLL_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        # Comment 2: Ensure function always returns a value
        return False, '', {}
    
    @classmethod
    def is_schedule_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect schedule-related queries"""
        message_lower = message.lower().strip()
        
        # Comment 3: Use 'today' and 'week' to match BaseQueryHandler routing
        for pattern in cls.SCHEDULE_TODAY_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'today', {}
                
        for pattern in cls.SCHEDULE_WEEK_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'week', {}
                
        return False, '', {}
    
    @classmethod
    def _detect_time_range(cls, message_lower: str) -> str:
        """
        Detect time range from Vietnamese message text.
        
        Returns: 'last_month', 'last_week', 'month', 'week'
        """
        if re.search(r'tháng\s*(trước|vừa rồi|qua)', message_lower):
            return 'last_month'
        elif re.search(r'tuần\s*(trước|vừa rồi|qua)', message_lower):
            return 'last_week'
        elif re.search(r'tháng\s*này', message_lower):
            return 'month'
        elif re.search(r'tuần\s*này', message_lower):
            return 'week'
        # Default to current month for ambiguous questions like "tôi nghỉ mấy ngày"
        return 'month'
    
    @classmethod
    def _normalize_vietnamese(cls, text: str) -> str:
        """
        Normalize Vietnamese text for better intent detection (Comment 3).
        Handles common abbreviations.
        """
        if not text:
            return ""
        text = text.lower()
        
        # Comment 5: Only normalize unambiguous abbreviations
        # Avoid replacing full words like 'phòng' (already meaningful)
        # Avoid overly generic terms like 'off', 'ot' which have multiple meanings
        replacements = {
            r'\bnv\b': 'nhân viên',        # Clear abbreviation
            r'\bpb\b': 'phòng ban',         # Clear abbreviation
            r'\bcn\b': 'chi nhánh',         # Clear abbreviation
            r'\bđc\b': 'địa chỉ',           # Clear abbreviation
            r'\bsmp\b': 'smartattendance',  # App abbreviation
            r'\btp\.?hcm\b': 'thành phố hồ chí minh',  # Specific city abbreviation
        }
        
        for p, r in replacements.items():
            text = re.sub(p, r, text)
            
        return text.strip()

    @classmethod
    def detect_intent(cls, message: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect the intent of a user message using regex (fast path).
        
        Returns: (intent_type, details)
        intent_type can be: general, employee, department, request, attendance, 
                           branch, shift, payroll, dynamic
        """
        # Comment 3: Normalize Vietnamese text before intent matching
        message = cls._normalize_vietnamese(message)
        # Check general questions first
        if cls.is_general_question(message):
            return 'general', {}
        
        # Check specific query types in order
        is_att, att_type, att_params = cls.is_attendance_query(message)
        if is_att:
            return 'attendance', {'query_type': att_type, 'params': att_params}
            
        is_req, req_type, req_params = cls.is_request_query(message)
        if is_req:
            return 'request', {'query_type': req_type, 'params': req_params}
        
        # Check department BEFORE employee to catch cross-domain queries
        # like "số nhân viên mỗi phòng" (department with_employees)
        is_dept, dept_type, dept_params = cls.is_department_query(message)
        if is_dept:
            return 'department', {'query_type': dept_type, 'params': dept_params}
            
        is_emp, emp_type, emp_params = cls.is_employee_query(message)
        if is_emp:
            return 'employee', {'query_type': emp_type, 'params': emp_params}
        
        is_branch, branch_type, branch_params = cls.is_branch_query(message)
        if is_branch:
            return 'branch', {'query_type': branch_type, 'params': branch_params}
        
        is_shift, shift_type, shift_params = cls.is_shift_query(message)
        if is_shift:
            return 'shift', {'query_type': shift_type, 'params': shift_params}
            
        is_schedule, schedule_type, schedule_params = cls.is_schedule_query(message)
        if is_schedule:
            return 'schedule', {'query_type': schedule_type, 'params': schedule_params}
        
        is_payroll, payroll_type, payroll_params = cls.is_payroll_query(message)
        if is_payroll:
            return 'payroll', {'query_type': payroll_type, 'params': payroll_params}
        
        # Default to dynamic query for unknown intents
        # The async LLM fallback can be used by calling detect_intent_with_llm() separately
        return 'dynamic', {}
    
    @classmethod
    async def detect_intent_with_llm(cls, message: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect intent using LLM classification (async fallback).
        
        Returns detailed JSON with intent, query_type, and params.
        Call this when regex-based detect_intent() returns 'dynamic',
        to get a more accurate classification using the LLM.
        
        Args:
            message: User message to classify
            
        Returns:
            Tuple of (intent_type, details) where details includes query_type and params
        """
        if cls._llm is None:
            logger.warning("LLM not set for IntentDetector, falling back to 'general'")
            return 'general', {}
        
        try:
            prompt = LLM_INTENT_PROMPT.format(message=message)
            response = await cls._llm.ainvoke(prompt)
            
            response_text = response.content.strip() if hasattr(response, 'content') else str(response).strip()
            
            # Try to parse as JSON first (detailed response)
            parsed = cls._parse_llm_json_response(response_text)
            if parsed:
                intent = parsed.get('intent', 'general').lower().strip().strip('"\'')
                query_type = parsed.get('query_type', '')
                params = parsed.get('params', {})
                
                valid_intents = {
                    'general', 'employee', 'department', 'attendance',
                    'request', 'branch', 'shift', 'payroll', 'schedule'
                }
                
                if intent in valid_intents:
                    details = {}
                    if query_type:
                        details['query_type'] = query_type
                    if params and isinstance(params, dict):
                        details['params'] = params
                    logger.info(f"LLM intent detection (detailed): '{message}' -> intent='{intent}', query_type='{query_type}', params={params}")
                    return intent, details
            
            # Fallback: try to extract just the intent word
            intent_raw = response_text.lower().strip().strip('"\'')
            for char in ['{', '}', '[', ']', '`']:
                intent_raw = intent_raw.replace(char, '')
            intent_raw = intent_raw.strip()
            
            valid_intents = {
                'general', 'employee', 'department', 'attendance',
                'request', 'branch', 'shift', 'payroll', 'schedule'
            }
            
            if intent_raw in valid_intents:
                logger.info(f"LLM intent detection (simple): '{message}' -> '{intent_raw}'")
                return intent_raw, {}
            else:
                logger.warning(f"LLM returned unparseable response for message: '{message}': {response_text[:200]}")
                return 'general', {}
                
        except Exception as e:
            logger.error(f"LLM intent detection failed: {str(e)}")
            return 'general', {}
    
    @staticmethod
    def _parse_llm_json_response(response_text: str) -> Optional[Dict[str, Any]]:
        """
        Parse JSON from LLM response, handling markdown code blocks and extra text.
        
        Args:
            response_text: Raw LLM response text
            
        Returns:
            Parsed dict or None if parsing fails
        """
        try:
            text = response_text.strip()
            if '```json' in text:
                text = text.split('```json', 1)[1]
                if '```' in text:
                    text = text.split('```', 1)[0]
            elif '```' in text:
                text = text.split('```', 1)[1]
                if '```' in text:
                    text = text.split('```', 1)[0]
            
            text = text.strip()
            
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = text[start_idx:end_idx + 1]
                return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass
        return None


