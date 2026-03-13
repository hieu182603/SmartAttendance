"""Payroll query handler"""
import logging
import re
from datetime import datetime
from typing import Dict, Any, Tuple
from app.services.rag.query_handlers.base import BaseQueryHandler
from app.services.rag.permissions import PermissionChecker

logger = logging.getLogger(__name__)


class PayrollQueryHandler(BaseQueryHandler):
    """Handle payroll-related queries"""
    
    @property
    def collection_name(self) -> str:
        return "payroll"
    
    @property
    def error_message(self) -> str:
        return "bạn không có quyền truy cập thông tin lương"
    
    @staticmethod
    def _parse_month_year_from_message(message: str) -> Tuple[int, int, str]:
        """
        Parse month/year from Vietnamese message for personal salary queries.
        
        Hỗ trợ các mẫu đơn giản:
        - "tháng này"  -> tháng hiện tại
        - "tháng trước" / "tháng vừa rồi" -> tháng trước
        - "tháng 3" / "tháng 12" -> tháng cụ thể trong năm hiện tại
        """
        now = datetime.now()
        msg = message.lower()
        
        # Tháng này
        if "tháng này" in msg:
            return now.month, now.year, "tháng này"
        
        # Tháng trước
        if "tháng trước" in msg or "tháng vừa rồi" in msg:
            if now.month == 1:
                return 12, now.year - 1, "tháng trước"
            return now.month - 1, now.year, "tháng trước"
        
        # "tháng X"
        m = re.search(r"tháng\s+(\d{1,2})", msg)
        if m:
            month = int(m.group(1))
            if 1 <= month <= 12:
                return month, now.year, f"tháng {month:02d}/{now.year}"
        
        # Mặc định: tháng hiện tại
        return now.month, now.year, "tháng này"
    
    async def _handle_total(self, query: Dict[str, Any]) -> str:
        """Handle total payroll"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total_salary": {"$sum": "$netSalary"}, "count": {"$sum": 1}}}
        ]
        results = await self._aggregate(pipeline)
        
        if results:
            total_salary = results[0].get("total_salary", 0)
            employee_count = results[0].get("count", 0)
            
            response = f"💰 **Thống kê lương:**\n\n"
            response += f"💵 **Tổng quỹ lương:** {total_salary:,.0f} VNĐ\n"
            response += f"👥 **Số nhân viên:** {employee_count} người\n"
            
            if employee_count > 0:
                avg = total_salary / employee_count
                response += f"📈 **Lương trung bình:** {avg:,.0f} VNĐ/người"
            
            return response
        
        return "💰 **Thống kê lương:**\n\n❌ Không có dữ liệu lương."
    
    async def _handle_average(self, query: Dict[str, Any]) -> str:
        """Handle average payroll"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "avg_salary": {"$avg": "$netSalary"}, "count": {"$sum": 1}}}
        ]
        results = await self._aggregate(pipeline)
        
        if results:
            avg_salary = results[0].get("avg_salary", 0)
            employee_count = results[0].get("count", 0)
            
            response = f"📊 **Lương trung bình:**\n\n"
            response += f"💵 **Mức lương TB:** {avg_salary:,.0f} VNĐ\n"
            response += f"👥 **Số nhân viên:** {employee_count} người"
            
            return response
        
        return "📊 **Lương trung bình:**\n\n❌ Không có dữ liệu lương."
    
    async def _handle_count(self, query: Dict[str, Any]) -> str:
        """Handle payroll count"""
        collection = await self._get_collection()
        if collection is None:
            return f"Xin lỗi, {self.error_message}"
        
        count = await collection.count_documents(query)
        return f"💰 **Thống kê lương:**\n\n- **Số bản ghi:** {count}"
    
    async def handle(
        self, 
        query_type: str, 
        message: str, 
        role: str, 
        department_id: str = None,
        filters: Dict[str, Any] = None,
        user_id: str = None
    ) -> str:
        """Handle payroll query with permission check.
        
        - Các thống kê chung (total/average/count/list): chỉ HR/Admin xem được.
        - Truy vấn CÁ NHÂN về lương ("lương của tôi tháng ...") dùng query_type=self_salary,
          cho phép mọi role xem lương của CHÍNH MÌNH.
        """
        role_lower = role.lower() if role else ""
        
        # 1) Trường hợp: lương CÁ NHÂN của chính user (self_salary)
        if query_type == "self_salary":
            if not user_id:
                return "Xin lỗi, tôi không xác định được tài khoản của bạn để xem lương. Vui lòng đăng nhập lại và thử lại."
            
            collection = await self._get_collection()
            if collection is None:
                return "Xin lỗi, tôi không truy cập được dữ liệu lương để trả lời câu hỏi này."
            
            # Parse tháng/năm từ câu hỏi
            month, year, label = self._parse_month_year_from_message(message)
            
            user_oid = self._convert_user_id(user_id)
            query = {"userId": user_oid, "month": month, "year": year}
            
            try:
                doc = await collection.find_one(query)
            except Exception as e:
                logger.error(f"Error fetching self salary: {str(e)}")
                return "Xin lỗi, tôi gặp lỗi khi lấy thông tin lương của bạn."
            
            if not doc:
                return (
                    f"💰 Tôi không tìm thấy bảng lương của bạn cho **tháng {month:02d}/{year}**.\n"
                    "Nếu bạn nghĩ đây là nhầm lẫn, vui lòng liên hệ bộ phận nhân sự để kiểm tra lại."
                )
            
            net_salary = float(doc.get("netSalary", 0) or 0)
            base_salary = float(doc.get("baseSalary", 0) or 0)
            allowances = float(doc.get("allowances", 0) or 0)
            deductions = float(doc.get("deductions", 0) or 0)
            
            response_lines = [
                f"💰 **Lương thực nhận của bạn trong {label}:**",
                "",
                f"- **Lương thực nhận (net):** {net_salary:,.0f} VNĐ",
            ]
            
            # Thêm breakdown nếu có dữ liệu
            details = []
            if base_salary:
                details.append(f"lương cơ bản: {base_salary:,.0f} VNĐ")
            if allowances:
                details.append(f"phụ cấp: {allowances:,.0f} VNĐ")
            if deductions:
                details.append(f"khấu trừ: {deductions:,.0f} VNĐ")
            
            if details:
                response_lines.append(f"- **Chi tiết:** " + ", ".join(details))
            
            return "\n".join(response_lines)
        
        # 2) Các truy vấn lương khác: chỉ HR/Admin/Super Admin được phép
        has_access, _ = PermissionChecker.check(role, self.collection_name, department_id, user_id)
        if not has_access:
            return f"Xin lỗi, {self.error_message}. Thông tin lương chỉ dành cho quản lý cấp cao và bộ phận nhân sự."
        
        try:
            query = {}
            if filters:
                query.update(filters)
            
            if query_type == 'total':
                return await self._handle_total(query)
            elif query_type == 'average':
                return await self._handle_average(query)
            elif query_type == 'count':
                return await self._handle_count(query)
            elif query_type == 'list':
                return await self._handle_list(query)
            else:
                return "Xin lỗi, tôi chưa hiểu rõ câu hỏi về lương. Bạn có thể hỏi về tổng lương, lương trung bình, hoặc danh sách bảng lương."
        
        except Exception as e:
            logger.error(f"Error handling payroll query: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau."
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format payroll item"""
        user_id = item.get("userId", "N/A")
        month = item.get("month", "N/A")
        year = item.get("year", "N/A")
        net_salary = item.get("netSalary", 0)
        return f"**{index}.** NV: {user_id}, Tháng: {month}/{year}, Lương: {net_salary:,.0f} VNĐ\n"

