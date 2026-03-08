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

# LLM intent classification prompt
LLM_INTENT_PROMPT = """Bạn là bộ phân loại intent cho hệ thống chấm công SmartAttendance.

Phân loại câu hỏi sau vào MỘT trong các intent:
- "general": chào hỏi, hỏi chung, hỏi về hệ thống, hỏi không liên quan
- "employee": hỏi về nhân viên (số lượng, danh sách, thông tin, ngày phép)
- "department": hỏi về phòng ban
- "attendance": hỏi về chấm công, đi làm, điểm danh, đi muộn, vắng mặt
- "request": hỏi về đơn từ (nghỉ phép, tăng ca, chờ duyệt)
- "branch": hỏi về chi nhánh
- "shift": hỏi về ca làm việc
- "payroll": hỏi về lương, thu nhập

Câu hỏi: "{message}"

Trả lời ĐÚNG 1 từ intent (không giải thích, không thêm gì khác):"""


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
        r"\bwho are you\b", r"\bgiúp\b", r"\bhelp\b", r"\bhướng dẫn\b"
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
        r"^có bao nhiêu nhân viên$",
        r"^công ty có bao nhiêu nhân viên$",
        r"^tổng số nhân viên$",
        r"số lượng nhân viên",
        r"bao nhiêu người",
        r"how many employees",
        r"total employees",
        r"employee count",
        r"nhân viên nào"
    ]
    
    EMPLOYEE_LIST_PATTERNS = [
        r"danh sách.*nhân viên",
        r"list.*employees",
        r"xem.*nhân viên",
        r"nhân viên.*phòng nào$"
    ]
    
    EMPLOYEE_DEPT_PATTERNS = [
        r"nhân viên.*phòng nào$",
        r"nhân viên.*bộ phận nào$"
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
    ]

    # Employee self leave balance patterns ("Tôi còn bao nhiêu ngày phép?")
    LEAVE_BALANCE_SELF_PATTERNS = [
        r"tôi.*còn.*bao nhiêu.*(ngày)?\s*(phép|nghỉ)",
        r"ngày.*phép.*còn lại.*của tôi",
        r"còn.*bao nhiêu.*phép.*nữa",
        r"số.*ngày.*phép.*của tôi",
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
        r"các.*phòng ban"
    ]
    
    DEPT_WITH_EMP_PATTERNS = [
        r"phòng ban.*nhiều.*nhân viên",
        r"phòng ban.*ít.*nhân viên"
    ]
    
    # Request query patterns
    REQUEST_PENDING_PATTERNS = [
        r"đơn.*chờ duyệt",
        r"đơn.*pending",
        r"đơn.*đang chờ",
        r"bao nhiêu.*đơn.*chờ",
        r"số.*đơn.*chờ"
    ]
    
    REQUEST_TYPE_PATTERNS = [
        r"đơn.*nghỉ phép",
        r"đơn.*xin phép",
        r"đơn.*tăng ca",
        r"đơn.*làm thêm",
        r"leave.*request",
        r"overtime.*request"
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
    ]
    
    ATTENDANCE_COUNT_PATTERNS = [
        r"có bao nhiêu.*đi làm",
        r"có bao nhiêu.*điểm danh",
        r"số.*người.*đi làm",
        r"tổng.*điểm danh"
    ]
    
    # NOTE: Patterns with "tôi" (personal) are now handled by
    # ATTENDANCE_SELF_ABSENCE_PATTERNS above. These are for general/admin queries.
    ATTENDANCE_STATUS_PATTERNS = [
        r"ai.*đi muộn",
        r"ai.*vắng mặt",
        r"ai.*nghỉ",
        r"ai.*on leave",
        r"nghỉ.*bao nhiêu.*buổi",
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
    
    # Payroll query patterns
    PAYROLL_TOTAL_PATTERNS = [
        r"tổng.*lương",
        r"tổng.*chi phí.*nhân sự",
        r"lương.*tháng nào",
        r"total.*payroll"
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
        
        return False, '', {}
    
    @classmethod
    def is_department_query(cls, message: str) -> Tuple[bool, str, dict]:
        """Detect department-related queries"""
        message_lower = message.lower().strip()
        
        for pattern in cls.DEPT_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        for pattern in cls.DEPT_LIST_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'list', {}
        
        for pattern in cls.DEPT_WITH_EMP_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'with_employees', {}
        
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
                elif 'vắng mặt' in message_lower or 'absent' in message_lower:
                    return True, 'by_status', {'status': 'absent'}
                elif 'nghỉ' in message_lower or 'on leave' in message_lower:
                    return True, 'by_status', {'status': 'on_leave'}
        
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
        
        for pattern in cls.PAYROLL_TOTAL_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'total', {}
        
        for pattern in cls.PAYROLL_AVG_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'average', {}
        
        for pattern in cls.PAYROLL_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
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
    def detect_intent(cls, message: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect the intent of a user message using regex (fast path).
        
        Returns: (intent_type, details)
        intent_type can be: general, employee, department, request, attendance, 
                           branch, shift, payroll, dynamic
        """
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
            
        is_emp, emp_type, emp_params = cls.is_employee_query(message)
        if is_emp:
            return 'employee', {'query_type': emp_type, 'params': emp_params}
        
        is_dept, dept_type, dept_params = cls.is_department_query(message)
        if is_dept:
            return 'department', {'query_type': dept_type, 'params': dept_params}
        
        is_branch, branch_type, branch_params = cls.is_branch_query(message)
        if is_branch:
            return 'branch', {'query_type': branch_type, 'params': branch_params}
        
        is_shift, shift_type, shift_params = cls.is_shift_query(message)
        if is_shift:
            return 'shift', {'query_type': shift_type, 'params': shift_params}
        
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
        
        Call this when regex-based detect_intent() returns 'dynamic',
        to get a more accurate classification using the LLM.
        
        Args:
            message: User message to classify
            
        Returns:
            Tuple of (intent_type, details)
        """
        if cls._llm is None:
            logger.warning("LLM not set for IntentDetector, falling back to 'general'")
            return 'general', {}
        
        try:
            prompt = LLM_INTENT_PROMPT.format(message=message)
            response = await cls._llm.ainvoke(prompt)
            
            # Extract the intent from response
            intent_raw = response.content.strip().lower() if hasattr(response, 'content') else str(response).strip().lower()
            
            # Clean up the response (remove quotes, extra text)
            intent_raw = intent_raw.strip('"\'').strip()
            
            # Map to valid intent types
            valid_intents = {
                'general', 'employee', 'department', 'attendance',
                'request', 'branch', 'shift', 'payroll'
            }
            
            if intent_raw in valid_intents:
                logger.info(f"LLM intent detection: '{message}' -> '{intent_raw}'")
                return intent_raw, {}
            else:
                logger.warning(f"LLM returned invalid intent '{intent_raw}' for message: '{message}'")
                return 'general', {}
                
        except Exception as e:
            logger.error(f"LLM intent detection failed: {str(e)}")
            return 'general', {}


