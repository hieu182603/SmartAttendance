import { useState } from 'react';
import { Camera, MapPin, Zap, BarChart3, CheckCircle2, Shield, ShieldCheck, Cloud, Smartphone, Monitor, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicSiteLayout from '@/components/PublicSiteLayout';

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
    <PublicSiteLayout>
      <main className="pb-20">
        {/* Header */}
        <section className="py-20 text-center container mx-auto px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-main)] mb-6"
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
                    <motion.div 
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${features[activeTab].color} flex items-center justify-center mb-6 shadow-lg shadow-[var(--accent-cyan)]/20`}
                    >
                      <ActiveIcon className="h-8 w-8 text-white" />
                    </motion.div>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-4">{features[activeTab].title}</h2>
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

        {/* Bento Grid Features */}
        <section className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-main)] mb-4">Công nghệ lõi <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">Đột phá</span></h2>
            <p className="text-[var(--text-sub)] max-w-2xl mx-auto">Kiến trúc hệ thống được xây dựng để đảm bảo hiệu năng cao, bảo mật tuyệt đối và trải nghiệm mượt mà nhất.</p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Liveness Detection - Big Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 md:p-10 relative overflow-hidden group hover:border-[var(--accent-cyan)]/30 transition-colors"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="w-48 h-48 text-[var(--accent-cyan)]" />
              </div>
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3">Chống giả mạo (Anti-spoofing)</h3>
                <p className="text-[var(--text-sub)] max-w-md">Thuật toán Liveness Detection phân tích độ sâu khuôn mặt 3D, loại bỏ hoàn toàn rủi ro sử dụng hình ảnh, video hay mặt nạ để chấm công hộ.</p>
              </div>
            </motion.div>

            {/* Lightning Speed - Square Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 relative overflow-hidden group hover:border-[var(--primary)]/30 transition-colors flex flex-col justify-between"
            >
              <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-40 h-40 text-[var(--primary)]" />
              </div>
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Tốc độ &lt; 1s</h3>
                <p className="text-[var(--text-sub)] text-sm">Kiến trúc Edge Computing cho phép xử lý nhận diện ngay trên thiết bị nhanh chóng.</p>
              </div>
            </motion.div>

            {/* Cloud Sync - Square Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 relative overflow-hidden group hover:border-[var(--success)]/30 transition-colors"
            >
              <div className="absolute top-8 right-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cloud className="w-24 h-24 text-[var(--success)]" />
              </div>
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--success)]/10 text-[var(--success)]">
                  <Cloud className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Đồng bộ Cloud</h3>
                <p className="text-[var(--text-sub)] text-sm">Dữ liệu được mã hóa đầu cuối và đồng bộ thời gian thực lên máy chủ bảo mật.</p>
              </div>
            </motion.div>

            {/* Multi-platform - Wide Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 relative overflow-hidden group hover:border-[var(--text-main)]/20 transition-colors flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-1 relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--shell)] text-[var(--text-main)] border border-[var(--border)]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Đa nền tảng (Cross-platform)</h3>
                <p className="text-[var(--text-sub)] text-sm max-w-md">Sử dụng mượt mà trên thiết bị di động cá nhân và Web Dashboard. Không phụ thuộc vào thiết bị phần cứng chuyên dụng.</p>
              </div>
              <div className="shrink-0 flex gap-4 text-[var(--text-sub)]/20 group-hover:text-[var(--text-main)]/40 transition-colors">
                <Smartphone className="w-10 h-10" />
                <Monitor className="w-10 h-10" />
                <Globe className="w-10 h-10" />
              </div>
            </motion.div>

          </div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
