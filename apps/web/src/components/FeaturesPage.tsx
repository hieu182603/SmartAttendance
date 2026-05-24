import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Camera, MapPin, Zap, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      id: "face-id",
      title: "Chấm công Face ID",
      icon: Camera,
      color: "from-blue-500 to-cyan-500",
      description: "Nhận diện khuôn mặt với công nghệ AI tiên tiến, chống giả mạo (Anti-spoofing) với độ chính xác 99.9%. Tốc độ xử lý dưới 1 giây.",
      benefits: ["Chống giả mạo bằng ảnh/video", "Tốc độ nhận diện < 1s", "Hoạt động tốt trong điều kiện thiếu sáng"]
    },
    {
      id: "gps",
      title: "Định vị GPS chính xác",
      icon: MapPin,
      color: "from-green-500 to-emerald-500",
      description: "Xác thực vị trí nhân viên khi check-in/out. Quản lý có thể thiết lập bán kính cho phép chấm công xung quanh văn phòng hoặc điểm bán.",
      benefits: ["Ngăn chặn chấm công hộ", "Hỗ trợ nhân viên đi công tác/thị trường", "Cảnh báo khi ngoài bán kính cho phép"]
    },
    {
      id: "payroll",
      title: "Tính lương tự động",
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      description: "Hệ thống tự động tổng hợp công, ca làm, làm thêm giờ, đi muộn về sớm và xuất ra bảng lương chi tiết không cần excel.",
      benefits: ["Tiết kiệm 90% thời gian làm lương", "Không sai sót do con người", "Đồng bộ với hệ thống kế toán"]
    },
    {
      id: "analytics",
      title: "Báo cáo Real-time",
      icon: BarChart3,
      color: "from-purple-500 to-pink-500",
      description: "Cập nhật dữ liệu ngay lập tức lên Dashboard của quản lý. Cung cấp cái nhìn tổng quan về tình hình nhân sự của toàn doanh nghiệp.",
      benefits: ["Dữ liệu cập nhật theo thời gian thực", "Biểu đồ trực quan, dễ hiểu", "Xuất file PDF/Excel linh hoạt"]
    }
  ];

  const ActiveIcon = features[activeTab].icon;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--accent-cyan)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--accent-cyan)]" />
            <span className="text-lg font-semibold text-[var(--text-main)]">SmartAttendance</span>
          </div>
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--accent-cyan)] hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="pb-20">
        {/* Header */}
        <section className="py-20 text-center container mx-auto px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-[var(--text-main)] mb-6"
          >
            Tính năng <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">Vượt trội</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[var(--text-sub)] max-w-2xl mx-auto"
          >
            Mọi công cụ bạn cần để quản lý nhân sự hiệu quả, tiết kiệm thời gian và tự động hóa quy trình.
          </motion.p>
        </section>

        {/* Interactive Tabs */}
        <section className="container mx-auto px-6 mb-24">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-10 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Tabs List */}
              <div className="w-full md:w-1/3 flex flex-col gap-3">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  const isActive = activeTab === idx;
                  return (
                    <button
                      key={feature.id}
                      onClick={() => setActiveTab(idx)}
                      className={`text-left px-6 py-4 rounded-xl transition-all duration-300 flex items-center gap-4 ${
                        isActive 
                        ? "bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 shadow-sm" 
                        : "hover:bg-[var(--bg)] border border-transparent"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-br ${feature.color} text-white` : 'bg-[var(--shell)] text-[var(--text-sub)]'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`font-semibold ${isActive ? "text-[var(--text-main)]" : "text-[var(--text-sub)]"}`}>
                        {feature.title}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="w-full md:w-2/3 relative min-h-[350px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${features[activeTab].color} flex items-center justify-center mb-6 shadow-lg`}>
                      <ActiveIcon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">{features[activeTab].title}</h2>
                    <p className="text-lg text-[var(--text-sub)] mb-8 leading-relaxed">
                      {features[activeTab].description}
                    </p>
                    
                    <div className="space-y-4">
                      {features[activeTab].benefits.map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                          <span className="text-[var(--text-main)]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">Sự khác biệt rõ ràng</h2>
            <p className="text-[var(--text-sub)]">Tại sao 12,000+ doanh nghiệp chọn SmartAttendance thay vì phương pháp truyền thống.</p>
          </div>

          <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-[var(--border)] shadow-lg">
            <div className="grid grid-cols-3 bg-[var(--surface)] text-[var(--text-main)] font-bold">
              <div className="p-5 border-b border-r border-[var(--border)]">Tiêu chí</div>
              <div className="p-5 border-b border-r border-[var(--border)] text-center text-red-500 bg-red-500/5">Cách Truyền Thống</div>
              <div className="p-5 border-b border-[var(--border)] text-center text-[var(--primary)] bg-[var(--primary)]/5 flex items-center justify-center gap-2">
                <Clock className="h-5 w-5" /> SmartAttendance
              </div>
            </div>

            {[
              { label: "Thời gian Check-in", old: "30s - 1 phút / người", new: "< 1 giây / người" },
              { label: "Chống gian lận", old: "Dễ dàng chấm hộ", new: "Bảo mật tuyệt đối với Face ID & GPS" },
              { label: "Dữ liệu", old: "Cập nhật cuối tháng", new: "Real-time liên tục" },
              { label: "Tính lương", old: "Mất 3-5 ngày, dễ sai sót", new: "Tự động 100%, xuất trong 1 click" },
              { label: "Chi phí phần cứng", old: "Cao (mua máy chấm công)", new: "0đ (Dùng thiết bị di động cá nhân)" },
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 bg-[var(--bg)] border-b border-[var(--border)] hover:bg-[var(--surface)]/50 transition-colors">
                <div className="p-5 border-r border-[var(--border)] text-[var(--text-main)] font-medium">{row.label}</div>
                <div className="p-5 border-r border-[var(--border)] flex items-center justify-center gap-2 text-[var(--text-sub)]">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" /> <span className="text-sm">{row.old}</span>
                </div>
                <div className="p-5 flex items-center justify-center gap-2 text-[var(--text-main)] font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-[var(--success)] shrink-0" /> <span className="text-sm">{row.new}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
