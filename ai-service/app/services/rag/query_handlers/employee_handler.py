"""Employee query handler"""
import logging
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId
from app.services.rag.query_handlers.base import BaseQueryHandler
from app.services.rag.permissions import PermissionChecker

logger = logging.getLogger(__name__)


class EmployeeQueryHandler(BaseQueryHandler):
    """Handle employee-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "users"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin nhân viên"
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle employee count with role breakdown"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        # Ensure only active employees
        if "isActive" not in query:
            query["isActive"] = True
        
        count = await collection.count_documents(query)
        
        response = f"📊 **Thống kê nhân viên:**\n\n"
        response += f"✅ **Tổng số nhân viên đang hoạt động:** {count} người\n"
        
        # Add role breakdown
        role_counts = await self._get_role_counts()
        if role_counts:
            response += "\n**🔍 Phân loại theo vai trò:**\n"
            for rc in role_counts:
                response += f"🔹 **{rc['role_name']}**: {rc['count']} người\n"
        
        return response
    
    async def _handle_list(self, query: Dict[str, Any]) -> str:
        """Handle employee list"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        employees = await collection.find(query).limit(20).to_list(length=None)
        
        if not employees:
            return "Không tìm thấy nhân viên phù hợp."
        
        response = f"👥 **Danh sách nhân viên:**\n\n"
        response += f"🔍 **Tìm thấy:** {len(employees)} nhân viên phù hợp\n\n"
        
        for i, emp in enumerate(employees[:10], 1):
            name = emp.get("name", "N/A")
            position = emp.get("position", "N/A")
            email = emp.get("email", "N/A")
            response += f"**{i}. {name}**\n"
            response += f"   🔹 **Vị trí:** {position}\n"
            response += f"   📧 **Email:** *{email}*\n\n"
        
        if len(employees) > 10:
            response += f"*... và {len(employees) - 10} nhân viên khác*"
        
        return response
    
    async def _handle_by_department(self, query: Dict[str, Any]) -> str:
        """Handle employees grouped by department"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        results = await self._aggregate(pipeline)
        
        if not results:
            return "Không tìm thấy thông tin phù hợp."
        
        response = f"🏢 **Nhân viên theo phòng ban:**\n\n"
        
        for item in results:
            dept_name = item['_id'] if item['_id'] else 'Chưa phân phòng'
            response += f"🔹 **{dept_name}**: {item['count']} nhân viên\n"
        
        return response
    
    async def _handle_by_role(self, role_filter: str, query: Dict[str, Any]) -> str:
        """Handle employees grouped by role"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        # Normalize role
        role_mapping = {
            "quản lý": "MANAGER",
            "manager": "MANAGER",
            "hr": "HR_MANAGER",
            "hr_manager": "HR_MANAGER",
            "nhân viên": "EMPLOYEE",
            "employee": "EMPLOYEE",
            "supervisor": "SUPERVISOR",
            "quản lý phòng": "SUPERVISOR",
            "admin": "ADMIN",
            "quản trị": "ADMIN"
        }
        
        normalized_role = role_mapping.get(role_filter.lower(), role_filter.upper())
        query["role"] = normalized_role
        
        count = await collection.count_documents(query)
        
        role_names = {
            "EMPLOYEE": "Nhân viên",
            "SUPERVISOR": "Supervisor",
            "MANAGER": "Quản lý",
            "HR_MANAGER": "HR Manager",
            "ADMIN": "Admin",
            "SUPER_ADMIN": "Super Admin"
        }
        
        role_display = role_names.get(normalized_role, normalized_role)
        return f"👥 **Nhân viên theo vai trò:**\n\n- **{role_display}:** {count} người"
    
    async def handle(
        self,
        query_type: str,
        message: str,
        role: str,
        department_id: str = None,
        filters: Dict[str, Any] = None,
        user_id: str = None
    ) -> str:
        """Handle employee query with specific types"""

        role_lower = role.lower() if role else ""

        # 1) Trường hợp: bất kỳ ai hỏi về NGÀY PHÉP CỦA CHÍNH MÌNH
        #    (Comment 9: bỏ restriction role_lower != "employee", cho phép tất cả role xem phép của mình)
        if query_type == "self_leave_balance":
            if not user_id:
                return "Xin lỗi, tôi không xác định được tài khoản của bạn để xem ngày phép. Vui lòng đăng nhập lại và thử lại."
            return await self._handle_self_leave_balance(user_id)

        # 2) HR/Admin/Manager xem ngày phép của nhân viên khác theo tên (Comment 9)
        if query_type == "employee_leave_balance":
            allowed_roles = ["hr_manager", "manager", "admin", "super_admin"]
            if role_lower not in allowed_roles:
                return "Xin lỗi, bạn không có quyền xem ngày phép của nhân viên khác. 🔒"
            employee_name = (filters or {}).get('employee_name', '')
            if not employee_name:
                return "Vui lòng cung cấp tên nhân viên cần xem ngày phép."
            employee = await self._resolve_employee_by_name(employee_name)
            if not employee:
                return f"Xin lỗi, tôi không tìm thấy nhân viên nào tên **{employee_name}** trong hệ thống."
            return await self._handle_self_leave_balance(str(employee['_id']), display_name=employee.get('name', employee_name))

        # 3) Truy vấn thông tin nhân viên theo tên (Comment 2: detail_by_name)
        if query_type == "detail_by_name":
            allowed_roles = ["hr_manager", "manager", "admin", "super_admin", "supervisor"]
            if role_lower not in allowed_roles:
                return "Xin lỗi, bạn không có quyền xem thông tin nhân viên khác. 🔒"
            employee_name = (filters or {}).get('employee_name', '')
            if not employee_name:
                return "Vui lòng cung cấp tên nhân viên cần xem thông tin."
            employee = await self._resolve_employee_by_name(employee_name)
            if not employee:
                return f"Xin lỗi, tôi không tìm thấy nhân viên nào tên **{employee_name}** trong hệ thống."
            return await self._format_employee_detail(employee)

        # 4) Nhân viên hỏi thông tin CÁ NHÂN (profile, vị trí, email...)
        self_info_types = ["self_info", "my_info", "my_profile"]
        if query_type in self_info_types or (role_lower == "employee" and query_type in ["detail", "info"]):
            if not user_id:
                return "Xin lỗi, tôi không xác định được tài khoản của bạn. Vui lòng đăng nhập lại và thử lại."
            return await self._handle_self_info(user_id)

        # 5) Các truy vấn nhân sự khác: chỉ HR/Manager/Admin/Supervisor được phép
        allowed_roles = ["hr_manager", "manager", "admin", "super_admin", "supervisor"]

        if role_lower not in allowed_roles:
            return (
                "Xin lỗi, bạn không có quyền truy cập thông tin chi tiết về nhân viên khác. 🔒\n\n"
                "💡 **Bạn có thể hỏi:**\n"
                "- \"Thông tin cá nhân của tôi\"\n"
                "- \"Tôi còn bao nhiêu ngày phép?\"\n"
                "- \"Hôm nay tôi đã chấm công chưa?\""
            )

        try:
            has_access, permission_filter = self.check_permission(role, department_id, user_id)
            if not has_access:
                return f"Xin lỗi, {self.error_message}"

            query = permission_filter.copy()
            if filters:
                query.update(filters)

            if query_type == 'count':
                return await self._handle_count(query)
            elif query_type == 'list':
                return await self._handle_list(query)
            elif query_type == 'recently_joined':
                return await self._handle_recently_joined(query)
            elif query_type == 'by_department':
                return await self._handle_by_department(query)
            elif query_type == 'by_role':
                role_filter = filters.get('role', 'employee') if filters else 'employee'
                return await self._handle_by_role(role_filter, query)
            else:
                return "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn về nhân viên."

        except Exception as e:
            logger.error(f"Error handling employee query: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: {str(e)}"

    async def _handle_self_info(self, user_id: str) -> str:
        """
        Trả lời câu hỏi về thông tin cá nhân của nhân viên hiện tại.
        """
        collection = await self._get_collection()
        if collection is None:
            return "Xin lỗi, tôi không truy cập được dữ liệu để xem thông tin của bạn."

        try:
            user = await collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            logger.error(f"Error fetching user for self_info: {str(e)}")
            return "Xin lỗi, tôi gặp lỗi khi lấy thông tin cá nhân của bạn."

        if not user:
            return "Xin lỗi, tôi không tìm thấy tài khoản của bạn trong hệ thống."

        name = user.get("name", "N/A")
        email = user.get("email", "N/A")
        position = user.get("position", "N/A")
        phone = user.get("phone", "N/A")
        role = user.get("role", "N/A")
        is_active = "Đang hoạt động ✅" if user.get("isActive", False) else "Không hoạt động ❌"

        role_names = {
            "EMPLOYEE": "Nhân viên",
            "SUPERVISOR": "Supervisor",
            "MANAGER": "Quản lý",
            "HR_MANAGER": "HR Manager",
            "ADMIN": "Admin",
            "SUPER_ADMIN": "Super Admin"
        }
        role_display = role_names.get(role, role)

        lines = [
            f"👤 **Thông tin cá nhân của bạn:**",
            "",
            f"- **Họ tên:** {name}",
            f"- **Email:** {email}",
            f"- **Số điện thoại:** {phone}",
            f"- **Vị trí:** {position}",
            f"- **Vai trò:** {role_display}",
            f"- **Trạng thái:** {is_active}",
        ]

        # Add department info if available
        dept = user.get("department")
        if dept and isinstance(dept, dict):
            lines.append(f"- **Phòng ban:** {dept.get('name', 'N/A')}")
        
        # Add branch info if available
        branch = user.get("branch")
        if branch and isinstance(branch, dict):
            lines.append(f"- **Chi nhánh:** {branch.get('name', 'N/A')}")

        return "\n".join(lines)

    async def _handle_self_leave_balance(self, user_id: str, display_name: str = None) -> str:
        """
        Trả lời câu hỏi: "Tôi còn bao nhiêu ngày phép?" cho nhân viên hiện tại,
        hoặc "Ngày phép của [tên]" cho HR/Admin/Manager.

        Quy tắc:
        - Đọc trực tiếp field leaveBalance trên collection users.
        - Không tự tính lại, giả định HR đã cập nhật đúng.
        
        Args:
            user_id: ID of the user to check
            display_name: Optional name to display (for viewing other employee's leave)
        """
        collection = await self._get_collection()
        if collection is None:
            return "Xin lỗi, tôi không truy cập được dữ liệu nhân viên để xem ngày phép."

        try:
            user = await collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            logger.error(f"Error fetching user for leave_balance: {str(e)}")
            return "Xin lỗi, tôi gặp lỗi khi lấy thông tin ngày phép."

        if not user:
            return "Xin lỗi, tôi không tìm thấy tài khoản trong hệ thống."

        lb = user.get("leaveBalance") or {}
        name = display_name or user.get("name", "bạn")
        is_self = display_name is None

        def _extract_type(data, key):
            """
            Helper: đọc cấu trúc leaveBalance cho từng loại.
            Trước đây frontend dùng 999/null cho một số loại để biểu thị "không giới hạn",
            nhưng hiện tại nghiệp vụ đã chuẩn hóa lại theo số ngày cụ thể (ví dụ nghỉ không lương 30 ngày/năm).
            Vì vậy ở chatbot sẽ hiển thị đúng theo total/remaining thực tế, KHÔNG coi 999 là vô hạn nữa.
            """
            t = data.get(key) or {}
            return {
                "total": t.get("total", 0),
                "used": t.get("used", 0),
                "remaining": t.get("remaining", 0),
                "pending": t.get("pending", 0),
            }

        annual = _extract_type(lb, "annual")
        sick = _extract_type(lb, "sick")
        unpaid = _extract_type(lb, "unpaid")
        compensatory = _extract_type(lb, "compensatory")
        maternity = _extract_type(lb, "maternity")

        # Dòng kết luận ngắn gọn theo style SYSTEM_PROMPT
        if is_self:
            summary = f"**✅ Bạn hiện còn {annual['remaining']} / {annual['total']} ngày phép năm.**"
        else:
            summary = f"**✅ {name} hiện còn {annual['remaining']} / {annual['total']} ngày phép năm.**"

        subject = "bạn" if is_self else name
        # Helper format cho từng loại
        def _format_leave_line(label: str, info: dict) -> str:
            return (
                f"- {label}: **còn {info['remaining']} / {info['total']} ngày**, "
                f"chờ duyệt: {info['pending']} ngày"
            )

        lines = [
            summary,
            "",
            f"📅 **Chi tiết số ngày phép của {subject}:**",
            _format_leave_line("Phép năm", annual),
            _format_leave_line("Nghỉ ốm", sick),
            _format_leave_line("Nghỉ không lương", unpaid),
            _format_leave_line("Nghỉ bù", compensatory),
            _format_leave_line("Nghỉ thai sản", maternity),
        ]

        return "\n".join(lines)
    
    async def _format_employee_detail(self, employee: Dict[str, Any]) -> str:
        """Format detailed employee information (Comment 2: detail_by_name)"""
        name = employee.get("name", "N/A")
        email = employee.get("email", "N/A")
        position = employee.get("position", "N/A")
        phone = employee.get("phone", "N/A")
        role = employee.get("role", "N/A")
        is_active = "Đang hoạt động ✅" if employee.get("isActive", False) else "Không hoạt động ❌"

        role_names = {
            "EMPLOYEE": "Nhân viên",
            "SUPERVISOR": "Supervisor",
            "MANAGER": "Quản lý",
            "HR_MANAGER": "HR Manager",
            "ADMIN": "Admin",
            "SUPER_ADMIN": "Super Admin"
        }
        role_display = role_names.get(role, role)

        lines = [
            f"👤 **Thông tin nhân viên: {name}**",
            "",
            f"- **Họ tên:** {name}",
            f"- **Email:** {email}",
            f"- **Số điện thoại:** {phone}",
            f"- **Vị trí:** {position}",
            f"- **Vai trò:** {role_display}",
            f"- **Trạng thái:** {is_active}",
        ]

        # Leave balance summary
        lb = employee.get("leaveBalance") or {}
        annual = lb.get("annual") or {}
        remaining = annual.get("remaining", 0)
        total = annual.get("total", 0)
        if total > 0:
            lines.append(f"- **Phép năm còn lại:** {remaining} / {total} ngày")

        return "\n".join(lines)
    
    async def _get_role_counts(self) -> list:
        """Get employee count by role"""
        collection = await self._get_collection()
        if collection is None:
            return []
        
        try:
            pipeline = [
                {"$match": {"isActive": True}},
                {"$group": {"_id": "$role", "count": {"$sum": 1}}}
            ]
            results = await self._aggregate(pipeline)
            
            role_names = {
                "EMPLOYEE": "Nhân viên",
                "SUPERVISOR": "Supervisor",
                "MANAGER": "Quản lý",
                "HR_MANAGER": "HR Manager",
                "ADMIN": "Admin",
                "SUPER_ADMIN": "Super Admin"
            }
            
            return [
                {"role_name": role_names.get(r["_id"], r["_id"]), "count": r["count"]}
                for r in results
            ]
        except Exception:
            return []
    
    async def _handle_recently_joined(self, query: Dict[str, Any]) -> str:
        """Handle recently joined employees query"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        if "isActive" not in query:
            query["isActive"] = True
        
        pipeline = [
            {"$match": query},
            {"$sort": {"createdAt": -1}},
            {"$limit": 10},
            {"$lookup": {
                "from": "departments",
                "localField": "department",
                "foreignField": "_id",
                "as": "dept_info"
            }},
            {"$unwind": {"path": "$dept_info", "preserveNullAndEmptyArrays": True}},
        ]
        
        employees = await collection.aggregate(pipeline).to_list(length=None)
        
        if not employees:
            return "Không tìm thấy nhân viên nào."
        
        response = "👥 **Nhân viên mới gia nhập gần đây:**\n\n"
        
        for i, emp in enumerate(employees, 1):
            name = emp.get("name", "N/A")
            position = emp.get("position", "N/A")
            dept_name = emp.get("dept_info", {}).get("name", "N/A") if emp.get("dept_info") else "N/A"
            created = emp.get("createdAt")
            if isinstance(created, datetime):
                created_str = created.strftime("%d/%m/%Y")
            else:
                created_str = str(created) if created else "N/A"
            
            response += f"- **{name}** | {position} | 🏢 {dept_name} | 📅 Ngày vào: {created_str}\n"
        
        return response
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format employee item"""
        name = item.get("name", "N/A")
        position = item.get("position", "N/A")
        role = item.get("role", "N/A")
        return f"**{index}.** {name} - {position} ({role})\n"

