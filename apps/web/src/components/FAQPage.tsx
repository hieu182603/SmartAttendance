import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Inbox } from "lucide-react";
import PublicSiteLayout from "@/components/PublicSiteLayout";

// ── FAQ data ─────────────────────────────────────────────────────────
const faqItems = [
  {
    id: 1,
    keywords:
      "tai sao camera bao loi liveness tu choi cham cong face verify anti spoofing",
    question:
      "Tại sao camera báo lỗi Liveness và từ chối chấm công khuôn mặt?",
    answer: (
      <>
        <p className="mb-3">
          Điều này xảy ra khi cơ chế Chống giả mạo lai (Hybrid Anti-Spoofing)
          nghi ngờ có hành vi gian lận. Hệ thống phân tích kết cấu da bằng LBP
          và tần số quét ánh sáng bằng FFT để chặn các trường hợp đưa ảnh in
          trên giấy hoặc đưa màn hình điện thoại chụp sẵn người khác.
        </p>
        <p className="mb-2 font-semibold text-[var(--text-main)]">Khắc phục:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Tránh đứng ở nơi có nguồn sáng mạnh chiếu trực diện từ phía sau
            (ngược sáng).
          </li>
          <li>
            Giữ khoảng cách khuôn mặt với camera từ 30 - 50cm, không che
            mắt/kính đen hoặc khẩu trang.
          </li>
          <li>
            Nếu thiết bị/camera bị lỗi phần cứng liên tục, hệ thống sẽ gửi mã
            OTP qua Email cá nhân của bạn để check-in dự phòng.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 2,
    keywords:
      "lam sao de cham cong khi dien thoai mat gps ket noi mang offline",
    question:
      "Làm sao để chấm công khi điện thoại bị mất sóng GPS hoặc ngắt kết nối mạng?",
    answer: (
      <>
        <p className="mb-2">
          SmartAttendance hỗ trợ cơ chế lưu đệm Offline (Offline Queue). Nếu
          bạn ở vị trí khuất sóng (thang máy, hầm gửi xe):
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Ứng dụng sẽ mã hóa bức ảnh chụp và toạ độ GPS đã ghi nhận gần
            nhất, lưu trữ vào AsyncStorage trên điện thoại.
          </li>
          <li>
            Khi điện thoại khôi phục kết nối Internet, hệ thống tự động đẩy dữ
            liệu hàng đợi này lên server để đồng bộ giờ chấm công thực tế của
            bạn.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 3,
    keywords:
      "bang luong tu dong duoc tinh toan dua tren cac yeu to nao thue tncn bhxh ot",
    question:
      "Bảng lương tự động cuối tháng được tính dựa trên các yếu tố nào?",
    answer: (
      <>
        <p className="mb-2">
          Công cụ Payroll Service của hệ thống tính toán bảng lương tự động từ
          các nguồn dữ liệu đồng bộ:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Số ngày công thực tế:</strong> Lấy từ lịch sử chấm công
            check-in/out thành công.
          </li>
          <li>
            <strong>Lương làm thêm giờ (OT):</strong> Tính theo Điều 98 Bộ luật
            Lao động Việt Nam (ngày thường x1.5, cuối tuần x2.0, ngày lễ x3.0).
          </li>
          <li>
            <strong>Khấu trừ BHXH bắt buộc:</strong> Trích 10.5% lương của
            người lao động (8% BHXH, 1.5% BHYT, 1% BHTN).
          </li>
          <li>
            <strong>Thuế Thu nhập Cá nhân (TNCN):</strong> Áp dụng biểu thuế
            lũy tiến từng phần 7 bậc sau khi trừ giảm trừ gia cảnh.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 4,
    keywords:
      "du lieu sinh trac hoc khuon mat cua toi co duoc bao mat khong nghi dinh 13",
    question:
      "Dữ liệu sinh trắc học khuôn mặt của tôi có được bảo mật và tuân thủ pháp luật không?",
    answer: (
      <>
        <p className="mb-2">
          Chúng tôi cam kết tuân thủ nghiêm ngặt <strong>Nghị định 13/2023/NĐ-CP</strong> về Bảo vệ dữ liệu cá nhân:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Hệ thống <strong>không lưu trữ hình ảnh gốc</strong> của bạn trên
            server.
          </li>
          <li>
            Hình ảnh đăng ký khuôn mặt chỉ được sử dụng một lần để trích xuất
            thành vector toán học 512 con số (Embedding) mã hóa không thể dịch
            ngược.
          </li>
          <li>
            Dữ liệu truyền tải qua giao thức HTTPS được mã hóa đầu cuối và lưu
            trữ tại Cloud database bảo mật cao. Việc thu thập sinh trắc học phải
            được sự đồng ý (Consent flow) của nhân viên trước khi đăng ký.
          </li>
        </ul>
      </>
    ),
  },
];

// ── Normalize Vietnamese for search ──────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ── Main Page ────────────────────────────────────────────────────────
export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqItems;
    const q = normalize(searchQuery);
    return faqItems.filter((item) => {
      const text = normalize(item.keywords + " " + item.question);
      return text.includes(q);
    });
  }, [searchQuery]);

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
                  Câu Hỏi Thường Gặp (FAQ)
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-[var(--text-sub)]">
                Tổng hợp các câu hỏi phổ biến từ doanh nghiệp và người lao động
                trong quá trình vận hành.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Search & FAQ */}
        <section className="container mx-auto max-w-4xl px-6">
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative mb-8"
          >
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-sub)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm câu hỏi (ví dụ: GPS, Liveness, Lương...)"
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] py-4 pl-14 pr-5 text-lg text-[var(--text-main)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-300 placeholder:text-[var(--text-sub)] focus:border-[var(--accent-cyan)] focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] focus:outline-none"
            />
          </motion.div>

          {/* Accordion */}
          <div className="flex flex-col gap-4">
            {filteredFaqs.map((item, idx) => {
              const isOpen = openId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * idx }}
                  className={`overflow-hidden rounded-2xl border bg-[var(--surface)]/40 backdrop-blur-lg transition-colors duration-300 ${
                    isOpen
                      ? "border-[color:rgba(34,211,238,0.3)]"
                      : "border-[var(--border)] hover:border-[color:rgba(34,211,238,0.2)]"
                  }`}
                >
                  {/* Question header */}
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-6 p-6 text-left"
                  >
                    <span className="text-lg font-bold text-[var(--text-main)]">
                      {item.question}
                    </span>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                        isOpen
                          ? "rotate-180 bg-[color:rgba(34,211,238,0.1)] text-[var(--accent-cyan)]"
                          : "bg-[color:rgba(255,255,255,0.05)] text-[var(--text-sub)]"
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Answer body */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--border)] px-6 pb-6 pt-4 leading-relaxed text-[var(--text-sub)]">
                          {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredFaqs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center text-[var(--text-sub)]"
            >
              <Inbox className="mx-auto mb-4 h-12 w-12" />
              <p>Không tìm thấy câu hỏi nào phù hợp với từ khóa của bạn.</p>
            </motion.div>
          )}
        </section>
      </main>
    </PublicSiteLayout>
  );
}
