"""Role-based access control for RAG service"""

from typing import Dict, Any, Tuple


class PermissionChecker:
    """Check user permissions for database access"""
    
    # Role hierarchy: super_admin > admin > hr_manager > manager > supervisor > employee
    HIGH_ROLES = ['super_admin', 'admin', 'hr_manager']
    MID_ROLES = ['manager', 'supervisor']
    
    @staticmethod
    def check(
        role: str, 
        collection: str, 
        user_department_id: str = None,
        user_id: str = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user has permission to access collection data
        
        Returns: (has_access, filter_query)
        """
        role_lower = role.lower() if role else ""
        
        if collection == 'users':
            if role_lower in PermissionChecker.HIGH_ROLES:
                return True, {}
            elif role_lower in PermissionChecker.MID_ROLES and user_department_id:
                return True, {'department': user_department_id}
            else:
                return False, {}
        
        elif collection in ['departments', 'branches', 'shifts']:
            # All roles can see these (read-only)
            if role_lower in PermissionChecker.HIGH_ROLES:
                return True, {}
            elif role_lower in PermissionChecker.MID_ROLES:
                return True, {}
            else:
                # Employees can see basic info
                return True, {}
        
        elif collection == 'attendance':
            if role_lower in PermissionChecker.HIGH_ROLES:
                return True, {}
            elif role_lower in PermissionChecker.MID_ROLES and user_department_id:
                # Note: attendance collection uses 'userId', not 'department_id'.
                # The handler must resolve department → user IDs before querying.
                return True, {'__department_filter__': user_department_id}
            elif role_lower in ['employee', 'trial'] and user_id:
                return True, {'userId': user_id}
            else:
                return False, {}
        
        elif collection == 'requests':
            if role_lower in PermissionChecker.HIGH_ROLES:
                return True, {}
            elif role_lower in PermissionChecker.MID_ROLES and user_department_id:
                # Note: requests collection uses 'userId', not 'department_id'.
                # The handler must resolve department → user IDs before querying.
                return True, {'__department_filter__': user_department_id}
            elif role_lower in ['employee', 'trial'] and user_id:
                return True, {'userId': user_id}
            else:
                return False, {}
        
        elif collection == 'payroll':
            if role_lower in ['super_admin', 'admin', 'hr_manager']:
                return True, {}
            else:
                return False, {}
        
        return False, {}
    
    @staticmethod
    def get_role_permissions(role: str, department_id: str = None, user_id: str = None) -> Dict[str, str]:
        """
        Get permission description for a role
        
        Returns dict with permission description
        """
        role_lower = role.lower() if role else ""
        
        permissions = {
            "super_admin": "Có quyền truy cập TẤT CẢ dữ liệu",
            "admin": "Có quyền truy cập TẤT CẢ dữ liệu",
            "hr_manager": "Có quyền truy cập TẤT CẢ dữ liệu",
            "manager": f"Có quyền truy cập dữ liệu phòng ban của mình (department: {department_id})",
            "supervisor": f"Có quyền truy cập dữ liệu phòng ban của mình (department: {department_id})",
            "employee": f"Chỉ có quyền truy cập dữ liệu CÁ NHÂN của chính mình (userId: {user_id})"
        }
        
        return {"permission": permissions.get(role_lower, "Không có quyền truy cập")}
    
    @staticmethod
    def can_access_payroll(role: str) -> bool:
        """Check if role can access payroll data"""
        return role.lower() in ['super_admin', 'admin', 'hr_manager']
    
    @staticmethod
    def can_access_employee_data(role: str) -> bool:
        """Check if role can access employee data"""
        return role.lower() in PermissionChecker.HIGH_ROLES + PermissionChecker.MID_ROLES
    
    @staticmethod
    def can_access_all_attendance(role: str) -> bool:
        """Check if role can access all attendance data"""
        return role.lower() in PermissionChecker.HIGH_ROLES
    
    @staticmethod
    def get_allowed_roles_for_collection(collection: str) -> list:
        """Get list of roles that can access a collection.
        
        Note on access levels:
        - **Full access** (admin/hr_manager/super_admin): Can view ALL data in the collection.
        - **Department access** (manager/supervisor): Can view data within their department.
        - **Self-only access** (employee): Can ONLY view their own personal data.
          For 'attendance' and 'requests', employees are included because they can
          view their own attendance/requests. The actual filtering to self-only data
          is enforced by PermissionChecker.check() which adds userId filters.
        """
        restrictions = {
            'users': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor'],
            'departments': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'branches': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'attendance': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'requests': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'shifts': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'payroll': ['super_admin', 'admin', 'hr_manager'],
            'employeeschedules': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
            'employeeshiftassignments': ['super_admin', 'admin', 'hr_manager', 'manager', 'supervisor', 'employee'],
        }
        return restrictions.get(collection, [])

