#!/usr/bin/env python3
"""
Sample Data Ingestion Script for RAG System

This script ingests sample SmartAttendance-related documents into MongoDB Atlas Vector Search.
Run this after setting up your MongoDB Atlas cluster and vector search index.
"""
import asyncio
import logging
from datetime import datetime
from app.services.rag_service import RAGService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample documents for SmartAttendance system
SAMPLE_DOCUMENTS = [
    {
        "content": """
        Hệ thống SmartAttendance là giải pháp chấm công thông minh sử dụng trí tuệ nhân tạo.

        Tính năng chính:
        1. Chấm công tự động bằng khuôn mặt
        2. Theo dõi thời gian làm việc
        3. Quản lý nghỉ phép
        4. Báo cáo lương tự động
        5. Chatbot hỗ trợ nhân viên

        Hệ thống hỗ trợ nhiều vai trò:
        - Nhân viên (EMPLOYEE): Xem thông tin cá nhân
        - Quản lý phòng ban (SUPERVISOR/MANAGER): Quản lý đội nhóm
        - Quản lý nhân sự (HR_MANAGER): Toàn quyền quản lý
        - Quản trị viên (ADMIN/SUPER_ADMIN): Quản lý hệ thống
        """,
        "metadata": {
            "doc_type": "system_overview",
            "source": "system_docs",
            "title": "Tổng quan hệ thống SmartAttendance",
            "language": "vi"
        }
    },
    {
        "content": """
        Quy trình chấm công trong SmartAttendance:

        1. Đăng ký khuôn mặt:
           - Nhân viên chụp ảnh chân dung từ nhiều góc độ
           - Hệ thống xác thực và lưu trữ dữ liệu sinh trắc

        2. Chấm công hàng ngày:
           - Check-in: 7:00 - 9:00 sáng
           - Check-out: 17:00 - 19:00 tối
           - Sử dụng camera để nhận diện khuôn mặt

        3. Xử lý ngoại lệ:
           - Nghỉ phép: Được phê duyệt trước
           - Đi muộn: Tự động ghi nhận và tính phạt
           - Làm thêm: Phải đăng ký trước

        4. Báo cáo:
           - Thống kê cá nhân
           - Báo cáo phòng ban
           - Báo cáo tổng thể
        """,
        "metadata": {
            "doc_type": "attendance_policy",
            "source": "hr_policies",
            "title": "Quy trình chấm công",
            "language": "vi"
        }
    },
    {
        "content": """
        Chính sách nghỉ phép SmartAttendance:

        1. Nghỉ phép có lương:
           - 12 ngày/năm cho nhân viên dưới 1 năm kinh nghiệm
           - 15 ngày/năm cho nhân viên 1-3 năm
           - 18 ngày/năm cho nhân viên trên 3 năm
           - 20 ngày/năm cho quản lý

        2. Nghỉ không lương:
           - Theo thỏa thuận với quản lý
           - Phải đăng ký trước 7 ngày

        3. Nghỉ ốm:
           - Cần có giấy khám bệnh
           - Tối đa 30 ngày/năm

        4. Quy trình đăng ký:
           - Gửi yêu cầu qua hệ thống
           - Được phê duyệt bởi quản lý trực tiếp
           - HR phê duyệt cuối cùng
        """,
        "metadata": {
            "doc_type": "leave_policy",
            "source": "hr_policies",
            "title": "Chính sách nghỉ phép",
            "language": "vi"
        }
    },
    {
        "content": """
        Hướng dẫn sử dụng Chatbot SmartAttendance:

        Chatbot có thể trả lời các câu hỏi về:
        - Thông tin cá nhân
        - Thời gian làm việc
        - Nghỉ phép còn lại
        - Lương tháng này
        - Chính sách công ty
        - Quy trình làm việc

        Cách sử dụng:
        1. Nhập câu hỏi bằng tiếng Việt hoặc tiếng Anh
        2. Chatbot sẽ tìm kiếm thông tin liên quan
        3. Nhận câu trả lời với nguồn tham khảo

        Ví dụ câu hỏi:
        - "Tôi còn bao nhiêu ngày nghỉ phép?"
        - "Lương tháng này của tôi bao nhiêu?"
        - "Tôi đã đi làm đủ 8 tiếng chưa?"
        - "Chính sách nghỉ ốm như thế nào?"
        """,
        "metadata": {
            "doc_type": "chatbot_guide",
            "source": "user_manual",
            "title": "Hướng dẫn sử dụng Chatbot",
            "language": "vi"
        }
    },
    {
        "content": """
        Cấu trúc tổ chức SmartAttendance:

        1. Ban Lãnh đạo:
           - CEO/Founder
           - CTO (Chief Technology Officer)
           - CFO (Chief Financial Officer)

        2. Phòng Nhân sự (HR):
           - HR Manager: Quản lý tất cả nhân sự
           - HR Specialist: Tuyển dụng, đào tạo
           - HR Assistant: Hỗ trợ hành chính

        3. Phòng Kỹ thuật (IT):
           - Tech Lead: Lãnh đạo kỹ thuật
           - Senior Developer: Phát triển hệ thống
           - Junior Developer: Hỗ trợ phát triển
           - DevOps Engineer: Triển khai và vận hành

        4. Phòng Kinh doanh:
           - Sales Manager: Quản lý bán hàng
           - Sales Representative: Nhân viên bán hàng
           - Business Analyst: Phân tích kinh doanh

        5. Phòng Hành chính:
           - Admin Manager: Quản lý hành chính
           - Admin Assistant: Hỗ trợ hành chính
        """,
        "metadata": {
            "doc_type": "organization_structure",
            "source": "hr_docs",
            "title": "Cấu trúc tổ chức công ty",
            "language": "vi"
        }
    },
    {
        "content": """
        Quy trình tính lương SmartAttendance:

        1. Lương cơ bản:
           - Theo cấp bậc và kinh nghiệm
           - Tham chiếu bảng lương công ty
           - Đánh giá hiệu suất 6 tháng/lần

        2. Phụ cấp:
           - Phụ cấp chức vụ: 10-30% lương cơ bản
           - Phụ cấp xăng xe: 500,000 VND/tháng
           - Phụ cấp ăn trưa: 30,000 VND/ngày

        3. Thưởng:
           - Thưởng hiệu suất: Tối đa 50% lương tháng
           - Thưởng dự án: Theo đóng góp
           - Thưởng lễ tết: 1 tháng lương

        4. Khấu trừ:
           - Bảo hiểm xã hội: 8% lương
           - Bảo hiểm y tế: 1.5% lương
           - Bảo hiểm thất nghiệp: 1% lương
           - Thuế thu nhập cá nhân: Theo luật

        5. Kỳ lương: 25 hàng tháng
        """,
        "metadata": {
            "doc_type": "payroll_policy",
            "source": "finance_docs",
            "title": "Quy trình tính lương",
            "language": "vi"
        }
    },
    {
        "content": """
        SmartAttendance API Documentation:

        Base URL: http://localhost:8001

        Authentication:
        - API Key required in header: X-API-Key
        - JWT token for user-specific endpoints

        Main Endpoints:

        1. Face Recognition:
           - POST /face/verify: Xác thực khuôn mặt
           - POST /face/register: Đăng ký khuôn mặt

        2. RAG Chatbot:
           - POST /rag/chat: Chat với AI
           - GET /rag/conversations/{user_id}: Lịch sử cuộc trò chuyện
           - POST /rag/ingest: Thêm tài liệu vào vector DB

        3. Health Check:
           - GET /health: Kiểm tra trạng thái hệ thống
           - GET /rag/health: Kiểm tra trạng thái RAG

        Response Format:
        - Success: {"status": "success", "data": {...}}
        - Error: {"status": "error", "message": "Error description"}
        """,
        "metadata": {
            "doc_type": "api_documentation",
            "source": "technical_docs",
            "title": "API Documentation",
            "language": "vi"
        }
    }
]

async def main():
    """Main ingestion function"""
    try:
        logger.info("Starting sample data ingestion...")

        # Initialize RAG service
        rag_service = RAGService()
        logger.info("RAG service initialized successfully")

        # Ingest sample documents
        result = await rag_service.ingest_documents(
            documents=SAMPLE_DOCUMENTS,
            collection_name="documents",
            chunk_size=1000,
            chunk_overlap=200
        )

        logger.info("Sample data ingestion completed!")
        logger.info(f"Results: {result}")

        # Test search functionality
        logger.info("Testing search functionality...")
        test_queries = [
            "chính sách nghỉ phép",
            "cách chấm công",
            "cấu trúc tổ chức",
            "quy trình tính lương"
        ]

        for query in test_queries:
            logger.info(f"Searching for: '{query}'")
            results = await rag_service.search_documents(query=query, limit=2)
            for i, result in enumerate(results, 1):
                logger.info(f"  Result {i}: Score {result['score']:.3f}")
                logger.info(f"    Content: {result['content'][:100]}...")

        logger.info("Sample data ingestion and testing completed successfully!")

    except Exception as e:
        logger.error(f"Error during data ingestion: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())







