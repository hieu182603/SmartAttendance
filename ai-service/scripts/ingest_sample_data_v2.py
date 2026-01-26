#!/usr/bin/env python3
"""
Sample Data Ingestion Script for RAG System
Collection: att (as configured in .env)

This script ingests comprehensive SmartAttendance documents into MongoDB Atlas Vector Search.
"""
import asyncio
import logging
from datetime import datetime
from app.services.rag_service import RAGService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Sample documents for SmartAttendance system
SAMPLE_DOCUMENTS = [
    # === HỆ THỐNG ===
    {
        "content": """
        Hệ thống SmartAttendance là giải pháp chấm công thông minh sử dụng trí tuệ nhân tạo.
        
        Tính năng chính:
        1. Chấm công tự động bằng khuôn mặt - Sử dụng công nghệ nhận diện khuôn mặt AI
        2. Theo dõi thời gian làm việc - Tự động tính toán giờ làm, đi muộn, về sớm
        3. Quản lý nghỉ phép - Đăng ký, phê duyệt, theo dõi ngày nghỉ
        4. Báo cáo lương tự động - Tính lương, thưởng, khấu trừ
        5. Chatbot hỗ trợ nhân viên - Trả lời câu hỏi về chấm công, lương, chính sách
        
        Các vai trò trong hệ thống:
        - Nhân viên (EMPLOYEE): Xem thông tin cá nhân, đăng ký nghỉ, xem lương
        - Quản lý phòng ban (SUPERVISOR): Phê duyệt đơn, xem báo cáo team
        - Trưởng phòng (MANAGER): Quản lý toàn phòng ban
        - Quản lý nhân sự (HR_MANAGER): Toàn quyền quản lý nhân sự
        - Quản trị viên (ADMIN): Quản lý hệ thống
        """,
        "metadata": {
            "doc_type": "system_overview",
            "source": "system_docs",
            "title": "Tổng quan hệ thống SmartAttendance",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === CHẤM CÔNG ===
    {
        "content": """
        Quy trình chấm công trong SmartAttendance:
        
        1. ĐĂNG KÝ KHUÔN MẶT:
           - Bước 1: Đăng nhập hệ thống SmartAttendance
           - Bước 2: Vào mục "Đăng ký khuôn mặt"
           - Bước 3: Chụp ảnh chân dung từ nhiều góc độ (tối thiểu 5 ảnh)
           - Bước 4: Hệ thống xác thực và lưu trữ dữ liệu sinh trắc
           - Lưu ý: Sử dụng ảnh rõ nét, ánh sáng tốt, không đeo kính râm
        
        2. CHECK-IN HÀNG NGÀY:
           - Thời gian: 07:00 - 09:00 sáng
           - Cách thức: Đứng trước camera, hệ thống tự động nhận diện
           - Yêu cầu: Khuôn mặt rõ ràng, không che mặt
           - Kết quả: Ghi nhận thời gian, địa điểm, ảnh check-in
        
        3. CHECK-OUT HÀNG NGÀY:
           - Thời gian: 17:00 - 19:00 tối
           - Cách thức: Tương tự check-in
           - Lưu ý: Phải check-out để hoàn tất ca làm việc
        
        4. XỬ LÝ NGOẠI LỆ:
           - Nghỉ phép: Đăng ký trước ít nhất 1 ngày, được phê duyệt
           - Đi muộn: Ghi nhận tự động, trừ vào lương
           - Về sớm: Cần xin phép, ghi nhận lý do
           - Quên check-out: Báo cáo quản lý trong ngày
        
        5. BÁO CÁO:
           - Báo cáo cá nhân: Xem lịch sử chấm công của mình
           - Báo cáo phòng ban: Quản lý xem của team
           - Báo cáo tổng thể: HR/Admin xem toàn công ty
        """,
        "metadata": {
            "doc_type": "attendance_policy",
            "source": "hr_policies",
            "title": "Quy trình chấm công",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === NGHỈ PHÉP ===
    {
        "content": """
        Chính sách nghỉ phép SmartAttendance:
        
        1. NGHỈ PHÉP CÓ LƯƠNG (AL - Annual Leave):
           - Dưới 1 năm kinh nghiệm: 12 ngày/năm
           - 1-3 năm kinh nghiệm: 15 ngày/năm
           - 3-5 năm kinh nghiệm: 18 ngày/năm
           - Trên 5 năm kinh nghiệm: 20 ngày/năm
           - Quản lý: 24 ngày/năm
        
        2. NGHỈ KHÔNG LƯƠNG (UL - Unpaid Leave):
           - Theo thỏa thuận với quản lý trực tiếp
           - Phải đăng ký trước ít nhất 7 ngày làm việc
           - Tối đa 30 ngày/năm
        
        3. NGHỈ ỐM (SL - Sick Leave):
           - Cần có giấy khám bệnh từ cơ sở y tế
           - Tối đa 30 ngày/năm (có lương)
           - Trên 30 ngày: Nghỉ không lương
        
        4. NGHỈ THAI SẢN:
           - Nữ: 6 tháng (182 ngày)
           - Nam (khi vợ sinh): 5 ngày làm việc
        
        5. NGHỈ VIỆC RIÊNG:
           - Sinh nhật: 1 ngày
           - Tang lễ: Theo quy định
        
        6. QUY TRÌNH ĐĂNG KÝ NGHỈ:
           - Bước 1: Vào hệ thống SmartAttendance
           - Bước 2: Chọn "Đăng ký nghỉ phép"
           - Bước 3: Chọn loại nghỉ, ngày bắt đầu, số ngày
           - Bước 4: Nhập lý do (nếu có)
           - Bước 5: Gửi đến quản lý phê duyệt
           - Bước 6: Quản lý duyệt → HR duyệt → Hoàn tất
        """,
        "metadata": {
            "doc_type": "leave_policy",
            "source": "hr_policies",
            "title": "Chính sách nghỉ phép",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    {
        "content": """
        Hướng dẫn đăng ký nghỉ phép trên SmartAttendance:
        
        BƯỚC 1: Đăng nhập hệ thống
        - Truy cập: https://smartattendance.com
        - Nhập username và password
        - Nhấn "Đăng nhập"
        
        BƯỚC 2: Truy cập trang nghỉ phép
        - Menu bên trái → "Nghỉ phép" → "Đăng ký nghỉ"
        - Hoặc: Dashboard → "Đăng ký nghỉ phép"
        
        BƯỚC 3: Điền thông tin
        - Loại nghỉ: Chọn (Phép năm, ốm, không lương, etc.)
        - Ngày bắt đầu: Chọn ngày
        - Ngày kết thúc: Chọn ngày
        - Số ngày nghỉ: Tự động tính
        - Lý do: Nhập lý do nghỉ (không bắt buộc)
        
        BƯỚC 4: Gửi phê duyệt
        - Nhấn "Gửi đăng ký"
        - Hệ thống gửi thông báo đến quản lý
        
        BƯỚC 5: Theo dõi trạng thái
        - Vào "Lịch sử đăng ký"
        - Xem trạng thái: Chờ duyệt / Đã duyệt / Từ chối
        
        LƯU Ý QUAN TRỌNG:
        - Đăng ký trước ít nhất 1 ngày (khẩn cấp liên hệ quản lý)
        - Kiểm tra ngày nghỉ còn trước khi đăng ký
        - Ngày nghỉ được tính theo ngày làm việc (thứ 2 - thứ 6)
        """,
        "metadata": {
            "doc_type": "leave_guide",
            "source": "user_guide",
            "title": "Hướng dẫn đăng ký nghỉ phép",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === LƯƠNG ===
    {
        "content": """
        Quy trình tính lương SmartAttendance:
        
        1. LƯƠNG CƠ BẢN:
           - Được xác định theo: Cấp bậc, kinh nghiệm, vị trí
           - Tham chiếu: Bảng lương công ty
           - Đánh giá hiệu suất: 6 tháng/lần (có thể điều chỉnh lương)
        
        2. CÁC KHOẢN PHỤ CẤP:
           - Phụ cấp chức vụ: 10-30% lương cơ bản (theo vị trí)
           - Phụ cấp xăng xe: 500,000 VND/tháng
           - Phụ cấp ăn trưa: 30,000 VND/ngày làm việc thực tế
           - Phụ cấp điện thoại: Theo quy định từng phòng ban
           - Phụ cấp nhà ở: Áp dụng cho nhân viên ở xa
        
        3. CÁC KHOẢN THƯỞNG:
           - Thưởng hiệu suất: Tối đa 50% lương tháng (theo KPI)
           - Thưởng dự án: Theo đóng góp và hoàn thành dự án
           - Thưởng lễ tết: 1 tháng lương (tháng lương cơ bản)
           - Thưởng đặc biệt: Theo quyết định ban lãnh đạo
        
        4. CÁC KHOẢN KHẤU TRỪ:
           - Bảo hiểm xã hội (BHXH): 8% lương đóng góp
           - Bảo hiểm y tế (BHYT): 1.5% lương đóng góp
           - Bảo hiểm thất nghiệp (BHTN): 1% lương đóng góp
           - Thuế thu nhập cá nhân: Theo biểu luật thuế
        
        5. CÔNG THỨC TÍNH LƯƠNG:
           Lương thực nhận = Lương cơ bản + Phụ cấp + Thưởng - Khấu trừ
           
           Trong đó:
           - Giờ làm việc = Số ngày làm × 8 giờ
           - Lương theo giờ = Lương cơ bản / (22 × 8)
        
        6. KỲ THANH TOÁN:
           - Ngày 25 hàng tháng
           - Nếu ngày 25 rơi vào ngày nghỉ: Thanh toán ngày làm việc trước đó
           """,
        "metadata": {
            "doc_type": "payroll_policy",
            "source": "finance_docs",
            "title": "Quy trình tính lương",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    {
        "content": """
        Hướng dẫn xem bảng lương trên SmartAttendance:
        
        BƯỚC 1: Đăng nhập hệ thống
        - Truy cập: https://smartattendance.com
        - Đăng nhập bằng tài khoản công ty
        
        BƯỚC 2: Truy cập trang lương
        - Menu → "Lương" → "Bảng lương"
        - Hoặc: Dashboard → Click vào card "Lương tháng"
        
        BƯỚC 3: Chọn tháng
        - Dropdown chọn tháng/năm
        - Mặc định hiển thị tháng hiện tại
        
        BƯỚC 4: Xem chi tiết
        - Click vào "Chi tiết" để xem đầy đủ
        - Các thông tin hiển thị:
          + Lương cơ bản
          + Phụ cấp (chức vụ, xăng xe, ăn trưa...)
          + Thưởng (hiệu suất, dự án...)
          + Khấu trừ (BHXH, BHYT, BHTN, thuế)
          + Tổng ngày công
          + Lương thực nhận
        
        BƯỚC 5: Tải xuống
        - Click "Tải PDF" để lưu bảng lương
        - File PDF có dấu công ty và chữ ký số
        
        LƯU Ý:
        - Bảng lương được công bố vào ngày 25 mỗi tháng
        - Thắc mắc về lương liên hệ HR trong 5 ngày
        - Không chia sẻ bảng lương cá nhân công khai
        """,
        "metadata": {
            "doc_type": "payroll_guide",
            "source": "user_guide",
            "title": "Hướng dẫn xem bảng lương",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === CẤU TRÚC TỔ CHỨC ===
    {
        "content": """
        Cấu trúc tổ chức công ty SmartAttendance:
        
        1. BAN LÃNH ĐẠO (Board of Directors):
           - CEO (Chief Executive Officer): Tổng Giám đốc
           - CTO (Chief Technology Officer): Giám đốc Công nghệ
           - CFO (Chief Financial Officer): Giám đốc Tài chính
           - COO (Chief Operating Officer): Giám đốc Vận hành
        
        2. PHÒNG NHÂN SỰ (Human Resources):
           - HR Manager: Quản lý toàn bộ nhân sự
           - HR Specialist: Tuyển dụng, Đào tạo
           - HR Assistant: Hỗ trợ hành chính nhân sự
        
        3. PHÒNG KỸ THUẬT (IT/Engineering):
           - Tech Lead: Lãnh đạo kỹ thuật
           - Senior Developer: Phát triển hệ thống
           - Junior Developer: Hỗ trợ phát triển
           - DevOps Engineer: Triển khai và vận hành
           - QA Engineer: Kiểm thử phần mềm
        
        4. PHÒNG KINH DOANH (Sales):
           - Sales Manager: Quản lý kinh doanh
           - Sales Representative: Nhân viên bán hàng
           - Business Analyst: Phân tích kinh doanh
        
        5. PHÒNG HÀNH CHÍNH (Administration):
           - Admin Manager: Quản lý hành chính
           - Admin Assistant: Hỗ trợ hành chính
        
        6. PHÒNG TÀI CHÍNH (Finance):
           - Finance Manager: Quản lý tài chính
           - Accountant: Kế toán
           - Cashier: Thủ quỹ
        """,
        "metadata": {
            "doc_type": "organization_structure",
            "source": "hr_docs",
            "title": "Cấu trúc tổ chức công ty",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === QUY ĐỊNH CHUNG ===
    {
        "content": """
        Quy định chung dành cho nhân viên SmartAttendance:
        
        1. GIỜ LÀM VIỆC:
           - Thời gian: 08:00 - 17:30 (thứ 2 - thứ 6)
           - Nghỉ trưa: 12:00 - 13:00 (1.5 giờ)
           - Làm thêm: Phải đăng ký trước, được duyệt
        
        2. DRESS CODE (Quy định trang phục):
           - Thứ 2 - Thứ 5: Trang phục công sở
           - Thứ 6: Business casual
           - Ngày thường: Gọn gàng, lịch sự
           - Không được: Quần ngắn, áo ba lỗ, dép
        
        3. THẺ NHÂN VIÊN:
           - Đeo thẻ mọi lúc khi ở trong công ty
           - Thẻ dùng để check-in/out, vào cửa
           - Mất thẻ: Báo HR, phí làm lại 100,000 VND
        
        4. BẢO MẬT THÔNG TIN:
           - Không chia sẻ mật khẩu tài khoản
           - Không tiết lộ thông tin nội bộ ra ngoài
           - Không sử dụng USB cá nhân vào máy công ty
           - Đăng xuất khi rời vị trí làm việc
        
        5. SỬ DỤNG TÀI NGUYÊN CÔNG TY:
           - Internet: Chỉ cho mục đích công việc
           - Email: Chuyên nghiệp, không spam
           - Điện thoại: Hạn chế cuộc cá nhân
        
        6. VẮNG MẶT:
           - Báo trước cho quản lý
           - Xin phép nghỉ qua hệ thống
           - Trường hợp khẩn cấp: Gọi điện trước 08:00
        """,
        "metadata": {
            "doc_type": "company_policy",
            "source": "hr_policies",
            "title": "Quy định chung dành cho nhân viên",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === CHATBOT ===
    {
        "content": """
        Hướng dẫn sử dụng Chatbot SmartAttendance:
        
        Chatbot AI là trợ lý ảo, giúp bạn trả lời nhanh các câu hỏi về:
        
        CÁC CHỦ ĐỀ CHATBOT HỖ TRỢ:
        1. Thông tin cá nhân: Số ngày nghỉ còn lại, lương tháng này
        2. Chấm công: Lịch sử check-in/out, giờ làm việc
        3. Nghỉ phép: Quyền lợi, quy trình đăng ký
        4. Lương: Cách tính, các khoản phụ cấp, thưởng
        5. Chính sách công ty: Quy định chung, nội quy
        6. Quy trình làm việc: Các thủ tục hành chính
        
        CÁCH SỬ DỤNG:
        1. Mở chatbot trên menu hoặc trang chủ
        2. Nhập câu hỏi bằng tiếng Việt hoặc tiếng Anh
        3. Chatbot sẽ tìm kiếm thông tin liên quan
        4. Nhận câu trả lời kèm nguồn tham khảo
        
        VÍ DỤ CÂU HỎI:
        - "Tôi còn bao nhiêu ngày nghỉ phép?"
        - "Lương tháng này của tôi là bao nhiêu?"
        - "Tôi đã làm được bao nhiêu giờ?"
        - "Chính sách nghỉ ốm như thế nào?"
        - "Quy định về giờ làm việc?"
        - "Làm sao để đăng ký nghỉ phép?"
        
        LƯU Ý:
        - Chatbot trả lời dựa trên dữ liệu đã được ingest
        - Với câu hỏi cá nhân (lương, ngày nghỉ), cần đăng nhập
        - Thắc mắc phức tạp liên hệ HR trực tiếp
        """,
        "metadata": {
            "doc_type": "chatbot_guide",
            "source": "user_guide",
            "title": "Hướng dẫn sử dụng Chatbot",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    },

    # === LỢI ÍCH & PHÚC LỢI ===
    {
        "content": """
        Chế độ phúc lợi nhân viên SmartAttendance:
        
        1. BẢO HIỂM:
           - BHXH (Bảo hiểm Xã hội): Công ty đóng 17.5%
           - BHYT (Bảo hiểm Y tế): Công ty đóng 3%
           - BHTN (Bảo hiểm Thất nghiệp): Công ty đóng 1%
           - Bảo hiểm sức khỏe: Gói Premium cho nhân viên trên 1 năm
        
        2. ĐÀO TẠO & PHÁT TRIỂN:
           - Đào tạo nội bộ: Miễn phí
           - Khóa học bên ngoài: Theo ngân sách phê duyệt
           - Thăng tiến: Review 6 tháng/lần
        
        3. PHÚC LỢI TÀI CHÍNH:
           - Thưởng tháng lương (13th month salary)
           - Thưởng hiệu suất theo KPI
           - Thưởng dự án hoàn thành
           - Lương tháng 13 (thưởng Tết Nguyên đán)
        
        4. PHÚC LỢI PHI TÀI CHÍNH:
           - Team building: 1 lần/quý
           - Sinh nhật: Quà tặng + Nghỉ 1 ngày
           - Ngày lễ: Teambuilding, Year-end party
           - Gym/Thể thao: Hỗ trợ 50% phí thành viên
        
        5. PHÚC LỢI ĐẶC BIỆT:
           - Laptop/Macbook: Cấp theo vị trí
           - Phone allowance: 500,000 VND/tháng
           - Transportation: Hỗ trợ xăng xe
           - Lunch: Meal allowance 30,000 VND/ngày
        
        6. NGHỈ NGƠI:
           - Nghỉ phép: Theo chính sách trên
           - Nghỉ lễ: Đủ ngày theo quy định nhà nước
           - Sick leave: Có lương (có giấy y tế)
        """,
        "metadata": {
            "doc_type": "benefits",
            "source": "hr_policies",
            "title": "Chế độ phúc lợi nhân viên",
            "language": "vi",
            "access_level": "public",
            "department_id": None
        }
    }
]


async def main():
    """Main ingestion function"""
    try:
        logger.info("=" * 60)
        logger.info("Starting sample data ingestion...")
        logger.info(f"Collection: att")
        logger.info(f"Documents: {len(SAMPLE_DOCUMENTS)}")
        logger.info("=" * 60)

        # Initialize RAG service
        rag_service = RAGService()
        logger.info("RAG service initialized successfully")

        # Ingest sample documents
        result = await rag_service.ingest_documents(
            documents=SAMPLE_DOCUMENTS,
            collection_name="att",  # Using collection from .env
            chunk_size=1000,
            chunk_overlap=200
        )

        logger.info("=" * 60)
        logger.info("Sample data ingestion completed!")
        logger.info(f"Total documents: {result['total_documents']}")
        logger.info(f"Total chunks: {result['total_chunks']}")
        logger.info(f"Collection: {result['collection_name']}")
        logger.info("=" * 60)

        # Test search functionality
        logger.info("\nTesting search functionality...")
        test_queries = [
            "chính sách nghỉ phép",
            "cách chấm công",
            "cấu trúc lương",
            "quy định công ty",
            "phúc lợi nhân viên"
        ]

        for query in test_queries:
            logger.info(f"\nSearching for: '{query}'")
            results = await rag_service.search_documents(query=query, limit=3)
            logger.info(f"Found {len(results)} results")
            for i, result in enumerate(results, 1):
                score = result.get('score', 0)
                metadata = result.get('metadata', {})
                title = metadata.get('title', 'N/A')
                logger.info(f"  {i}. [{score:.3f}] {title}")

        logger.info("\n" + "=" * 60)
        logger.info("Sample data ingestion and testing completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error during data ingestion: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())

