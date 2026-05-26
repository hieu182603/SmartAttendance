import { Target, Shield, Zap, Heart, Users, Headset, Sparkles, ScanFace } from 'lucide-react';
import { motion } from 'framer-motion';
import PublicSiteLayout from '@/components/PublicSiteLayout';

export default function AboutUsPage() {
  const values = [
    {
      icon: Shield,
      title: "Bảo mật tuyệt đối",
      description: "Dữ liệu của khách hàng là tài sản quý giá nhất. Chúng tôi cam kết bảo mật 100% bằng chuẩn mã hóa cao nhất.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Zap,
      title: "Tốc độ và Chính xác",
      description: "Tối ưu hóa thời gian xử lý, tính toán tự động và loại bỏ hoàn toàn các sai sót do con người tạo ra.",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: Heart,
      title: "Lấy khách hàng làm trung tâm",
      description: "Mọi tính năng đều được phát triển dựa trên phản hồi và nhu cầu thực tế của người dùng.",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      icon: Target,
      title: "Đổi mới liên tục",
      description: "Luôn tiên phong ứng dụng công nghệ AI và Machine Learning mới nhất vào hệ thống quản trị.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    }
  ];

  const stats = [
    {
      icon: Users,
      value: "Sẵn sàng",
      label: "Phục vụ doanh nghiệp",
      desc: "Triển khai B2B theo quy mô",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      accent: "from-blue-500/20 to-transparent",
    },
    {
      icon: ScanFace,
      value: "90%",
      label: "AI Face ID",
      desc: "Độ chính xác nhận diện khuôn mặt",
      iconBg: "bg-cyan-500/15",
      iconColor: "text-[var(--accent-cyan)]",
      accent: "from-cyan-500/20 to-transparent",
    },
    {
      icon: Heart,
      value: "100%",
      label: "Tâm huyết đội ngũ",
      desc: "Đồng hành dài hạn",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      accent: "from-emerald-500/20 to-transparent",
    },
    {
      icon: Headset,
      value: "24/7",
      label: "Hỗ trợ",
      desc: "Phản hồi nhanh qua ticket",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
      accent: "from-amber-500/20 to-transparent",
    },
  ] as const;

  return (
    <PublicSiteLayout>
      <main className="pb-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--primary)]/20 via-[var(--background)] to-[var(--background)] -z-10" />
          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-[var(--text-main)] mb-6">
                Câu chuyện của <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">SmartAttendance</span>
              </h1>
              <p className="text-lg md:text-xl text-[var(--text-sub)] max-w-3xl mx-auto leading-relaxed">
                Chúng tôi tin rằng công nghệ sinh ra để giải phóng con người khỏi những công việc lặp đi lặp lại. 
                SmartAttendance ra đời với sứ mệnh xóa bỏ gian lận, tiết kiệm hàng chục giờ tính lương mỗi tháng và mang lại môi trường làm việc minh bạch.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="py-16 bg-[var(--surface)]/30 border-y border-[var(--border)]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">Hành trình phát triển</h2>
              <p className="text-[var(--text-sub)]">Những cột mốc quan trọng định hình chúng tôi hôm nay.</p>
            </div>
            
            <div className="max-w-4xl mx-auto relative border-l-2 border-[var(--primary)]/20 pl-8 space-y-12">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Đầu 2025 - Khởi nguồn ý tưởng</h3>
                <p className="text-[var(--text-sub)]">Đội ngũ sáng lập nhận ra nỗi đau của các doanh nghiệp SMEs trong việc quản lý chấm công thủ công và quyết định khởi nghiệp để xây dựng một hệ thống hoàn toàn mới dựa trên AI.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_10px_var(--accent-cyan)]" />
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Cuối 2025 - Thử nghiệm Beta</h3>
                <p className="text-[var(--text-sub)]">Phiên bản thử nghiệm đầu tiên được đưa vào thực tế. Chúng tôi lắng nghe phản hồi liên tục từ những người dùng đầu tiên để hoàn thiện tính năng nhận diện khuôn mặt Face ID và hệ thống định vị GPS.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="relative"
              >
                <div className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-[var(--success)] shadow-[0_0_10px_var(--success)]" />
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">2026 - Hoàn thiện & Chính thức ra mắt</h3>
                <p className="text-[var(--text-sub)]">SmartAttendance tự hào là một sản phẩm khởi nghiệp đầy nhiệt huyết, chính thức ra mắt phiên bản hoàn thiện nhất để đồng hành cùng quá trình chuyển đổi số của các doanh nghiệp Việt.</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4">Giá trị cốt lõi</h2>
              <p className="text-[var(--text-sub)]">Nền tảng cho mọi hoạt động và sản phẩm của chúng tôi.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${value.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <value.icon className={`h-6 w-6 ${value.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{value.title}</h3>
                  <p className="text-sm text-[var(--text-sub)] leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 lg:py-20">
          <div className="container mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm md:p-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--primary)]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[var(--accent-cyan)]/10 blur-3xl" />

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 mx-auto mb-10 max-w-2xl text-center"
              >
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-cyan)]/25 bg-[var(--accent-cyan)]/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent-cyan)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cam kết của chúng tôi
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-main)] md:text-4xl">
                  Những con số{" "}
                  <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                    bạn có thể tin cậy
                  </span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-sub)] md:text-base">
                  Cam kết rõ ràng về độ tin cậy, chất lượng dịch vụ và sự đồng hành lâu dài cùng doanh nghiệp.
                </p>
              </motion.div>

              <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.07, duration: 0.4 }}
                    className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-cyan)]/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.15)]"
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />
                    <div className="relative">
                      <div
                        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} transition-transform duration-300 group-hover:scale-105`}
                      >
                        <stat.icon className={`h-5 w-5 ${stat.iconColor}`} strokeWidth={1.75} />
                      </div>
                      <p className="text-2xl font-bold tracking-tight text-[var(--text-main)] md:text-[1.75rem] leading-tight">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">{stat.label}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-sub)]">{stat.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteLayout>
  );
}
