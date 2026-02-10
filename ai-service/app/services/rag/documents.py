"""Document ingestion and search for RAG service"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.schema import Document
from app.utils.config import CHATBOT_MAX_CONVERSATIONS, CHATBOT_MAX_MESSAGES

logger = logging.getLogger(__name__)


class DocumentManager:
    """Manage document ingestion and vector search"""
    
    def __init__(
        self,
        vector_store,
        collection_name: str = "documents",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """
        Initialize document manager
        
        Args:
            vector_store: MongoDB Atlas Vector Search store
            collection_name: Name of the document collection
            chunk_size: Size of document chunks
            chunk_overlap: Overlap between chunks
        """
        self.vector_store = vector_store
        self.collection_name = collection_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    async def ingest(
        self,
        documents: List[Dict[str, Any]],
        collection_name: str = None,
        chunk_size: int = None,
        chunk_overlap: int = None
    ) -> Dict[str, Any]:
        """
        Ingest documents into vector database
        
        Args:
            documents: List of documents with 'content' and 'metadata'
            collection_name: Target collection name (optional override)
            chunk_size: Size of document chunks (optional override)
            chunk_overlap: Overlap between chunks (optional override)
            
        Returns:
            Dict with ingestion results
        """
        try:
            if not documents:
                return {"total_documents": 0, "total_chunks": 0, "message": "No documents to ingest"}
            
            # Use provided values or fall back to instance defaults
            target_collection = collection_name or self.collection_name
            target_chunk_size = chunk_size or self.chunk_size
            target_chunk_overlap = chunk_overlap or self.chunk_overlap
            
            # Create text splitter with the specified parameters
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=target_chunk_size,
                chunk_overlap=target_chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            # Process documents
            langchain_docs = []
            total_chunks = 0
            
            for doc_data in documents:
                content = doc_data.get("content", "")
                metadata = doc_data.get("metadata", {})
                
                # Add processing metadata
                metadata.update({
                    "ingested_at": datetime.now(timezone.utc),
                    "source": doc_data.get("source", "unknown"),
                    "doc_type": doc_data.get("doc_type", "text"),
                    "collection_name": target_collection
                })
                
                # Split text into chunks
                chunks = text_splitter.split_text(content)
                
                for i, chunk in enumerate(chunks):
                    chunk_metadata = metadata.copy()
                    chunk_metadata["chunk_index"] = i
                    chunk_metadata["total_chunks"] = len(chunks)
                    
                    langchain_docs.append(Document(
                        page_content=chunk,
                        metadata=chunk_metadata
                    ))
                
                total_chunks += len(chunks)
            
            # Add to vector store
            if langchain_docs:
                await self.vector_store.aadd_documents(langchain_docs)
                logger.info(f"Successfully ingested {len(langchain_docs)} chunks from {len(documents)} documents")
            
            return {
                "total_documents": len(documents),
                "total_chunks": total_chunks,
                "collection_name": target_collection,
                "chunk_size": target_chunk_size,
                "chunk_overlap": target_chunk_overlap,
                "message": f"Successfully ingested {total_chunks} chunks from {len(documents)} documents"
            }
        
        except Exception as e:
            logger.error(f"Error ingesting documents: {str(e)}")
            raise
    
    async def search(
        self,
        query: str,
        collection_name: str = None,
        limit: int = 5,
        user_role: str = "employee",
        department_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search documents using vector similarity with access controls
        
        Args:
            query: Search query
            collection_name: Target collection name for filtering
            limit: Maximum number of results
            user_role: User role for access control
            department_id: User's department ID
            
        Returns:
            List of search results
        """
        try:
            # Use provided collection name or fall back to instance default
            target_collection = collection_name or self.collection_name
            
            # Apply access controls based on user role
            filter_criteria = self._get_access_filter(user_role, department_id)
            
            # Perform similarity search
            docs = await self.vector_store.asimilarity_search_with_score(
                query=query,
                k=limit * 2  # Get more results for filtering
            )
            
            # Apply post-filtering (including collection name filter)
            filtered_results = []
            for doc, score in docs:
                # Filter by collection_name if specified
                doc_collection = doc.metadata.get("collection_name", self.collection_name)
                if target_collection and doc_collection != target_collection:
                    continue
                    
                if self._check_document_access(doc.metadata, user_role, department_id):
                    # Enhanced metadata for better source citation
                    enhanced_metadata = doc.metadata.copy()
                    # Try to get document ID from metadata or document object
                    if "_id" not in enhanced_metadata:
                        # Check if document has _id attribute (MongoDB document)
                        if hasattr(doc, '_id') and doc._id is not None:
                            enhanced_metadata["_id"] = str(doc._id)
                        # Check if it's in the underlying document (for LangChain Document wrapper)
                        elif hasattr(doc, 'lc_kwargs') and '_id' in doc.lc_kwargs.get('metadata', {}):
                            enhanced_metadata["_id"] = str(doc.lc_kwargs['metadata']['_id'])
                    
                    filtered_results.append({
                        "content": doc.page_content,
                        "metadata": enhanced_metadata,
                        "score": float(score) if score is not None else 0.0
                    })
                    
                    if len(filtered_results) >= limit:
                        break
            
            return filtered_results
        
        except Exception as e:
            logger.error(f"Error searching documents: {str(e)}")
            raise
    
    def _get_access_filter(
        self,
        user_role: str,
        department_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        Get access filter based on user role
        
        Args:
            user_role: User role
            department_id: User's department ID
            
        Returns:
            Filter criteria dict
        """
        filter_criteria = {}
        
        # Admin can see all documents
        if user_role == "admin":
            return {}
        
        # HR managers and managers can see department and public documents
        if user_role in ["hr_manager", "manager"]:
            if department_id:
                filter_criteria = {
                    "$or": [
                        {"department_id": department_id},
                        {"department_id": {"$exists": False}},
                        {"access_level": "public"}
                    ]
                }
            else:
                filter_criteria = {
                    "$or": [
                        {"department_id": {"$exists": False}},
                        {"access_level": "public"}
                    ]
                }
        
        # Others can only see public documents
        else:
            filter_criteria = {
                "$or": [
                    {"department_id": {"$exists": False}},
                    {"access_level": "public"}
                ]
            }
        
        return filter_criteria
    
    def _check_document_access(
        self,
        metadata: Dict[str, Any],
        user_role: str,
        department_id: Optional[str]
    ) -> bool:
        """
        Check if user can access a document
        
        Args:
            metadata: Document metadata
            user_role: User role
            department_id: User's department ID
            
        Returns:
            True if accessible
        """
        # Admin can see all
        if user_role == "admin":
            return True
        
        # Check public documents
        if metadata.get("access_level") == "public":
            return True
        
        # Check department-specific documents
        doc_dept_id = metadata.get("department_id")
        
        if not doc_dept_id:
            return True  # General documents
        
        if department_id and doc_dept_id == department_id:
            if user_role in ["hr_manager", "manager"]:
                return True
        
        return False
    
    async def delete_documents(
        self,
        filter_query: Dict[str, Any]
    ) -> int:
        """
        Delete documents from vector store
        
        Args:
            filter_query: Filter to match documents
            
        Returns:
            Number of deleted documents
        """
        try:
            # This requires direct MongoDB access
            collection = self.vector_store.collection
            result = await collection.delete_many(filter_query)
            return result.deleted_count
        
        except Exception as e:
            logger.error(f"Error deleting documents: {str(e)}")
            return 0
    
    async def get_document_count(self, filter_query: Dict[str, Any] = None) -> int:
        """
        Get count of documents
        
        Args:
            filter_query: Optional filter
            
        Returns:
            Document count
        """
        try:
            collection = self.vector_store.collection
            if filter_query:
                return await collection.count_documents(filter_query)
            return await collection.count_documents({})
        
        except Exception as e:
            logger.error(f"Error counting documents: {str(e)}")
            return 0
    
    async def ingest_from_collection(
        self,
        collection,
        collection_name: str,
        limit: int = None,
        filter_query: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Ingest structured data from MongoDB collection into vector store
        
        Args:
            collection: Motor collection object
            collection_name: Name of the source collection
            limit: Maximum number of records to ingest (None for all)
            filter_query: Optional filter query
            
        Returns:
            Dict with ingestion results
        """
        try:
            if collection is None:
                return {
                    "success": False,
                    "error": f"Collection '{collection_name}' not available",
                    "total_documents": 0,
                    "total_chunks": 0
                }
            
            # Build query
            query = filter_query or {}
            
            # Fetch records
            cursor = collection.find(query)
            if limit:
                cursor = cursor.limit(limit)
            
            records = await cursor.to_list(length=None)
            
            if not records:
                return {
                    "success": True,
                    "message": f"No records found in collection '{collection_name}'",
                    "total_documents": 0,
                    "total_chunks": 0,
                    "collection_name": collection_name
                }
            
            # Convert records to documents
            documents = []
            for record in records:
                # Convert record to text document
                doc_content = self._format_record_as_text(record, collection_name)
                doc_metadata = {
                    "source": "database",
                    "doc_type": f"{collection_name}_record",
                    "collection_name": collection_name,
                    "record_id": str(record.get("_id", "")),
                    "ingested_at": datetime.now(timezone.utc),
                    "access_level": "public"
                }
                
                # Add collection-specific metadata
                if collection_name == "users":
                    doc_metadata.update({
                        "title": f"Nhân viên: {record.get('name', 'N/A')}",
                        "user_id": str(record.get("_id", "")),
                        "department": record.get("department", ""),
                        "role": record.get("role", "")
                    })
                elif collection_name == "departments":
                    doc_metadata.update({
                        "title": f"Phòng ban: {record.get('name', 'N/A')}",
                        "department_id": str(record.get("_id", ""))
                    })
                elif collection_name == "branches":
                    doc_metadata.update({
                        "title": f"Chi nhánh: {record.get('name', 'N/A')}",
                        "city": record.get("city", "")
                    })
                
                documents.append({
                    "content": doc_content,
                    "metadata": doc_metadata
                })
            
            # Ingest documents
            result = await self.ingest(documents, collection_name=collection_name)
            result["collection_name"] = collection_name
            result["source_collection"] = collection_name
            
            logger.info(f"Successfully ingested {result['total_documents']} documents from collection '{collection_name}'")
            
            return result
        
        except Exception as e:
            logger.error(f"Error ingesting from collection '{collection_name}': {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "collection_name": collection_name,
                "total_documents": 0,
                "total_chunks": 0
            }
    
    def _format_record_as_text(
        self,
        record: Dict[str, Any],
        collection_name: str
    ) -> str:
        """
        Format a MongoDB record as text document
        
        Args:
            record: MongoDB record
            collection_name: Name of the collection
            
        Returns:
            Formatted text string
        """
        # Remove MongoDB internal fields
        record_clean = {k: v for k, v in record.items() if not k.startswith('_') or k == '_id'}
        
        # Format based on collection type
        if collection_name == "users":
            return self._format_user_record(record_clean)
        elif collection_name == "departments":
            return self._format_department_record(record_clean)
        elif collection_name == "branches":
            return self._format_branch_record(record_clean)
        elif collection_name == "attendance":
            return self._format_attendance_record(record_clean)
        elif collection_name == "requests":
            return self._format_request_record(record_clean)
        elif collection_name == "shifts":
            return self._format_shift_record(record_clean)
        elif collection_name == "payroll":
            return self._format_payroll_record(record_clean)
        else:
            # Generic format
            return self._format_generic_record(record_clean, collection_name)
    
    def _format_user_record(self, record: Dict[str, Any]) -> str:
        """Format user record as text"""
        parts = [f"Nhân viên: {record.get('name', 'N/A')}"]
        if record.get('email'):
            parts.append(f"Email: {record.get('email')}")
        if record.get('position'):
            parts.append(f"Chức vụ: {record.get('position')}")
        if record.get('role'):
            parts.append(f"Vai trò: {record.get('role')}")
        if record.get('department'):
            parts.append(f"Phòng ban: {record.get('department')}")
        if record.get('branch'):
            parts.append(f"Chi nhánh: {record.get('branch')}")
        if record.get('baseSalary'):
            parts.append(f"Lương cơ bản: {record.get('baseSalary')}")
        if record.get('leaveBalance') is not None:
            parts.append(f"Số ngày nghỉ phép còn lại: {record.get('leaveBalance')}")
        return ". ".join(parts) + "."
    
    def _format_department_record(self, record: Dict[str, Any]) -> str:
        """Format department record as text"""
        parts = [f"Phòng ban: {record.get('name', 'N/A')}"]
        if record.get('code'):
            parts.append(f"Mã: {record.get('code')}")
        if record.get('description'):
            parts.append(f"Mô tả: {record.get('description')}")
        return ". ".join(parts) + "."
    
    def _format_branch_record(self, record: Dict[str, Any]) -> str:
        """Format branch record as text"""
        parts = [f"Chi nhánh: {record.get('name', 'N/A')}"]
        if record.get('city'):
            parts.append(f"Thành phố: {record.get('city')}")
        if record.get('code'):
            parts.append(f"Mã: {record.get('code')}")
        return ". ".join(parts) + "."
    
    def _format_attendance_record(self, record: Dict[str, Any]) -> str:
        """Format attendance record as text"""
        parts = []
        if record.get('date'):
            parts.append(f"Ngày: {record.get('date')}")
        if record.get('status'):
            parts.append(f"Trạng thái: {record.get('status')}")
        if record.get('checkIn'):
            parts.append(f"Giờ vào: {record.get('checkIn')}")
        if record.get('checkOut'):
            parts.append(f"Giờ ra: {record.get('checkOut')}")
        return ". ".join(parts) + "." if parts else "Bản ghi chấm công"
    
    def _format_request_record(self, record: Dict[str, Any]) -> str:
        """Format request record as text"""
        parts = []
        if record.get('type'):
            parts.append(f"Loại đơn: {record.get('type')}")
        if record.get('status'):
            parts.append(f"Trạng thái: {record.get('status')}")
        if record.get('startDate'):
            parts.append(f"Ngày bắt đầu: {record.get('startDate')}")
        if record.get('endDate'):
            parts.append(f"Ngày kết thúc: {record.get('endDate')}")
        return ". ".join(parts) + "." if parts else "Đơn từ"
    
    def _format_shift_record(self, record: Dict[str, Any]) -> str:
        """Format shift record as text"""
        parts = [f"Ca làm việc: {record.get('name', 'N/A')}"]
        if record.get('startTime'):
            parts.append(f"Giờ bắt đầu: {record.get('startTime')}")
        if record.get('endTime'):
            parts.append(f"Giờ kết thúc: {record.get('endTime')}")
        return ". ".join(parts) + "."
    
    def _format_payroll_record(self, record: Dict[str, Any]) -> str:
        """Format payroll record as text"""
        parts = []
        if record.get('month'):
            parts.append(f"Tháng: {record.get('month')}")
        if record.get('year'):
            parts.append(f"Năm: {record.get('year')}")
        if record.get('baseSalary'):
            parts.append(f"Lương cơ bản: {record.get('baseSalary')}")
        if record.get('netSalary'):
            parts.append(f"Lương net: {record.get('netSalary')}")
        return ". ".join(parts) + "." if parts else "Bản ghi lương"
    
    def _format_generic_record(self, record: Dict[str, Any], collection_name: str) -> str:
        """Format generic record as text"""
        parts = [f"Thông tin từ {collection_name}:"]
        for key, value in record.items():
            if key != '_id' and value is not None:
                parts.append(f"{key}: {value}")
        return ". ".join(parts) + "."

