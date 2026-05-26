import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import PublicSiteLayout from "@/components/PublicSiteLayout";

// ── Sections data ────────────────────────────────────────────────────
const sections = [
  {
    id: "section-1",
    title: "1. Chấp thuận Điều khoản dịch vụ",
    content: (
      <>
        <p>
          Bằng việc đăng ký tài khoản doanh nghiệp B2B hoặc đăng nhập vào hệ
          thống ứng dụng chấm công SmartAttendance, bạn xác nhận đã đọc, hiểu rõ
          và đồng ý ràng buộc bởi toàn bộ các điều khoản nêu tại văn bản thỏa
          thuận này.
        </p>
        <p>
          Nếu bạn đại diện cho một tổ chức hoặc doanh nghiệp, bạn cam kết rằng
          mình có toàn quyền đại diện hợp pháp để thông qua thỏa thuận cung cấp
          dịch vụ công nghệ thông tin này.
        </p>
      </>
    ),
  },
  {
    id: "section-2",
    title: "2. Chính sách xử lý dữ liệu sinh trắc học",
    content: (
      <>
        <p>
          SmartAttendance tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá
          nhân. Dữ liệu sinh trắc học khuôn mặt là dữ liệu nhạy cảm cực kỳ
          quan trọng:
        </p>
        <p>
          <strong>Mục đích xử lý:</strong> Phục vụ nhận dạng, xác thực danh tính
          chấm công hàng ngày cho nhân viên công ty.
        </p>
        <p>
          <strong>Nguyên tắc lưu trữ:</strong> Chúng tôi chỉ lưu trữ Vector mã
          hóa 512 con số đặc trưng của khuôn mặt dưới dạng Hash không thể phục
          hồi ngược lại ảnh chân dung gốc. Mọi bức ảnh chụp chấm công hàng ngày
          chỉ được lưu trữ bộ nhớ tạm để so sánh và bị xóa tự động khỏi luồng
          xử lý AI ngay khi có kết quả.
        </p>
        <p>
          <strong>Quyền rút lại sự đồng ý:</strong> Người lao động có quyền từ
          chối cung cấp sinh trắc học. Khi đó, doanh nghiệp có thể chỉ định
          phương pháp chấm công thay thế bằng nhập mã OTP Email do hệ thống tự
          sinh.
        </p>
      </>
    ),
  },
  {
    id: "section-3",
    title: "3. Cam kết SLA và Mức độ sẵn sàng",
    content: (
      <>
        <p>
          SmartAttendance cam kết tỷ lệ hoạt động ổn định của máy chủ cloud
          (Uptime) tối thiểu đạt <strong>99.9%</strong> hàng tháng (ngoại trừ
          thời gian bảo trì định kỳ đã thông báo trước ít nhất 24 giờ).
        </p>
        <p>
          Trong trường hợp hệ thống gặp lỗi gián đoạn máy chủ AI do lỗi của nhà
          cung cấp liên tục quá 4 giờ, doanh nghiệp khách hàng sẽ được hoàn trả
          phí dịch vụ tương ứng số ngày mất kết nối vào chu kỳ thanh toán tiếp
          theo.
        </p>
      </>
    ),
  },
  {
    id: "section-4",
    title: "4. Trách nhiệm của Khách hàng",
    content: (
      <>
        <p>
          Khách hàng (doanh nghiệp thuê phần mềm) có trách nhiệm hướng dẫn nhân
          viên chấm công tuân thủ đúng quy định, bảo mật tài khoản cá nhân, và
          không cấu hình toạ độ GPS giả lập để chấm công từ xa trái quy định.
        </p>
        <p>
          Mọi hành vi can thiệp kỹ thuật sửa đổi gói API hoặc giả mạo gói dữ
          liệu chấm công sẽ bị từ chối phục vụ dịch vụ và khóa tài khoản vĩnh
          viễn không bồi thường.
        </p>
      </>
    ),
  },
  {
    id: "section-5",
    title: "5. Thay đổi Điều khoản dịch vụ",
    content: (
      <>
        <p>
          Nhà phát triển có quyền sửa đổi các điều khoản này tại bất kỳ thời
          điểm nào. Mọi điều chỉnh sẽ được gửi thông báo trước 15 ngày qua
          email quản trị doanh nghiệp và hiển thị trên màn hình đăng nhập của
          website.
        </p>
        <p>
          Việc tiếp tục sử dụng hệ thống sau khi điều khoản mới có hiệu lực đồng
          nghĩa với việc bạn đồng ý với các thay đổi đó.
        </p>
      </>
    ),
  },
];

// ── Main Page ────────────────────────────────────────────────────────
const TermsOfServicePage: React.FC = () => {
  const [activeSection, setActiveSection] = useState("section-1");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ScrollSpy
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const containerTop = container.offsetTop;

    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i].id);
      if (el) {
        const offsetTop = el.offsetTop - containerTop;
        if (scrollTop >= offsetTop - 50) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function scrollToSection(sectionId: string) {
    const container = scrollContainerRef.current;
    const el = document.getElementById(sectionId);
    if (container && el) {
      container.scrollTo({
        top: el.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
    }
    setActiveSection(sectionId);
  }

  return (
    <PublicSiteLayout>
      <main className="pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--primary)]/20 via-[var(--background)] to-[var(--background)]" />
          <div className="container mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="mb-4 text-4xl font-extrabold md:text-5xl">
                <span className="bg-gradient-to-r from-[var(--text-main)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                  Điều Khoản Dịch Vụ
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-[var(--text-sub)]">
                Quy định pháp lý, chính sách bảo mật sinh trắc học và thỏa thuận
                mức độ dịch vụ (SLA) B2B.
              </p>
            </motion.div>
          </div>
        </section>

        {/* TOS Content */}
        <section className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 backdrop-blur-lg md:p-8"
            style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
          >
            <div className="grid gap-8 md:grid-cols-[240px_1fr]">
              {/* Scrollspy TOC */}
              <nav className="sticky top-[7rem] hidden h-fit flex-col gap-2 border-l-2 border-[var(--border)] pl-4 md:flex">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`truncate text-left text-sm transition-all duration-300 ${
                      activeSection === s.id
                        ? "translate-x-1 text-[var(--accent-cyan)]"
                        : "text-[var(--text-sub)] hover:text-[var(--accent-cyan)]"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>

              {/* Scrollable content */}
              <div
                ref={scrollContainerRef}
                className="max-h-[60vh] overflow-y-auto scroll-smooth rounded-2xl border border-[var(--border)] bg-[var(--surface)]/20 p-6 md:p-8"
              >
                {sections.map((s) => (
                  <div key={s.id} id={s.id} className="mb-8 last:mb-0">
                    <h3 className="mb-4 border-b border-[color:rgba(255,255,255,0.05)] pb-2 text-xl font-bold text-[var(--text-main)]">
                      {s.title}
                    </h3>
                    <div className="space-y-4 text-justify leading-relaxed text-[var(--text-sub)]">
                      {s.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </PublicSiteLayout>
  );
};

export default TermsOfServicePage;
