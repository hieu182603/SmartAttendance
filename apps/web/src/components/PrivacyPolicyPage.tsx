import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-12 max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Trang chủ
      </Link>

      <h1 className="text-3xl font-bold mb-2">Chính sách bảo mật</h1>
      <p className="text-sm text-gray-500 mb-8">Cập nhật lần cuối: ngày 20 tháng 5 năm 2026</p>

      <section className="space-y-6 text-sm leading-7 text-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Giới thiệu</h2>
          <p>
            SmartAttendance ("chúng tôi") cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn theo
            quy định tại Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và các quy định pháp luật hiện
            hành của Việt Nam. Chính sách này mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ
            thông tin cá nhân của bạn khi sử dụng hệ thống chấm công SmartAttendance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Dữ liệu chúng tôi thu thập</h2>
          <p className="mb-2">Chúng tôi thu thập các loại dữ liệu sau:</p>
          <ul className="space-y-1 pl-4">
            <li>• <strong>Thông tin tài khoản:</strong> Họ tên, địa chỉ email, số điện thoại, bộ phận, chức vụ.</li>
            <li>• <strong>Dữ liệu sinh trắc học:</strong> Hình ảnh khuôn mặt và vector nhận dạng (face embeddings) — chỉ khi bạn đăng ký tính năng chấm công bằng khuôn mặt và đã cung cấp sự đồng ý rõ ràng.</li>
            <li>• <strong>Dữ liệu chấm công:</strong> Thời gian vào/ra, vị trí, chi nhánh làm việc.</li>
            <li>• <strong>Dữ liệu thiết bị:</strong> Loại trình duyệt, địa chỉ IP, thời gian truy cập (dùng cho bảo mật và nhật ký kiểm tra).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Mục đích xử lý dữ liệu</h2>
          <ul className="space-y-1 pl-4">
            <li>• Xác thực danh tính nhân viên khi chấm công.</li>
            <li>• Phòng chống gian lận chấm công hộ.</li>
            <li>• Quản lý lịch làm việc, nghỉ phép và bảng lương.</li>
            <li>• Thống kê và báo cáo nhân sự nội bộ.</li>
            <li>• Tuân thủ nghĩa vụ pháp lý của doanh nghiệp.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Cơ sở pháp lý</h2>
          <p>
            Chúng tôi xử lý dữ liệu cá nhân dựa trên: (a) sự đồng ý của bạn (đặc biệt với dữ liệu sinh trắc
            học); (b) thực hiện hợp đồng lao động; (c) nghĩa vụ pháp lý của người sử dụng lao động theo Bộ
            luật Lao động và các quy định liên quan.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Lưu trữ và bảo mật</h2>
          <ul className="space-y-1 pl-4">
            <li>• Hình ảnh khuôn mặt được lưu trữ có mã hóa trên Cloudinary (cơ sở hạ tầng đám mây có chứng nhận ISO 27001).</li>
            <li>• Dữ liệu vector nhận dạng được lưu trong cơ sở dữ liệu MongoDB với kiểm soát truy cập nghiêm ngặt.</li>
            <li>• Kết nối giữa ứng dụng và máy chủ được mã hóa bằng TLS 1.2+.</li>
            <li>• Chúng tôi không chia sẻ dữ liệu sinh trắc học với bên thứ ba ngoài mục đích trên.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Thời gian lưu giữ</h2>
          <p>
            Dữ liệu sinh trắc học được lưu giữ trong suốt thời gian bạn làm việc tại tổ chức. Khi hợp đồng
            lao động chấm dứt, dữ liệu sinh trắc học sẽ được xóa trong vòng 30 ngày, trừ khi pháp luật
            yêu cầu giữ lại lâu hơn.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Quyền của bạn theo NĐ 13/2023/NĐ-CP</h2>
          <ul className="space-y-1 pl-4">
            <li>• <strong>Quyền truy cập:</strong> Xem dữ liệu cá nhân chúng tôi đang lưu trữ về bạn.</li>
            <li>• <strong>Quyền chỉnh sửa:</strong> Yêu cầu sửa dữ liệu không chính xác.</li>
            <li>• <strong>Quyền xóa:</strong> Yêu cầu xóa dữ liệu sinh trắc học.</li>
            <li>• <strong>Quyền rút đồng ý:</strong> Rút lại sự đồng ý thu thập dữ liệu sinh trắc học bất kỳ lúc nào thông qua mục Đăng ký khuôn mặt trong ứng dụng.</li>
            <li>• <strong>Quyền phản đối:</strong> Phản đối việc xử lý dữ liệu cá nhân của bạn.</li>
          </ul>
          <p className="mt-2">
            Để thực hiện các quyền trên, bạn có thể sử dụng tính năng trong ứng dụng hoặc liên hệ quản trị viên hệ thống.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Liên hệ</h2>
          <p>
            Nếu có bất kỳ câu hỏi nào về chính sách bảo mật hoặc muốn thực hiện quyền của mình, vui lòng
            liên hệ quản trị viên hệ thống của tổ chức bạn hoặc gửi email đến địa chỉ hỗ trợ của chúng tôi.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Thay đổi chính sách</h2>
          <p>
            Chúng tôi có thể cập nhật chính sách này theo thời gian. Khi có thay đổi quan trọng, chúng tôi
            sẽ thông báo cho bạn qua email hoặc thông báo trong ứng dụng trước ít nhất 14 ngày.
          </p>
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
        © 2026 SmartAttendance. Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
