"""Intent detection for RAG queries"""

import re
from typing import Tuple, Dict, Any


class IntentDetector:
    """Detect user intent from natural language queries"""
    
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
    ATTENDANCE_TODAY_PATTERNS = [
        r"hôm nay.*đi làm",
        r"hôm nay.*điểm danh",
        r"hôm nay.*có.*người",
        r"hôm nay.*may mắn",
        r"tôi.*điểm danh",
        r"tôi.*đi làm.*chưa",
        r"điểm danh.*chưa",
        r"tôi.*có.*đi làm"
    ]
    
    ATTENDANCE_COUNT_PATTERNS = [
        r"có bao nhiêu.*đi làm",
        r"có bao nhiêu.*điểm danh",
        r"số.*người.*đi làm",
        r"tổng.*điểm danh"
    ]
    
    ATTENDANCE_STATUS_PATTERNS = [
        r"ai.*đi muộn",
        r"ai.*vắng mặt",
        r"ai.*nghỉ",
        r"ai.*on leave",
        r"tôi.*nghỉ.*bao nhiêu",
        r"nghỉ.*bao nhiêu.*buổi",
        r"tháng.*nghỉ",
        r"tôi.*vắng",
        r"tôi.*đi muộn"
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
        
        # Check today patterns first
        for pattern in cls.ATTENDANCE_TODAY_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'today', {}
        
        # Check count patterns
        for pattern in cls.ATTENDANCE_COUNT_PATTERNS:
            if re.search(pattern, message_lower):
                return True, 'count', {}
        
        # Check status patterns
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
    def detect_intent(cls, message: str) -> Tuple[str, Dict[str, Any]]:
        """
        Detect the intent of a user message
        
        Returns: (intent_type, details)
        intent_type can be: general, employee, department, request, attendance, branch, shift, payroll, dynamic
        """
        # Check general questions first
        if cls.is_general_question(message):
            return 'general', {}
        
        # Check specific query types in order
        is_emp, emp_type, emp_params = cls.is_employee_query(message)
        if is_emp:
            return 'employee', {'query_type': emp_type, 'params': emp_params}
        
        is_dept, dept_type, dept_params = cls.is_department_query(message)
        if is_dept:
            return 'department', {'query_type': dept_type, 'params': dept_params}
        
        is_req, req_type, req_params = cls.is_request_query(message)
        if is_req:
            return 'request', {'query_type': req_type, 'params': req_params}
        
        is_att, att_type, att_params = cls.is_attendance_query(message)
        if is_att:
            return 'attendance', {'query_type': att_type, 'params': att_params}
        
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
        return 'dynamic', {}

