import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import PublicSiteLayout from "@/components/PublicSiteLayout";

// ── Inline keyframes ─────────────────────────────────────────────────
const customStyles = `
@keyframes dot-pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
`;

// ── Support form types ───────────────────────────────────────────────
const issueTypes = [
  { value: "face-app", label: "Lỗi quét khuôn mặt trên Điện thoại" },
  { value: "gps-error", label: "Không nhận toạ độ GPS / Geofence" },
  { value: "payroll-issue", label: "Sai sót tính toán ngày công / Bảng lương" },
  { value: "account-lock", label: "Khóa tài khoản / Quên mật khẩu đăng nhập" },
  { value: "other", label: "Vấn đề kỹ thuật khác" },
];

// ── Timeline Step Component ──────────────────────────────────────────
function TimelineStep({
  label,
  status,
  num,
}: {
  label: string;
  status: "completed" | "active" | "pending";
  num: number;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div
        className={`grid h-[26px] w-[26px] place-items-center rounded-full border-2 text-xs font-semibold transition-all duration-500 ${
          status === "completed"
            ? "border-[var(--success)] bg-[var(--success)] text-white"
            : status === "active"
              ? "border-[var(--accent-cyan)] bg-[var(--background)] text-[var(--accent-cyan)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-sub)]"
        }`}
        style={
          status === "active"
            ? { boxShadow: "0 0 10px rgba(34,211,238,0.4)" }
            : {}
        }
      >
        {status === "completed" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          num
        )}
      </div>
      <span
        className={`text-xs font-semibold ${
          status === "active"
            ? "text-[var(--text-main)]"
            : "text-[var(--text-sub)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ── Channel Card ─────────────────────────────────────────────────────
function ChannelCard({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--shell)] p-5">
      <div className="flex items-center justify-center rounded-xl bg-[color:rgba(34,211,238,0.1)] p-3 text-[var(--accent-cyan)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="mb-0.5 font-bold">{title}</div>
        <a
          href={href}
          className="text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--accent-cyan)]"
        >
          {value}
        </a>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function TechSupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [timelineProgress, setTimelineProgress] = useState(33);
  const [step2Status, setStep2Status] = useState<"active" | "completed">("active");
  const [step3Status, setStep3Status] = useState<"pending" | "active" | "completed">("pending");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const id = "#SA-" + Math.floor(10000 + Math.random() * 90000);
    setTicketId(id);

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimelineProgress(33);
      setStep2Status("active");
      setStep3Status("pending");

      // Animate timeline
      setTimeout(() => {
        setTimelineProgress(66);
        setStep2Status("completed");
        setStep3Status("active");

        setTimeout(() => {
          setTimelineProgress(100);
          setStep3Status("completed");
        }, 3000);
      }, 3000);
    }, 1500);
  }

  function resetForm() {
    setSubmitted(false);
    setTimelineProgress(33);
    setStep2Status("active");
    setStep3Status("pending");
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-[var(--text-main)] transition-all duration-300 focus:border-[var(--accent-cyan)] focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] focus:outline-none";

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
                  Hỗ Trợ Kỹ Thuật
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-[var(--text-sub)]">
                Gặp sự cố phần mềm hoặc thiết bị chấm công? Gửi yêu cầu ngay
                để đội kỹ thuật hỗ trợ bạn.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Support Grid */}
        <section className="container mx-auto px-6">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            {/* Left — Form / Success */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {!submitted ? (
                <div
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 backdrop-blur-lg md:p-8"
                  style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
                >
                  <h3 className="mb-6 text-xl font-bold">Gửi Yêu Cầu Hỗ Trợ</h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-sub)]">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-sub)]">
                        Email công ty
                      </label>
                      <input
                        type="email"
                        className={inputClass}
                        placeholder="nhanvien@smartattendance.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-sub)]">
                        Phân loại sự cố
                      </label>
                      <select className={inputClass} required>
                        {issueTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-sub)]">
                        Tiêu đề
                      </label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Ghi ngắn gọn lỗi gặp phải"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-sub)]">
                        Mô tả chi tiết
                      </label>
                      <textarea
                        className={`${inputClass} min-h-[120px] resize-y`}
                        placeholder="Mô tả hoàn cảnh lỗi, dòng điện thoại đang dùng, hệ điều hành Android/iOS..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] py-3 font-semibold text-white shadow-[0_4px_15px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <span>Gửi Yêu Cầu Hỗ Trợ</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-8 text-center backdrop-blur-lg md:p-12"
                  style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
                >
                  {/* Success icon */}
                  <div
                    className="mx-auto mb-6 grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-[var(--success)] text-[var(--success)]"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      boxShadow: "0 0 20px rgba(34,197,94,0.2)",
                    }}
                  >
                    <Check className="h-9 w-9" />
                  </div>

                  <h3 className="mb-2 text-2xl font-bold text-[var(--success)]">
                    Đã Gửi Yêu Cầu Thành Công
                  </h3>
                  <p className="text-[var(--text-sub)]">
                    Yêu cầu hỗ trợ kỹ thuật của bạn đã được tiếp nhận trên hệ thống.
                  </p>

                  {/* Ticket ID */}
                  <div className="my-4 inline-block rounded-lg border border-dashed border-[var(--border)] bg-[var(--shell)] px-4 py-2 font-mono font-bold text-[var(--accent-cyan)]">
                    {ticketId}
                  </div>

                  {/* Timeline */}
                  <div className="relative mx-auto mt-8 flex max-w-sm justify-between">
                    {/* Background line */}
                    <div className="absolute left-0 right-0 top-3 h-0.5 bg-[var(--border)]" />
                    {/* Progress line */}
                    <div
                      className="absolute left-0 top-3 h-0.5 bg-[var(--accent-cyan)] transition-[width] duration-[1.5s] ease-out"
                      style={{ width: `${timelineProgress}%` }}
                    />
                    <TimelineStep label="Đã gửi" status="completed" num={1} />
                    <TimelineStep label="Đang xử lý" status={step2Status} num={2} />
                    <TimelineStep label="Hoàn tất" status={step3Status} num={3} />
                  </div>

                  <button
                    onClick={resetForm}
                    className="mt-10 w-full rounded-xl border border-[var(--border)] bg-transparent py-3 font-semibold text-[var(--text-main)] transition-all duration-300 hover:border-[var(--accent-cyan)] hover:bg-[var(--surface)] hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  >
                    Tạo Yêu Cầu Khác
                  </button>
                </motion.div>
              )}
            </motion.div>

            {/* Right — Contact channels */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-4"
            >
              <h3 className="mb-6 text-xl font-bold">Kênh Hỗ Trợ Nhanh</h3>

              <ChannelCard
                icon={Phone}
                title="Hotline Kỹ Thuật"
                value="1900123456"
                href="tel:1900123456"
              />
              <ChannelCard
                icon={Mail}
                title="Email Kỹ Thuật"
                value="hieunguyenn1501@gmail.com"
                href="mailto:hieunguyenn1501@gmail.com"
              />
              <ChannelCard
                icon={MessageSquare}
                title="AI Chatbot Hỗ Trợ"
                value="Trò chuyện trực tuyến 24/7"
                href="/user-guide"
              />

              {/* Warning card */}
              <div
                className="rounded-2xl border border-[color:rgba(245,158,11,0.2)] bg-[var(--surface)]/40 p-5 backdrop-blur-lg"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}
              >
                <div className="mb-3 flex items-center gap-3 font-bold text-[var(--warning)]">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Lưu ý Quan Trọng</span>
                </div>
                <p className="text-justify text-sm text-[var(--text-sub)]">
                  Để hỗ trợ nhanh nhất, vui lòng chụp màn hình thông báo lỗi
                  (nếu có) và ghi chú rõ tên dòng điện thoại bạn gặp lỗi. Đội
                  kỹ thuật xử lý ticket trong vòng tối đa 2 giờ làm việc.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
