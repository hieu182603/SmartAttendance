import { useState } from "react";
import { motion } from "framer-motion";
import { ScanFace, MapPin } from "lucide-react";
import PublicSiteLayout from "@/components/PublicSiteLayout";

// ── Biometric HUD Component ─────────────────────────────────────────
function BiometricHUD() {
  return (
    <aside
      className="relative overflow-hidden rounded-2xl border border-[color:rgba(34,211,238,0.22)] p-5 pb-6 flex flex-col gap-4"
      style={{
        background:
          "linear-gradient(165deg, rgba(34,211,238,0.06) 0%, var(--shell) 42%, rgba(15,23,42,0.95) 100%)",
        boxShadow:
          "0 8px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      aria-label="Mô phỏng nhận diện khuôn mặt"
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 35%, black 20%, transparent 75%)",
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text-sub)]">
          Nhận diện sinh trắc
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[color:rgba(34,211,238,0.25)] bg-[color:rgba(34,211,238,0.12)] px-2 py-0.5 font-mono text-[0.65rem] font-bold tracking-wide text-[var(--accent-cyan)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)] animate-[dot-pulse_1.5s_infinite]" style={{ boxShadow: "0 0 8px var(--accent-cyan)" }} />
          LIVE
        </span>
      </div>

      {/* Face frame */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative grid h-[200px] w-[200px] place-items-center">
          {/* Pulse rings */}
          <span className="absolute inset-0 rounded-full border border-[color:rgba(34,211,238,0.35)] animate-[bio-ring-pulse_2.8s_ease-out_infinite]" />
          <span className="absolute inset-0 rounded-full border border-[color:rgba(34,211,238,0.35)] animate-[bio-ring-pulse_2.8s_ease-out_1.4s_infinite]" />

          {/* Main circle */}
          <div
            className="relative flex h-[168px] w-[168px] items-center justify-center rounded-full border-2 border-[color:rgba(34,211,238,0.45)]"
            style={{
              background:
                "radial-gradient(circle at 50% 38%, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0.92) 68%)",
              boxShadow:
                "0 0 0 4px rgba(34,211,238,0.06), 0 0 20px rgba(34,211,238,0.15)",
            }}
          >
            {/* Scanner line */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <div
                className="absolute left-0 right-0 h-0.5 animate-[bio-scan_2.6s_infinite_ease-in-out]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
                  filter: "drop-shadow(0 0 10px var(--accent-cyan))",
                }}
              />
            </div>

            {/* Corner brackets */}
            <div className="pointer-events-none absolute inset-[14px]">
              <span className="absolute left-0 top-0 h-[18px] w-[18px] rounded-tl border-l-2 border-t-2 border-[var(--accent-cyan)] opacity-95" />
              <span className="absolute right-0 top-0 h-[18px] w-[18px] rounded-tr border-r-2 border-t-2 border-[var(--accent-cyan)] opacity-95" />
              <span className="absolute bottom-0 left-0 h-[18px] w-[18px] rounded-bl border-b-2 border-l-2 border-[var(--accent-cyan)] opacity-95" />
              <span className="absolute bottom-0 right-0 h-[18px] w-[18px] rounded-br border-b-2 border-r-2 border-[var(--accent-cyan)] opacity-95" />
            </div>

            {/* Avatar icon */}
            <div className="z-10 grid h-[108px] w-[108px] place-items-center rounded-full" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)" }}>
              <ScanFace className="h-14 w-14 text-[var(--accent-cyan)] opacity-90" />
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex w-full flex-col gap-2.5 px-1">
          {[
            { label: "Góc mặt", value: "98%", width: "98%" },
            { label: "Độ sáng", value: "92%", width: "92%" },
            { label: "Liveness", value: "OK", width: "100%", success: true },
          ].map((m) => (
            <div key={m.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
              <span className="text-xs font-medium text-[var(--text-sub)]">{m.label}</span>
              <span className="text-right font-mono text-[0.8rem] font-bold text-[var(--accent-cyan)]">{m.value}</span>
              <div className="col-span-2 h-1 overflow-hidden rounded-full bg-[color:rgba(51,65,85,0.6)]">
                <div
                  className="h-full rounded-full transition-[width] duration-600"
                  style={{
                    width: m.width,
                    background: m.success
                      ? "linear-gradient(90deg, #16a34a, var(--success))"
                      : "linear-gradient(90deg, var(--primary), var(--accent-cyan))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status badges */}
      <div className="relative z-10 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[color:rgba(34,197,94,0.28)] bg-[color:rgba(34,197,94,0.12)] px-3 py-2 text-[0.8rem] font-semibold text-[var(--success)]">
          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--success)] animate-[dot-pulse_1.5s_infinite]" />
          AI sẵn sàng
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[color:rgba(34,211,238,0.22)] bg-[color:rgba(34,211,238,0.08)] px-3 py-2 text-[0.8rem] font-semibold text-[var(--accent-cyan)]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          GPS trong vùng
        </div>
      </div>

      <p className="relative z-10 text-center text-[0.72rem] leading-snug text-[var(--text-sub)]">
        Giữ mặt trong khung tròn · Ánh sáng đủ · Chờ ~3 giây để chấm công
      </p>
    </aside>
  );
}

// ── Step Card ────────────────────────────────────────────────────────
function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] items-start gap-6">
      <div
        className="grid h-[50px] w-[50px] place-items-center rounded-xl border border-[color:rgba(34,211,238,0.2)] font-mono text-2xl font-bold text-[var(--accent-cyan)]"
        style={{
          background: "rgba(34,211,238,0.1)",
          boxShadow: "0 0 20px rgba(34,211,238,0.15)",
        }}
      >
        {num}
      </div>
      <div>
        <h4 className="mb-2 text-lg font-bold text-[var(--text-main)]">{title}</h4>
        <p className="leading-relaxed text-[var(--text-sub)]">{desc}</p>
      </div>
    </div>
  );
}

// ── Guide tabs data ──────────────────────────────────────────────────
const guideTabs = [
  { id: "employee", label: "Dành cho Nhân viên" },
  { id: "manager", label: "Dành cho Quản lý" },
  { id: "hr", label: "Dành cho Quản trị & HR" },
];

const employeeSteps = [
  {
    num: "01",
    title: "Đăng ký Khuôn mặt (Face Enrollment)",
    desc: "Truy cập ứng dụng di động hoặc màn hình cá nhân trên Web. Chọn Đăng ký Khuôn mặt, đưa mặt vào khung tròn hướng camera và thực hiện quay nhẹ mặt theo hướng dẫn của AI để ghi nhận 5 góc độ vector sinh trắc.",
  },
  {
    num: "02",
    title: "Thao tác Chấm công hàng ngày",
    desc: "Mở ứng dụng khi ở trong phạm vi văn phòng công ty (GPS verified). Hướng camera vào khuôn mặt, hệ thống tự động nhận dạng trong 3 giây và lưu trữ trạng thái check-in/out thành công kèm toạ độ và thời gian thực tế.",
  },
  {
    num: "03",
    title: "Gửi Đơn từ & Yêu cầu Phép",
    desc: 'Để gửi đơn xin nghỉ phép hoặc xin sửa giờ chấm công, truy cập menu "Đơn từ". Chọn loại phép, ngày nghỉ mong muốn và bấm gửi. Quản lý sẽ duyệt phép trực tiếp và đồng bộ tự động vào bảng công cuối tháng.',
  },
];

const managerSteps = [
  {
    num: "01",
    title: "Theo dõi Realtime trạng thái Đội nhóm",
    desc: "Truy cập Dashboard quản lý để xem danh sách nhân sự đang làm việc trực tiếp, đi muộn hoặc vắng mặt hôm nay trong phòng ban do bạn phụ trách thông qua bộ lọc thời gian thực.",
  },
  {
    num: "02",
    title: "Phê duyệt Yêu cầu & Nghỉ phép",
    desc: 'Nhận thông báo khi nhân viên gửi đơn nghỉ phép hoặc chỉnh sửa giờ công. Truy cập mục "Duyệt yêu cầu", xem chi tiết lý do và bấm Duyệt (Approve) hoặc Từ chối (Reject) kèm lý do phản hồi.',
  },
  {
    num: "03",
    title: "Đánh giá và Xuất Báo cáo chấm công",
    desc: "Cuối chu kỳ làm việc, xem tổng hợp dữ liệu làm việc của phòng ban, kiểm tra số giờ làm thêm (OT) đã được phê duyệt và xuất báo cáo PDF/Excel chuyển sang bộ phận kế toán tính lương.",
  },
];

const hrSteps = [
  {
    num: "01",
    title: "Cấu hình Quy chế chấm công & GPS văn phòng",
    desc: "Thiết lập các chi nhánh văn phòng, định vị toạ độ GPS vĩ độ/kinh độ và bán kính định vị cho phép. Cấu hình thời gian bắt đầu làm việc, số phút cho phép đi muộn và khung giờ phạt tương ứng.",
  },
  {
    num: "02",
    title: "Tính lương Tự động (Payroll Generation)",
    desc: "Hệ thống tổng hợp dữ liệu chấm công từ Mongoose DB, tính toán lương căn bản, trừ phép không lương, tính giờ nhân hệ số OT, trích khấu trừ BHXH/BHYT bắt buộc và Thuế TNCN theo 7 bậc thang lũy tiến chỉ với 1 click.",
  },
  {
    num: "03",
    title: "Quản trị Hệ thống và Audit Logs",
    desc: "Theo dõi nhật ký hệ thống nâng cấp gói B2B, quản lý tài khoản User theo vai trò RBAC bảo mật và kết xuất các báo cáo tài chính/chấm công quy mô toàn doanh nghiệp.",
  },
];

// ── Inline keyframes (for animations not available in Tailwind) ──────
const customStyles = `
@keyframes bio-ring-pulse {
  0% { transform: scale(0.88); opacity: 0.85; }
  100% { transform: scale(1.12); opacity: 0; }
}
@keyframes bio-scan {
  0% { top: 8%; opacity: 0; }
  8% { opacity: 1; }
  92% { opacity: 1; }
  100% { top: 92%; opacity: 0; }
}
@keyframes dot-pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
`;

// ── Main Page ────────────────────────────────────────────────────────
export default function UserGuidePage() {
  const [activeTab, setActiveTab] = useState("employee");

  const stepsMap: Record<string, typeof employeeSteps> = {
    employee: employeeSteps,
    manager: managerSteps,
    hr: hrSteps,
  };

  return (
    <PublicSiteLayout>
      <style>{customStyles}</style>

      <main className="pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--primary)]/20 via-[var(--background)] to-[var(--background)]" />
          <div className="container mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="mb-4 text-4xl font-extrabold md:text-5xl">
                <span className="bg-gradient-to-r from-[var(--text-main)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                  Hướng Dẫn Sử Dụng
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-[var(--text-sub)]">
                Tìm hiểu các bước thiết lập và sử dụng hệ thống SmartAttendance theo từng vị trí.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Guide Content */}
        <section className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 backdrop-blur-lg md:p-8"
            style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
          >
            {/* Sub-tabs */}
            <div className="mb-8 flex gap-4 border-b border-[var(--border)] pb-2">
              {guideTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 text-base font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "text-[var(--accent-cyan)]"
                      : "text-[var(--text-sub)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="guide-tab-indicator"
                      className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-[var(--accent-cyan)]"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "employee" ? (
                <div className="grid items-start gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]">
                  <div className="flex flex-col gap-6">
                    {employeeSteps.map((s) => (
                      <StepCard key={s.num} {...s} />
                    ))}
                  </div>
                  <BiometricHUD />
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {stepsMap[activeTab].map((s) => (
                    <StepCard key={s.num} {...s} />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
