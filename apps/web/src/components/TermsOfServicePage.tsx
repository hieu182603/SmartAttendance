import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-12 max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Trang chủ
      </Link>

      <h1 className="text-3xl font-bold mb-2">Điều khoản sử dụng dịch vụ</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: ngày 20 tháng 5 năm 2026</p>

      <section className="space-y-6 text-sm leading-7 text-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Chấp nhận điều khoản</h2>
          <p>
            Bằng cách truy cập hoặc sử dụng hệ thống SmartAttendance ("Dịch vụ"), bạn đồng ý bị ràng buộc
            bởi các Điều khoản này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng
            Dịch vụ. Dịch vụ chỉ được cung cấp cho tổ chức, doanh nghiệp và nhân viên của họ thông qua
            thỏa thuận B2B.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Mô tả dịch vụ</h2>
          <p>
            SmartAttendance là hệ thống quản lý chấm công thông minh sử dụng công nghệ nhận diện khuôn mặt,
            cung cấp các tính năng: chấm công bằng khuôn mặt, quản lý lịch làm việc, quản lý nghỉ phép,
            tính bảng lương, báo cáo nhân sự, và chatbot hỗ trợ nhân sự.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Tài khoản và quyền truy cập</h2>
          <ul className="space-y-1 pl-4">
            <li>• Tài khoản được tạo và quản lý bởi quản trị viên của tổ chức bạn.</li>
            <li>• Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.</li>
            <li>• Không được chia sẻ thông tin đăng nhập với người khác.</li>
            <li>• Vui lòng thông báo ngay cho quản trị viên nếu phát hiện truy cập trái phép vào tài khoản của bạn.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Sử dụng hợp lệ</h2>
          <p className="mb-2">Bạn đồng ý chỉ sử dụng Dịch vụ cho mục đích hợp pháp và không:</p>
          <ul className="space-y-1 pl-4">
            <li>• Chấm công hộ hoặc gian lận dữ liệu chấm công.</li>
            <li>• Cố gắng truy cập trái phép vào dữ liệu của người dùng khác.</li>
            <li>• Phá hoại, làm gián đoạn hoặc làm quá tải hệ thống.</li>
            <li>• Sử dụng dữ liệu thu thập được cho mục đích ngoài phạm vi công việc.</li>
            <li>• Vi phạm bất kỳ quy định pháp luật nào áp dụng.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Dữ liệu sinh trắc học</h2>
          <p>
            Việc đăng ký và sử dụng tính năng nhận diện khuôn mặt là tự nguyện. Bạn có quyền rút lại sự
            đồng ý và xóa dữ liệu sinh trắc học bất kỳ lúc nào. Khi rút lại đồng ý, tính năng chấm công
            bằng khuôn mặt sẽ không còn khả dụng cho tài khoản của bạn. Xem{" "}
            <Link to="/privacy-policy" className="text-blue-600 underline hover:text-blue-700">
              Chính sách bảo mật
            </Link>{" "}
            để biết thêm chi tiết.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Sở hữu trí tuệ</h2>
          <p>
            Tất cả bản quyền, nhãn hiệu và quyền sở hữu trí tuệ liên quan đến Dịch vụ thuộc về SmartAttendance.
            Bạn được cấp phép giới hạn, không độc quyền, không thể chuyển nhượng để sử dụng Dịch vụ theo
            các điều khoản này.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Giới hạn trách nhiệm</h2>
          <p>
            Dịch vụ được cung cấp "nguyên trạng" ("as-is"). Chúng tôi không đảm bảo dịch vụ sẽ hoạt động
            không gián đoạn hay không có lỗi. Trong phạm vi tối đa được pháp luật cho phép, chúng tôi
            không chịu trách nhiệm về bất kỳ thiệt hại gián tiếp, ngẫu nhiên hoặc hậu quả nào phát sinh
            từ việc sử dụng Dịch vụ.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Luật áp dụng</h2>
          <p>
            Các Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết
            tại Tòa án có thẩm quyền tại Thành phố Hồ Chí Minh, Việt Nam.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Thay đổi điều khoản</h2>
          <p>
            Chúng tôi có thể sửa đổi Điều khoản này theo thời gian. Phiên bản mới nhất luôn được đăng tải
            tại trang này với ngày cập nhật. Việc tiếp tục sử dụng Dịch vụ sau khi thay đổi có nghĩa là
            bạn chấp nhận điều khoản mới.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Liên hệ</h2>
          <p>
            Mọi câu hỏi về Điều khoản sử dụng, vui lòng liên hệ quản trị viên hệ thống của tổ chức bạn
            hoặc gửi yêu cầu qua tính năng hỗ trợ trong ứng dụng.
          </p>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
        © 2026 SmartAttendance. Phiên bản 1.0.
      </div>
    </div>
  );
};

export default TermsOfServicePage;
