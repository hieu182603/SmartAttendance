"""Dynamic query generation using LLM for MongoDB queries"""

import json
import logging
from typing import Dict, Any, Optional, List
from bson import ObjectId
from bson.errors import InvalidId
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
  "collection": "tên collection chính",
  "filter": {{...}},
  "aggregation": "none" | "count" | "sum" | "average" | "group_by" | "pipeline",
  "aggregation_pipeline": [ ... ], // Chỉ dùng khi aggregation="pipeline" (ví dụ: query nhiều bảng bằng $lookup)
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
        "payroll": "payroll_collection",
        "employeeschedule": "employeeschedules_collection",
        "employeeschedules": "employeeschedules_collection",
        "employeeshiftassignment": "employeeshiftassignments_collection",
        "employeeshiftassignments": "employeeshiftassignments_collection"
    }
    
    @staticmethod
    def _to_object_id(val: Any) -> Any:
        """Helper to convert string to ObjectId if valid"""
        if isinstance(val, str) and len(val) == 24:
            try:
                return ObjectId(val)
            except InvalidId:
                return val
        return val
    
    def __init__(self, collections: Dict[str, Any]):
        """
        Initialize with MongoDB collections
        
        Args:
            collections: Dict with collection names as keys and Motor collection objects as values
        """
        self.collections = collections
    
    def _sanitize_filter(self, filter_query: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize MongoDB filter to prevent NoSQL injection (Comment 4)
        """
        if not filter_query or not isinstance(filter_query, dict):
            return {}
            
        sanitized = {}
        # List of allowed operators to prevent arbitrary execution
        allowed_operators = {
            '$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$ne', '$nin',
            '$and', '$or', '$not', '$nor', '$exists', '$type',
            '$regex', '$options', '$all', '$elemMatch', '$size'
        }
        
        # Disallowed operators (evaluation, execution, aggregation in find)
        disallowed_operators = {
            '$where', '$expr', '$jsonSchema', '$text', '$function',
            '$accumulator', '$map', '$reduce'
        }
        
        for key, value in filter_query.items():
            if key.startswith('$'):
                if key in disallowed_operators:
                    logger.warning(f"Blocked disallowed MongoDB operator: {key}")
                    continue  # Skip disallowed operators
                if key not in allowed_operators:
                    logger.warning(f"Operator {key} not in allowed list, but preserving.")
                    
            if isinstance(value, dict):
                sanitized_val = self._sanitize_filter(value)
                if sanitized_val or not value: # keep empty dict if it was empty, else if it has sanitized contents
                    sanitized[key] = sanitized_val
            elif isinstance(value, list) and key in ['$and', '$or', '$nor']:
                # For logical operators with list of conditions
                sanitized_list = []
                for item in value:
                    if isinstance(item, dict):
                        s_item = self._sanitize_filter(item)
                        if s_item:
                            sanitized_list.append(s_item)
                if sanitized_list:
                    sanitized[key] = sanitized_list
            else:
                # Convert common ID fields to ObjectId for MongoDB compatibility
                id_fields = ['_id', 'userId', 'user_id', 'department_id', 'branch_id', 'department', 'branch']
                if key in id_fields:
                    sanitized[key] = self._to_object_id(value)
                else:
                    sanitized[key] = value
                
        return sanitized
    
    async def _resolve_department_user_ids(self, department_id: str) -> List[ObjectId]:
        """Resolve department ID to list of user ObjectIds"""
        users_col = getattr(self.collections, 'users_collection', None)
        if users_col is None:
            return []
        
        try:
            dept_oid = self._to_object_id(department_id)
            # Match the actual DB schema: 'department' field
            cursor = users_col.find({"department": dept_oid, "isActive": True}, {"_id": 1})
            users = await cursor.to_list(length=None)
            return [u["_id"] for u in users]
        except Exception as e:
            logger.error(f"Error resolving department users: {str(e)}")
            return []

    async def _enforce_rbac(
        self,
        collection_name: str,
        filter_query: Dict[str, Any],
        role: str,
        user_id: str = None,
        department_id: str = None
    ) -> tuple:
        """
        Enforce RBAC by checking permissions and injecting required filters
        
        Returns:
            Tuple of (is_allowed, enforced_filter, error_message)
        """
        role_lower = role.lower() if role else ""
        collection_lower = collection_name.lower() if collection_name else ""
        
        # Check permissions and get base filter from PermissionChecker
        has_access, permission_filter = PermissionChecker.check(
            role_lower, collection_lower, department_id, user_id
        )
        
        if not has_access:
            return False, {}, f"Bạn không có quyền truy cập dữ liệu {collection_name}"
        
        # Merge LLM filter with RBAC filter
        enforced_filter = filter_query.copy() if filter_query else {}
        
        # Apply permission filter (intersecting with LLM filter)
        for key, value in permission_filter.items():
            if key == '__department_filter__':
                # Special handling for department-level access on user-based collections
                user_ids = await self._resolve_department_user_ids(value)
                enforced_filter['userId'] = {'$in': user_ids}
            else:
                # Direct field filter
                enforced_filter[key] = self._to_object_id(value)
        
        # Ensure common IDs in the final filter are ObjectIds
        id_fields = ['_id', 'userId', 'user_id', 'department_id', 'branch_id', 'department', 'branch']
        for key in list(enforced_filter.keys()):
            if key in id_fields and isinstance(enforced_filter[key], str):
                enforced_filter[key] = self._to_object_id(enforced_filter[key])
        
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
        """
        collection_name = query_data.get("collection")
        raw_filter = query_data.get("filter", {})
        aggregation = query_data.get("aggregation", "none")
        group_by = query_data.get("group_by_field")
        sort = query_data.get("sort", {"_id": -1})
        limit = min(query_data.get("limit", 10), 50)
        
        collection_name_lower = collection_name.lower() if collection_name else ""
        collection_attr = self.COLLECTION_MAP.get(collection_name_lower)
        
        if collection_attr is None:
            return {"error": f"Collection '{collection_name}' không tồn tại"}
        
        collection = getattr(self.collections, collection_attr, None)
        
        if collection is None:
            return {"error": f"Collection '{collection_name}' không khả dụng"}
            
        sanitized_filter = self._sanitize_filter(raw_filter)
        is_allowed, enforced_filter, error_msg = await self._enforce_rbac(
            collection_name, sanitized_filter, role, user_id, department_id
        )
        
        if not is_allowed:
            return {"error": error_msg}
        
        filter_query = enforced_filter
        
        try:
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
            elif aggregation == "pipeline":
                return await self._execute_pipeline(collection, filter_query, query_data, limit)
            else:
                return {"error": f"Aggregation type '{aggregation}' không được hỗ trợ"}
        except Exception as e:
            logger.error(f"Error executing dynamic query: {str(e)}")
            return {"error": f"Lỗi khi thực thi truy vấn: {str(e)}"}
    
    # Blocked pipeline stages that could cause security or performance issues (Comment 9)
    BLOCKED_PIPELINE_STAGES = {
        '$out',           # Writes to collection
        '$merge',         # Writes to collection
        '$unionWith',     # Could access unauthorized collections
        '$collStats',     # Database statistics
        '$indexStats',    # Index statistics
        '$planCacheStats',# Plan cache statistics
        '$currentOp',     # Current operations
        '$listSessions',  # Session listing
        '$listLocalSessions',  # Local sessions
    }
    
    def _validate_pipeline_stages(self, pipeline: List[Dict[str, Any]]) -> Optional[str]:
        """
        Validate pipeline stages against blocked list (Comment 9).
        
        Args:
            pipeline: Aggregation pipeline stages
            
        Returns:
            Error message if blocked stage found, None otherwise
        """
        for stage in pipeline:
            if isinstance(stage, dict):
                for key in stage:
                    if key in self.BLOCKED_PIPELINE_STAGES:
                        logger.warning(f"Blocked pipeline stage attempted: {key}")
                        return f"Pipeline stage '{key}' is not allowed for security reasons"
        return None
    
    async def _execute_pipeline(
        self,
        collection,
        filter_query: Dict[str, Any],
        query_data: Dict[str, Any],
        limit: int
    ) -> Dict[str, Any]:
        """Execute a raw aggregation pipeline with stage validation"""
        pipeline = query_data.get("aggregation_pipeline", [])
        
        if not isinstance(pipeline, list):
            return {"error": "aggregation_pipeline phải là một danh sách các stages"}
        
        # Validate pipeline stages against blocked list (Comment 9)
        validation_error = self._validate_pipeline_stages(pipeline)
        if validation_error:
            return {"error": validation_error}
            
        if filter_query:
            pipeline.insert(0, {"$match": filter_query})
            
        has_limit = any(stage.get("$limit") for stage in pipeline if isinstance(stage, dict))
        if not has_limit:
            pipeline.append({"$limit": limit})
        else:
            for stage in pipeline:
                if isinstance(stage, dict) and "$limit" in stage:
                    stage["$limit"] = min(stage["$limit"], 50)
                    
        try:
            results = await collection.aggregate(pipeline).to_list(length=None)
            
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
                            if 'name' in value:
                                formatted_doc[key] = value['name']
                            else:
                                continue
                        else:
                            formatted_doc[key] = value
                formatted_results.append(formatted_doc)
                
            return {
                "count": len(formatted_results),
                "results": formatted_results,
                "explanation": query_data.get("explanation", "Truy vấn nhiều bảng kết hợp")
            }
        except Exception as e:
            logger.error(f"Pipeline execution error: {str(e)}")
            return {"error": f"Lỗi thực thi pipeline: {str(e)}"}

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
                        continue
                    else:
                        formatted_doc[key] = value
            formatted_results.append(formatted_doc)
        
        return {
            "count": len(formatted_results),
            "results": formatted_results,
            "explanation": query_data.get("explanation", "")
        }
    
    async def _execute_count(self, collection, filter_query, query_data) -> Dict[str, Any]:
        count = await collection.count_documents(filter_query)
        return {"count": count, "explanation": query_data.get("explanation", "")}
    
    async def _execute_sum(self, collection, filter_query, group_by, query_data) -> Dict[str, Any]:
        field = group_by.replace("_sum", "") if group_by else "baseSalary"
        pipeline = [{"$match": filter_query}, {"$group": {"_id": None, "total": {"$sum": f"${field}"}}}]
        results = await collection.aggregate(pipeline).to_list(length=None)
        total = results[0]['total'] if results else 0
        return {"sum": total, "field": field, "explanation": query_data.get("explanation", "")}
    
    async def _execute_average(self, collection, filter_query, group_by, query_data) -> Dict[str, Any]:
        field = group_by.replace("_avg", "") if group_by else "baseSalary"
        pipeline = [{"$match": filter_query}, {"$group": {"_id": None, "avg": {"$avg": f"${field}"}}}]
        results = await collection.aggregate(pipeline).to_list(length=None)
        avg = results[0]['avg'] if results else 0
        return {"average": round(avg, 2), "field": field, "explanation": query_data.get("explanation", "")}
    
    async def _execute_group_by(self, collection, filter_query, group_by, query_data) -> Dict[str, Any]:
        field = group_by or "status"
        pipeline = [{"$match": filter_query}, {"$group": {"_id": f"${field}", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}, {"$limit": 20}]
        results = await collection.aggregate(pipeline).to_list(length=None)
        grouped = [{"value": r['_id'], "count": r['count']} for r in results]
        return {"grouped": grouped, "group_by": field, "explanation": query_data.get("explanation", "")}
    
    async def _execute_count_by_branch_city(self, filter_query, query_data) -> Dict[str, Any]:
        special_handling = query_data.get("special_handling", {})
        city = special_handling.get("city", "")
        if not city and "filter" in query_data:
            city_filter = query_data.get("filter", {})
            city = city_filter.get("city") or city_filter.get("branches.city", "")
        branches_collection = getattr(self.collections, "branches_collection", None)
        users_collection = getattr(self.collections, "users_collection", None)
        if city and branches_collection is not None and users_collection is not None:
            branches = await branches_collection.find({"city": {"$regex": city, "$options": "i"}, "status": "active"}).to_list(length=None)
            branch_ids = [b['_id'] for b in branches]
            if branch_ids:
                count = await users_collection.count_documents({"branch": {"$in": branch_ids}, "isActive": True})
                return {"count": count, "city": city, "branch_count": len(branches), "explanation": query_data.get("explanation", "")}
        return {"count": 0, "explanation": f"Không tìm thấy dữ liệu cho {city}"}


class DynamicQueryResultFormatter:
    """Format dynamic query results into natural language responses"""
    
    @staticmethod
    def format(result: Dict[str, Any], original_query: str) -> str:
        if "error" in result: return f"Xin lỗi, {result['error']}"
        if "count" in result and "results" not in result: return DynamicQueryResultFormatter._format_count(result)
        if "sum" in result: return DynamicQueryResultFormatter._format_sum(result)
        if "average" in result: return DynamicQueryResultFormatter._format_average(result)
        if "grouped" in result: return DynamicQueryResultFormatter._format_grouped(result)
        if "results" in result: return DynamicQueryResultFormatter._format_list(result)
        return "Không có kết quả phù hợp."
    
    @staticmethod
    def _format_count(result: Dict[str, Any]) -> str:
        count = result["count"]
        city = result.get("city", "")
        response = f"📊 **{result.get('explanation', 'Thống kê kết quả')}**\n\n"
        if city:
            response += f"📍 **Thành phố:** {city}\n"
            if result.get("branch_count"): response += f"🏢 **Số chi nhánh:** {result['branch_count']}\n"
        response += f"👥 **Tổng cộng:** {count}"
        return response
    
    @staticmethod
    def _format_sum(result: Dict[str, Any]) -> str:
        total = result["sum"]
        is_salary = result.get("field") in ["baseSalary", "salary", "netSalary", "grossSalary"]
        response = f"💰 **{result.get('explanation', 'Tổng cộng')}**\n\n"
        if is_salary: response += f"💵 **Tổng số:** {total:,.0f} VNĐ"
        else: response += f"📈 **Tổng số:** {total:,.2f}"
        return response
    
    @staticmethod
    def _format_average(result: Dict[str, Any]) -> str:
        avg = result["average"]
        is_salary = result.get("field") in ["baseSalary", "salary", "netSalary", "grossSalary"]
        response = f"📊 **{result.get('explanation', 'Kết quả trung bình')}**\n\n"
        if is_salary: response += f"💵 **Trung bình:** {avg:,.0f} VNĐ"
        else: response += f"📉 **Trung bình:** {avg:,.2f}"
        return response
    
    @staticmethod
    def _format_grouped(result: Dict[str, Any]) -> str:
        grouped = result["grouped"]
        response = f"📊 **{result.get('explanation', 'Thống kê chi tiết')}**\n\n"
        for item in grouped[:10]: response += f"🔹 **{item['value']}**: {item['count']}\n"
        return response
    
    @staticmethod
    def _format_list(result: Dict[str, Any]) -> str:
        results = result["results"]
        response = f"📋 **{result.get('explanation', 'Danh sách kết quả')}**\n\n"
        response += f"🔍 **Tìm thấy:** {len(results)} bản ghi phù hợp\n\n"
        if not results: return response + "❌ Không có dữ liệu phù hợp."
        label_map = {"name": "Họ tên", "email": "Email", "position": "Chức vụ", "role": "Vai trò", "department": "Phòng ban", "branch": "Chi nhánh", "status": "Trạng thái", "date": "Ngày", "checkInTime": "Giờ vào", "checkOutTime": "Giờ ra"}
        all_keys = []
        for doc in results[:20]:
            for k in doc.keys():
                if k not in all_keys and k != 'id' and not isinstance(doc[k], (dict, list)): all_keys.append(k)
        columns = [k for k in all_keys if k in label_map] + [k for k in all_keys if k not in label_map]
        columns = columns[:6]
        headers = [label_map.get(k, k.capitalize()) for k in columns]
        response += "| " + " | ".join(headers) + " |\n"
        response += "|" + "|".join(["---" for _ in columns]) + "|\n"
        for doc in results[:20]:
            row = []
            for k in columns:
                val = doc.get(k, "-")
                if isinstance(val, (int, float)) and ("Salary" in k or val > 1000): val = f"{val:,.0f}"
                row.append(str(val).replace("|", "\\|").replace("\n", " "))
            response += "| " + " | ".join(row) + " |\n"
        return response
