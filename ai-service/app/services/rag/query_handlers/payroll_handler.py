"""Payroll query handler"""
import logging
from typing import Dict, Any
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
        filters: Dict[str, Any] = None
    ) -> str:
        """Handle payroll query with permission check"""
        
        # Check permission first
        has_access, _ = PermissionChecker.check(role, self.collection_name, department_id)
        if not has_access:
            return f"Xin lỗi, {self.error_message}"
        
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
            else:
                return "Xin lỗi, tôi chưa hiểu rõ câu hỏi về lương."
        
        except Exception as e:
            logger.error(f"Error handling payroll query: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu: {str(e)}"
    
    async def _format_item(self, item: Dict[str, Any], index: int) -> str:
        """Format payroll item"""
        user_id = item.get("userId", "N/A")
        month = item.get("month", "N/A")
        year = item.get("year", "N/A")
        net_salary = item.get("netSalary", 0)
        return f"**{index}.** NV: {user_id}, Tháng: {month}/{year}, Lương: {net_salary:,.0f} VNĐ\n"

