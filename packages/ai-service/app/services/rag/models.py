"""Data models and schemas for RAG service"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


# Collection configuration mapping (Comment 11)
# Maps logical collection names to MongoDB collection names and attribute names
COLLECTION_CONFIG = {
    "users": {
        "mongo_name": "users",
        "attr_name": "users_collection",
    },
    "departments": {
        "mongo_name": "departments",
        "attr_name": "departments_collection",
    },
    "branches": {
        "mongo_name": "branches",
        "attr_name": "branches_collection",
    },
    "attendance": {
        "mongo_name": "attendances",  # Mongoose pluralizes
        "attr_name": "attendance_collection",
    },
    "requests": {
        "mongo_name": "requests",
        "attr_name": "requests_collection",
    },
    "shifts": {
        "mongo_name": "shifts",
        "attr_name": "shifts_collection",
    },
    "payroll": {
        "mongo_name": "payrollrecords",  # Mongoose lowercases PayrollRecords
        "attr_name": "payroll_collection",
    },
    "employeeschedules": {
        "mongo_name": "employeeschedules",
        "attr_name": "employeeschedules_collection",
    },
    "employeeshiftassignments": {
        "mongo_name": "employeeshiftassignments",
        "attr_name": "employeeshiftassignments_collection",
    },
}


class QueryType(Enum):
    """Query type enumeration"""
    COUNT = "count"
    LIST = "list"
    DETAIL = "detail"
    BY_DEPARTMENT = "by_department"
    BY_BRANCH = "by_branch"
    BY_ROLE = "by_role"
    BY_STATUS = "by_status"
    BY_TYPE = "by_type"
    BY_CITY = "by_city"
    TOTAL = "total"
    AVERAGE = "average"
    TODAY = "today"
    PENDING = "pending"
    WITH_EMPLOYEES = "with_employees"


class AggregationType(Enum):
    """Aggregation type for dynamic queries"""
    NONE = "none"
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    GROUP_BY = "group_by"
    COUNT_BY_BRANCH_CITY = "count_by_branch_city"


# Schema information for all collections
COLLECTION_SCHEMAS = {
    "users": {
        "description": "Nhân viên trong công ty",
        "fields": {
            "name": "Tên nhân viên",
            "email": "Email",
            "phone": "Số điện thoại",
            "position": "Chức danh/vị trí",
            "role": "Vai trò (EMPLOYEE, SUPERVISOR, MANAGER, HR_MANAGER, ADMIN, SUPER_ADMIN)",
            "department": "ID phòng ban (ObjectId)",
            "branch": "ID chi nhánh (ObjectId)",
            "isActive": "Trạng thái hoạt động (true/false)",
            "leaveBalance": "Số ngày nghỉ phép còn lại",
            "baseSalary": "Lương cơ bản",
            "createdAt": "Ngày tạo",
            "updatedAt": "Ngày cập nhật"
        }
    },
    "departments": {
        "description": "Phòng ban",
        "fields": {
            "name": "Tên phòng ban",
            "code": "Mã phòng ban",
            "description": "Mô tả",
            "branchId": "ID chi nhánh",
            "managerId": "ID quản lý",
            "budget": "Ngân sách",
            "status": "Trạng thái (active/inactive)",
            "createdAt": "Ngày tạo"
        }
    },
    "branches": {
        "description": "Chi nhánh công ty",
        "fields": {
            "name": "Tên chi nhánh",
            "code": "Mã chi nhánh",
            "city": "Thành phố",
            "country": "Quốc gia",
            "phone": "Số điện thoại",
            "email": "Email",
            "managerId": "ID quản lý chi nhánh",
            "status": "Trạng thái",
            "createdAt": "Ngày tạo"
        }
    },
    "attendance": {
        "description": "Bảng chấm công",
        "fields": {
            "userId": "ID nhân viên",
            "date": "Ngày chấm công",
            "checkIn": "Giờ vào",
            "checkOut": "Giờ ra",
            "status": "Trạng thái (present, absent, late, on_leave, weekend, overtime)",
            "workHours": "Số giờ làm việc",
            "locationId": "ID chi nhánh",
            "approvalStatus": "Trạng thái duyệt (PENDING, APPROVED, REJECTED)",
            "approvedBy": "Người duyệt",
            "workCredit": "Tính công (0, 0.5, 1.0)"
        }
    },
    "requests": {
        "description": "Đơn từ (nghỉ phép, tăng ca, etc.)",
        "fields": {
            "userId": "ID nhân viên",
            "type": "Loại đơn (leave, sick, unpaid, compensatory, maternity, overtime, remote, late, correction, other)",
            "startDate": "Ngày bắt đầu",
            "endDate": "Ngày kết thúc",
            "reason": "Lý do",
            "urgency": "Độ ưu tiên (low, medium, high)",
            "status": "Trạng thái (pending, approved, rejected)",
            "approvedBy": "Người duyệt",
            "approvedAt": "Ngày duyệt",
            "createdAt": "Ngày tạo"
        }
    },
    "shifts": {
        "description": "Ca làm việc",
        "fields": {
            "name": "Tên ca",
            "code": "Mã ca",
            "startTime": "Giờ bắt đầu",
            "endTime": "Giờ kết thúc",
            "description": "Mô tả",
            "status": "Trạng thái"
        }
    },
    "payroll": {
        "description": "Bảng lương",
        "fields": {
            "userId": "ID nhân viên",
            "month": "Tháng (1-12)",
            "year": "Năm",
            "baseSalary": "Lương cơ bản",
            "allowances": "Phụ cấp",
            "deductions": "Khấu trừ",
            "grossSalary": "Lương gross",
            "netSalary": "Lương net",
            "status": "Trạng thái",
            "createdAt": "Ngày tạo"
        }
    },
    "employeeschedules": {
        "description": "Lịch làm việc nhân viên",
        "fields": {
            "userId": "ID nhân viên (ObjectId)",
            "date": "Ngày làm việc",
            "shiftId": "ID ca làm việc (ObjectId)",
            "shiftName": "Tên ca (denormalized)",
            "startTime": "Giờ bắt đầu (HH:mm)",
            "endTime": "Giờ kết thúc (HH:mm)",
            "status": "Trạng thái (scheduled, completed, missed, off)",
            "location": "Địa điểm làm việc",
            "team": "Nhóm/tổ",
            "notes": "Ghi chú",
            "attendanceId": "ID chấm công liên kết (ObjectId)",
            "leaveRequestId": "ID đơn nghỉ phép liên kết (ObjectId)"
        }
    },
    "employeeshiftassignments": {
        "description": "Phân ca làm việc cho nhân viên",
        "fields": {
            "userId": "ID nhân viên (ObjectId)",
            "shiftId": "ID ca làm việc (ObjectId)",
            "pattern": "Mẫu lịch (all, weekdays, weekends, custom, specific)",
            "daysOfWeek": "Các ngày trong tuần (0-6, cho pattern custom)",
            "specificDates": "Các ngày cụ thể (cho pattern specific)",
            "effectiveFrom": "Ngày bắt đầu hiệu lực",
            "effectiveTo": "Ngày kết thúc hiệu lực",
            "priority": "Độ ưu tiên",
            "isActive": "Trạng thái hoạt động (true/false)",
            "notes": "Ghi chú"
        }
    }
}


@dataclass
class QueryResult:
    """Structured query result"""
    count: Optional[int] = None
    results: Optional[List[Dict[str, Any]]] = None
    grouped: Optional[List[Dict[str, Any]]] = None
    sum_value: Optional[float] = None
    average: Optional[float] = None
    error: Optional[str] = None
    explanation: str = ""


@dataclass
class DynamicQueryData:
    """Dynamic query generation result"""
    collection: Optional[str] = None
    filter_query: Optional[Dict[str, Any]] = None
    aggregation: str = "none"
    group_by_field: Optional[str] = None
    sort: Optional[Dict[str, int]] = None
    limit: int = 10
    explanation: str = ""
    error: Optional[str] = None


@dataclass
class IntentResult:
    """Intent detection result"""
    is_match: bool
    query_type: str
    parameters: Dict[str, Any]

