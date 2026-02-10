"""Dynamic query generation using LLM for MongoDB queries"""

import json
import logging
from typing import Dict, Any, Optional
from app.services.rag.models import COLLECTION_SCHEMAS
from app.services.rag.permissions import PermissionChecker

logger = logging.getLogger(__name__)


class DynamicQueryGenerator:
    """Generate MongoDB queries from natural language using LLM"""
    
    @staticmethod
    def get_schema_description() -> str:
        """Build schema description for LLM prompt"""
        schema_desc = "## Database Schema:\n\n"
        for collection, info in COLLECTION_SCHEMAS.items():
            schema_desc += f"### {collection.upper()} ({info['description']}):\n"
            for field, desc in info['fields'].items():
                schema_desc += f"  - {field}: {desc}\n"
            schema_desc += "\n"
        return schema_desc
    
    @staticmethod
    def get_role_permissions(role: str, user_id: str, department_id: str = None) -> Dict[str, str]:
        """Get permission rules for LLM prompt"""
        role_lower = role.lower() if role else ""
        
        permissions = {
            "super_admin": "Có quyền truy cập TẤT CẢ dữ liệu",
            "admin": "Có quyền truy cập TẤT CẢ dữ liệu",
            "hr_manager": "Có quyền truy cập TẤT CẢ dữ liệu",
            "manager": f"Có quyền truy cập dữ liệu phòng ban của mình (department: {department_id})",
            "supervisor": f"Có quyền truy cập dữ liệu phòng ban của mình (department: {department_id})",
            "employee": f"Chỉ có quyền truy cập dữ liệu CÁ NHÂN của chính mình (userId: {user_id})"
        }
        
        return {
            "role": role,
            "permission": permissions.get(role_lower, "Không có quyền truy cập"),
            "user_id": user_id,
            "department_id": department_id or 'Chưa có'
        }
    
    @staticmethod
    def build_prompt(
        message: str, 
        role: str, 
        user_id: str, 
        department_id: str = None
    ) -> str:
        """Build the LLM prompt for query generation"""
        
        schema_desc = DynamicQueryGenerator.get_schema_description()
        permissions = DynamicQueryGenerator.get_role_permissions(role, user_id, department_id)
        
        prompt = f"""Bạn là một chuyên gia MongoDB. Hãy phân tích câu hỏi và tạo query MongoDB phù hợp.

## Câu hỏi của người dùng:
{message}

## Thông tin người dùng:
- Role: {permissions['role']}
- User ID: {permissions['user_id']}
- Department ID: {permissions['department_id']}
- Quyền: {permissions['permission']}

{schema_desc}

## Yêu cầu:
1. Xác định collection phù hợp nhất
2. Tạo MongoDB query filter dựa trên câu hỏi
3. Áp dụng QUYỀN TRUY CẬP vào query
4. Xác định aggregation nếu cần (count, group by, sum, etc.)
5. Giới hạn kết quả (thường là 10-20 bản ghi)

## Ví dụ:
- "Nhân viên tên Nguyễn" → collection: users, filter: {{"name": {{"$regex": "Nguyễn", "$options": "i"}}}}
- "Đơn nghỉ phép đang chờ" → collection: requests, filter: {{"status": "pending"}}
- "Tổng số người đi làm hôm nay" → collection: attendance, filter: {{"date": <hôm nay>}}, aggregation: count
- "Lương tháng này của tôi" → collection: payroll, filter: {{"userId": "{user_id}", "month": <tháng hiện tại>, "year": <năm hiện tại>}}
- "Chi nhánh ở TP.HCM có bao nhiêu nhân viên?" → 
  - Bước 1: Tìm branches có city="TP.HCM" để lấy _id
  - Bước 2: Đếm users có branch trong danh sách đó
  - aggregation: count, special_handling: "count_by_branch_city"
- "Ai đi muộn tuần này?" → collection: attendance, filter: {{"status": "late", "date": {{"$gte": <7 ngày trước>, "$lte": <hôm nay>}}}}, aggregation: group_by, group_by_field: "userId"
- "Tổng lương phòng IT" → collection: payroll, filter: {{"departmentId": <ID của phòng IT>}}, aggregation: sum, group_by_field: "netSalary"

## XỬ LÝ NGÀY THÁNG:
- Hôm nay: new Date()
- Tuần này: 7 ngày gần nhất
- Tháng này: tháng và năm hiện tại
- Năm nay: năm hiện tại

## QUAN TRỌNG - QUYỀN TRUY CẬP:
- Nếu role là employee → BẮT BUỘC phải thêm filter: {{"userId": "{user_id}"}}
- Nếu role là manager/supervisor → Thêm filter theo department_id
- Nếu role là admin/hr/super_admin → Không cần thêm filter đặc biệt

## Output Format (JSON):
```json
{{
  "collection": "tên collection",
  "filter": {{...}},
  "aggregation": "none" | "count" | "sum" | "average" | "group_by",
  "group_by_field": "field để group" | null,
  "sort": {{"field": -1 hoặc 1}},
  "limit": 10,
  "explanation": "Giải thích query này để người dùng hiểu"
}}
```

Nếu câu hỏi không rõ ràng hoặc không thể trả lời từ database, trả về:
```json
{{
  "collection": null,
  "error": "Lý do không thể trả lời"
}}
```

Hãy chỉ trả về JSON, không có giải thích thêm:"""
        
        return prompt
    
    @staticmethod
    def parse_response(response_text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response"""
        try:
            # Find JSON in response (in case LLM adds extra text)
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            json_str = response_text[start_idx:end_idx]
            
            query_data = json.loads(json_str)
            
            if query_data.get("collection") is None:
                return {"error": query_data.get("error", "Không thể hiểu câu hỏi")}
            
            return query_data
        
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON from LLM response: {str(e)}")
            return {"error": f"Lỗi phân tích JSON: {str(e)}"}
        except Exception as e:
            logger.error(f"Error parsing dynamic query response: {str(e)}")
            return {"error": f"Lỗi khi phân tích câu hỏi: {str(e)}"}


class DynamicQueryExecutor:
    """Execute dynamic MongoDB queries safely with RBAC enforcement"""
    
    # Collection mapping for case-insensitive lookup
    COLLECTION_MAP = {
        "users": "users_collection",
        "departments": "departments_collection",
        "branches": "branches_collection",
        "attendance": "attendance_collection",
        "requests": "requests_collection",
        "shifts": "shifts_collection",
        "payroll": "payroll_collection"
    }
    
    def __init__(self, collections: Dict[str, Any]):
        """
        Initialize with MongoDB collections
        
        Args:
            collections: Dict with collection names as keys and Motor collection objects as values
        """
        self.collections = collections
    
    def _enforce_rbac(
        self,
        collection_name: str,
        filter_query: Dict[str, Any],
        role: str,
        user_id: str = None,
        department_id: str = None
    ) -> tuple:
        """
        Enforce RBAC by checking permissions and injecting required filters
        
        Args:
            collection_name: Target collection name
            filter_query: LLM-generated filter query
            role: User role
            user_id: Current user ID
            department_id: User's department ID
            
        Returns:
            Tuple of (is_allowed, enforced_filter, error_message)
        """
        role_lower = role.lower() if role else ""
        collection_lower = collection_name.lower() if collection_name else ""
        
        # Check if role is allowed to access this collection
        has_access, permission_filter = PermissionChecker.check(
            role_lower, collection_lower, department_id
        )
        
        if not has_access:
            # Special handling for employees - they can access their own data
            if role_lower == "employee" and user_id:
                # Allow employees to access only their own data
                pass
            else:
                return False, {}, f"Bạn không có quyền truy cập dữ liệu {collection_name}"
        
        # Create enforced filter by intersecting LLM filter with RBAC rules
        enforced_filter = filter_query.copy() if filter_query else {}
        
        # RBAC enforcement based on role
        if role_lower == "employee" and user_id:
            # Employees can ONLY see their own data
            if collection_lower in ["attendance", "requests", "payroll"]:
                enforced_filter["userId"] = user_id
            elif collection_lower == "users":
                # Employees can only see their own user record
                enforced_filter["_id"] = user_id
            # departments, branches, shifts - employees can read these (read-only info)
        
        elif role_lower in ["manager", "supervisor"] and department_id:
            # Manager/supervisor can see data from their department
            if collection_lower in ["attendance", "requests"]:
                enforced_filter["department_id"] = department_id
            elif collection_lower == "users":
                enforced_filter["department"] = department_id
            elif collection_lower == "payroll":
                # Only HR/admin can access payroll
                return False, {}, "Bạn không có quyền truy cập dữ liệu lương"
        
        elif role_lower not in PermissionChecker.HIGH_ROLES:
            # Unknown role - deny access to sensitive collections
            if collection_lower in ["payroll", "users"]:
                return False, {}, f"Bạn không có quyền truy cập dữ liệu {collection_name}"
        
        return True, enforced_filter, None
    
    async def execute(
        self,
        query_data: Dict[str, Any],
        role: str,
        user_id: str = None,
        department_id: str = None
    ) -> Dict[str, Any]:
        """
        Execute the generated MongoDB query safely with RBAC enforcement
        
        Args:
            query_data: Query data from DynamicQueryGenerator
            role: User role for permission checks
            user_id: Current user ID for RBAC enforcement
            department_id: User's department ID for RBAC enforcement
            
        Returns:
            Dict with query results
        """
        collection_name = query_data.get("collection")
        filter_query = query_data.get("filter", {})
        aggregation = query_data.get("aggregation", "none")
        group_by = query_data.get("group_by_field")
        sort = query_data.get("sort", {"_id": -1})
        limit = query_data.get("limit", 10)
        
        # Get collection
        collection_name_lower = collection_name.lower() if collection_name else ""
        collection_attr = self.COLLECTION_MAP.get(collection_name_lower)
        
        if collection_attr is None:
            return {"error": f"Collection '{collection_name}' không tồn tại"}
        
        collection = getattr(self.collections, collection_attr, None)
        
        if collection is None:
            return {"error": f"Collection '{collection_name}' không khả dụng"}
        
        # Enforce RBAC - check permissions and inject required filters
        is_allowed, enforced_filter, error_msg = self._enforce_rbac(
            collection_name, filter_query, role, user_id, department_id
        )
        
        if not is_allowed:
            return {"error": error_msg}
        
        # Use the enforced filter instead of the LLM-generated one
        filter_query = enforced_filter
        
        try:
            # Execute query based on aggregation type
            if aggregation == "none":
                return await self._execute_find(collection, filter_query, sort, limit, query_data)
            
            elif aggregation == "count":
                return await self._execute_count(collection, filter_query, query_data)
            
            elif aggregation == "sum":
                return await self._execute_sum(collection, filter_query, group_by, query_data)
            
            elif aggregation == "average":
                return await self._execute_average(collection, filter_query, group_by, query_data)
            
            elif aggregation == "group_by":
                return await self._execute_group_by(collection, filter_query, group_by, query_data)
            
            elif aggregation == "count_by_branch_city":
                return await self._execute_count_by_branch_city(filter_query, query_data)
            
            else:
                return {"error": f"Aggregation type '{aggregation}' không được hỗ trợ"}
        
        except Exception as e:
            logger.error(f"Error executing dynamic query: {str(e)}")
            return {"error": f"Lỗi khi thực thi truy vấn: {str(e)}"}
    
    async def _execute_find(
        self, 
        collection, 
        filter_query: Dict[str, Any], 
        sort: Dict[str, int],
        limit: int,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute simple find query"""
        cursor = collection.find(filter_query).sort(sort).limit(limit)
        results = await cursor.to_list(length=None)
        
        # Format results
        formatted_results = []
        for doc in results:
            formatted_doc = {}
            for key, value in doc.items():
                if key not in ['_id', '__v'] and not key.startswith('createdAt') or key == '_id':
                    if key == '_id':
                        formatted_doc['id'] = str(value)
                    elif hasattr(value, 'isoformat'):
                        formatted_doc[key] = value.strftime('%Y-%m-%d')
                    elif isinstance(value, dict):
                        continue  # Skip complex nested objects
                    else:
                        formatted_doc[key] = value
            formatted_results.append(formatted_doc)
        
        return {
            "count": len(formatted_results),
            "results": formatted_results,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_count(
        self, 
        collection, 
        filter_query: Dict[str, Any],
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute count query"""
        count = await collection.count_documents(filter_query)
        return {
            "count": count,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_sum(
        self, 
        collection, 
        filter_query: Dict[str, Any],
        group_by: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute sum aggregation"""
        field = group_by.replace("_sum", "") if group_by else "baseSalary"
        pipeline = [
            {"$match": filter_query},
            {"$group": {"_id": None, "total": {"$sum": f"${field}"}}}
        ]
        results = await collection.aggregate(pipeline).to_list(length=None)
        total = results[0]['total'] if results else 0
        
        return {
            "sum": total,
            "field": field,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_average(
        self, 
        collection, 
        filter_query: Dict[str, Any],
        group_by: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute average aggregation"""
        field = group_by.replace("_avg", "") if group_by else "baseSalary"
        pipeline = [
            {"$match": filter_query},
            {"$group": {"_id": None, "avg": {"$avg": f"${field}"}}}
        ]
        results = await collection.aggregate(pipeline).to_list(length=None)
        avg = results[0]['avg'] if results else 0
        
        return {
            "average": round(avg, 2),
            "field": field,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_group_by(
        self, 
        collection, 
        filter_query: Dict[str, Any],
        group_by: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute group by aggregation"""
        field = group_by or "status"
        pipeline = [
            {"$match": filter_query},
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        results = await collection.aggregate(pipeline).to_list(length=None)
        grouped = [{"value": r['_id'], "count": r['count']} for r in results]
        
        return {
            "grouped": grouped,
            "group_by": field,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_count_by_branch_city(
        self, 
        filter_query: Dict[str, Any],
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute count employees by branch city"""
        # This requires special handling with branches and users collections
        special_handling = query_data.get("special_handling", {})
        city = special_handling.get("city", "")
        
        # Try to get city from filter
        if not city and "filter" in query_data:
            city_filter = query_data.get("filter", {})
            city = city_filter.get("city") or city_filter.get("branches.city", "")
        
        branches_collection = getattr(self.collections, "branches_collection", None)
        users_collection = getattr(self.collections, "users_collection", None)
        
        if city and branches_collection and users_collection:
            # Find branch IDs with matching city
            branches = await branches_collection.find(
                {"city": {"$regex": city, "$options": "i"}, "status": "active"}
            ).to_list(length=None)
            
            branch_ids = [b['_id'] for b in branches]
            
            if branch_ids:
                count = await users_collection.count_documents({
                    "branch": {"$in": branch_ids},
                    "isActive": True
                })
                return {
                    "count": count,
                    "city": city,
                    "branch_count": len(branches),
                    "explanation": query_data.get("explanation", "")
                }
            else:
                return {
                    "count": 0,
                    "city": city,
                    "explanation": f"Không tìm thấy chi nhánh nào ở {city}"
                }
        else:
            return {
                "count": 0,
                "explanation": "Không thể xác định thành phố hoặc collection không khả dụng"
            }


class DynamicQueryResultFormatter:
    """Format dynamic query results into natural language responses"""
    
    @staticmethod
    def format(result: Dict[str, Any], original_query: str) -> str:
        """
        Format the query result into a natural language response
        """
        if "error" in result:
            return f"Xin lỗi, {result['error']}"
        
        explanation = result.get("explanation", "")
        
        # Handle count results
        if "count" in result and "results" not in result:
            return DynamicQueryResultFormatter._format_count(result)
        
        # Handle sum results
        if "sum" in result:
            return DynamicQueryResultFormatter._format_sum(result)
        
        # Handle average results
        if "average" in result:
            return DynamicQueryResultFormatter._format_average(result)
        
        # Handle grouped results
        if "grouped" in result:
            return DynamicQueryResultFormatter._format_grouped(result)
        
        # Handle list results
        if "results" in result:
            return DynamicQueryResultFormatter._format_list(result)
        
        return "Không có kết quả phù hợp."
    
    @staticmethod
    def _format_count(result: Dict[str, Any]) -> str:
        """Format count result"""
        count = result["count"]
        city = result.get("city", "")
        
        response = f"📊 **{result.get('explanation', 'Thống kê kết quả')}**\n\n"
        
        if city:
            response += f"📍 **Thành phố:** {city}\n"
            if result.get("branch_count"):
                response += f"🏢 **Số chi nhánh:** {result['branch_count']}\n"
        
        response += f"👥 **Tổng cộng:** {count} nhân viên" if count == 1 else f"👥 **Tổng cộng:** {count}"
        
        return response
    
    @staticmethod
    def _format_sum(result: Dict[str, Any]) -> str:
        """Format sum result"""
        total = result["sum"]
        is_salary = result.get("field") in ["baseSalary", "salary", "netSalary", "grossSalary"]
        
        response = f"💰 **{result.get('explanation', 'Tổng cộng')}**\n\n"
        
        if is_salary:
            response += f"💵 **Tổng số:** {total:,.0f} VNĐ"
        else:
            response += f"📈 **Tổng số:** {total:,.2f}"
        
        return response
    
    @staticmethod
    def _format_average(result: Dict[str, Any]) -> str:
        """Format average result"""
        avg = result["average"]
        is_salary = result.get("field") in ["baseSalary", "salary", "netSalary", "grossSalary"]
        
        response = f"📊 **{result.get('explanation', 'Kết quả trung bình')}**\n\n"
        
        if is_salary:
            response += f"💵 **Trung bình:** {avg:,.0f} VNĐ"
        else:
            response += f"📉 **Trung bình:** {avg:,.2f}"
        
        return response
    
    @staticmethod
    def _format_grouped(result: Dict[str, Any]) -> str:
        """Format grouped result"""
        grouped = result["grouped"]
        response = f"📊 **{result.get('explanation', 'Thống kê chi tiết')}**\n\n"
        
        for item in grouped[:10]:
            response += f"🔹 **{item['value']}**: {item['count']}\n"
        
        return response
    
    @staticmethod
    def _format_list(result: Dict[str, Any]) -> str:
        """Format list result"""
        results = result["results"]
        response = f"📋 **{result.get('explanation', 'Danh sách kết quả')}**\n\n"
        response += f"🔍 **Tìm thấy:** {len(results)} bản ghi phù hợp\n\n"
        
        if len(results) == 0:
            response += "❌ Không có dữ liệu phù hợp."
        else:
            for i, doc in enumerate(results[:10], 1):
                response += f"**{i}.** "
                important_fields = []
                
                # Priority mapping for field names to Vietnamese labels
                label_map = {
                    "name": "Họ tên",
                    "email": "Email",
                    "position": "Chức vụ",
                    "role": "Vai trò",
                    "status": "Trạng thái",
                    "type": "Loại",
                    "city": "Thành phố",
                    "code": "Mã"
                }
                
                for field, label in label_map.items():
                    if field in doc:
                        val = doc[field]
                        if isinstance(val, bool):
                            if field == "isActive":
                                val = "✅ Hoạt động" if val else "❌ Không hoạt động"
                            else:
                                val = "Có" if val else "Không"
                        important_fields.append(f"{label}: *{val}*")
                
                if important_fields:
                    response += " | ".join(important_fields)
                else:
                    keys = [k for k in doc.keys() if k != 'id'][:3]
                    vals = [str(doc[k]) for k in keys]
                    response += " | ".join(vals)
                response += "\n"
            
            if len(results) > 10:
                response += f"\n*... và {len(results) - 10} kết quả khác*"
        
        return response

