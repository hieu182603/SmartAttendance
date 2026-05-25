import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Target, Shield, Zap, Heart, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <section className="py-16 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
              <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-4xl font-bold mb-1">Sẵn sàng</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Phục vụ doanh nghiệp</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                <Award className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-4xl font-bold mb-1">99.9%</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Độ chính xác</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-4xl font-bold mb-1">100%</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Tâm huyết đội ngũ</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                <Target className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-4xl font-bold mb-1">24/7</div>
                <div className="text-white/80 text-sm font-medium uppercase tracking-wider">Hỗ trợ</div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
