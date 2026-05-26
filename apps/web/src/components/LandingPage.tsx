import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  Camera,
  MapPin,
  Users,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { getRoleBasePath, type UserRoleType } from "@/utils/roles";
import PublicSiteLayout from "@/components/PublicSiteLayout";

export default function LandingPage() {
  const navigate = useNavigate();
  const { token, loading, user } = useAuth();

  // Redirect to appropriate dashboard based on role if already logged in
  useEffect(() => {
    if (!loading && token && user?.role) {
      const basePath = getRoleBasePath(user.role as UserRoleType);
      navigate(basePath, { replace: true });
    } else if (!loading && token) {
      navigate("/employee", { replace: true });
    }
  }, [token, loading, navigate, user]);

  const onGetStarted = () => {
    navigate("/register");
  };

  return (
    <PublicSiteLayout>
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-8 pb-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30"
            >
              <Sparkles className="h-4 w-4 text-[var(--accent-cyan)]" />
              <span className="text-sm font-medium text-[var(--text-main)]">
                ⭐ Được 12,000+ doanh nghiệp Việt Nam tin dùng
              </span>
            </motion.div>

            {/* New Benefit-Driven Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight"
            >
              <span className="text-[var(--text-main)]">Tiết Kiệm </span>
              <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-transparent animate-gradient">
                20 Giờ/Tháng
              </span>
              <br />
              <span className="text-[var(--text-main)]">Quản Lý Chấm Công</span>
            </motion.h1>

            {/* Value Proposition */}
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg md:text-xl text-[var(--text-sub)] max-w-lg leading-relaxed"
            >
              Giúp 12,000+ doanh nghiệp Việt Nam{" "}
              <span className="text-[var(--text-main)] font-semibold">
                loại bỏ gian lận chấm công
              </span>
              ,{" "}
              <span className="text-[var(--text-main)] font-semibold">
                tính lương chính xác
              </span>{" "}
              trong 3 phút thay vì 3 ngày.
            </motion.p>

            {/* Benefits Bar - NEW */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4"
            >
              {[
                { icon: CheckCircle, text: "Giảm 95% gian lận chấm công" },
                { icon: Zap, text: "Tính lương tự động, 0 sai sót" },
                { icon: Clock, text: "Setup trong 5 phút" },
                { icon: Shield, text: "Dùng thử miễn phí 7 ngày" },
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <benefit.icon className="h-5 w-5 text-[var(--success)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-main)]">
                    {benefit.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons - Multiple Paths */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row flex-wrap gap-4 pt-2"
            >
              {/* Primary CTA */}
              <Button
                onClick={onGetStarted}
                size="lg"
                className="relative overflow-hidden group bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-all duration-300 px-8 py-6 shadow-xl hover:shadow-2xl"
              >
                <span className="relative z-10 flex flex-col items-center sm:items-start">
                  <span className="flex items-center space-x-2 font-bold">
                    <Sparkles className="h-5 w-5" />
                    <span>Dùng thử miễn phí 7 ngày</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--primary)]"
                  initial={{ x: "100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Button>

              {/* Secondary CTA */}
              <Button
                onClick={() => navigate("/login")}
                size="lg"
                variant="outline"
                className="border-2 border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)] transition-all duration-300 px-8 py-6"
              >
                <span className="flex items-center space-x-2">
                  <span>Xem Demo 2 Phút</span>
                  <BarChart3 className="h-5 w-5" />
                </span>
              </Button>
            </motion.div>

            {/* Trust Signals Below CTA - NEW */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.65 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--text-sub)]"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                <span>Không cần thẻ tín dụng</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                <span>Setup trong 5 phút</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                <span>Hủy bất cứ lúc nào</span>
              </div>
            </motion.div>

            {/* Stats - Enhanced with labels */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center space-x-8 pt-6 border-t border-[var(--border)]"
            >
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent mb-1">
                  12,000+
                </div>
                <div className="text-sm text-[var(--text-sub)]">
                  Doanh nghiệp tin dùng
                </div>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)] bg-clip-text text-transparent mb-1">
                  99.9%
                </div>
                <div className="text-sm text-[var(--text-sub)]">
                  Độ chính xác
                </div>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--warning)] to-[var(--error)] bg-clip-text text-transparent mb-1">
                  24/7
                </div>
                <div className="text-sm text-[var(--text-sub)]">Hỗ trợ</div>
              </div>
            </motion.div>
          </div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative"
          >
            {/* Main Card */}
            <div className="animate-float-card relative z-10 bg-gradient-to-br from-[var(--surface)] to-[var(--shell)] rounded-3xl border border-[var(--border)] p-8 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent-cyan)]/5" />
              <div className="relative">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)]">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="text-[var(--text-main)]">
                      Quét ảnh và nhận diện khuôn mặt
                    </div>
                    <div className="text-sm text-[var(--text-sub)]">
                      Chấm công nhanh chóng
                    </div>
                  </div>
                </div>

                <div className="aspect-square bg-[var(--input-bg)] rounded-2xl border-2 border-[var(--accent-cyan)] relative overflow-hidden mb-6 animate-glow">
                  <img
                    src="/ảnh/FACEid1.gif"
                    alt="Face recognition demo"
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                    fetchPriority="high"
                    style={{ display: "block" }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-[var(--success)]">
                    <CheckCircle className="h-4 w-4" />
                    <span>GPS verified</span>
                  </div>
                  <div className="text-[var(--text-sub)]">08:45 AM</div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="animate-float-badge-up absolute top-10 -right-10 z-20 bg-gradient-to-br from-[var(--success)]/90 to-[var(--accent-cyan)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--success)]/30">
              <MapPin className="h-8 w-8 text-white mb-2" />
              <div className="text-white text-sm">GPS Active</div>
            </div>

            <div className="animate-float-badge-down absolute bottom-10 -left-10 z-20 bg-gradient-to-br from-[var(--primary)]/90 to-[var(--warning)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--primary)]/30">
              <Users className="h-8 w-8 text-white mb-2" />
              <div className="text-white text-sm">52 Online</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Demo Video Section - NEW */}
      <section className="container mx-auto px-6 py-16 bg-gradient-to-b from-transparent to-[var(--surface)]/30">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30 mb-4">
            <span className="text-sm font-medium text-[var(--text-main)]">
              ▶️ Xem Demo
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[var(--text-main)]">
            Xem SmartAttendance{" "}
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
              Hoạt Động
            </span>
          </h2>
          <p className="text-xl text-[var(--text-sub)] max-w-2xl mx-auto">
            60 giây để hiểu toàn bộ hệ thống chấm công thông minh
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl group cursor-pointer">
            {/* Video Container / Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-[var(--surface)] to-[var(--shell)] relative">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent-cyan)]/10" />

              {/* Placeholder content - simulating dashboard */}
              <div className="absolute inset-0 p-8 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl border-2 border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)]" />
                      <div>
                        <div className="h-4 w-32 bg-[var(--text-main)]/20 rounded" />
                        <div className="h-3 w-24 bg-[var(--text-sub)]/20 rounded mt-1" />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface)]" />
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface)]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="h-24 rounded-xl bg-gradient-to-br from-[var(--success)]/20 to-[var(--success)]/5 border border-[var(--success)]/30" />
                    <div className="h-24 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--primary)]/30" />
                    <div className="h-24 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/30" />
                  </div>

                  <div className="space-y-3">
                    <div className="h-12 rounded-lg bg-[var(--surface)]" />
                    <div className="h-12 rounded-lg bg-[var(--surface)]" />
                    <div className="h-12 rounded-lg bg-[var(--surface)]" />
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] group-hover:bg-black/30 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Pulse effect */}
                  <div className="animate-pulse-play absolute inset-0 rounded-full bg-white/30" />

                  {/* Play button */}
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-white shadow-2xl flex items-center justify-center group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300">
                    <svg
                      className="w-8 h-8 md:w-10 md:h-10 text-[var(--primary)] ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Video info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Product Demo</h3>
                  <p className="text-sm text-white/80">
                    Xem cách SmartAttendance giúp tiết kiệm thời gian quản lý
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                  1:30
                </div>
              </div>
            </div>
          </div>

          {/* Video features highlights */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--success)]/20 to-[var(--success)]/5 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  Check-in
                </div>
                <div className="text-xs text-[var(--text-sub)]">
                  3 giây hoàn thành
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  Dashboard Real-time
                </div>
                <div className="text-xs text-[var(--text-sub)]">
                  Theo dõi ngay lập tức
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 flex items-center justify-center">
                <Zap className="h-5 w-5 text-[var(--accent-cyan)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">
                  Tính Lương Tự Động
                </div>
                <div className="text-xs text-[var(--text-sub)]">
                  Chính xác 100%
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl mb-4 text-[var(--text-main)]">
            Tính năng{" "}
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
              Vượt trội
            </span>
          </h2>
          <p className="text-xl text-[var(--text-sub)] max-w-2xl mx-auto">
            Giải pháp toàn diện với công nghệ tiên tiến nhất
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Camera,
              title: "Check-in",
              description:
                "Chấm công nhanh chóng, chính xác với ảnh, GPS và nhận diện khuôn mặt độc quyền",
              color: "from-[var(--primary)] to-[var(--accent-cyan)]",
              delay: 0.1,
            },
            {
              icon: MapPin,
              title: "Định vị GPS",
              description: "Xác minh vị trí chấm công tự động, chống gian lận",
              color: "from-[var(--success)] to-[var(--accent-cyan)]",
              delay: 0.2,
            },
            {
              icon: Zap,
              title: "Xử lý Real-time",
              description: "Dữ liệu cập nhật tức thì, không chậm trễ",
              color: "from-[var(--warning)] to-[var(--error)]",
              delay: 0.3,
            },
            {
              icon: Shield,
              title: "Bảo mật tuyệt đối",
              description: "Mã hóa end-to-end, an toàn dữ liệu 100%",
              color: "from-[var(--error)] to-[var(--primary)]",
              delay: 0.4,
            },
            {
              icon: BarChart3,
              title: "Báo cáo chi tiết",
              description: "Phân tích sâu, xuất báo cáo đa dạng",
              color: "from-[var(--accent-cyan)] to-[var(--success)]",
              delay: 0.5,
            },
            {
              icon: Users,
              title: "Quản lý linh hoạt",
              description: "Phân quyền chi tiết, dễ dàng mở rộng",
              color: "from-[var(--primary)] to-[var(--success)]",
              delay: 0.6,
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: feature.delay,
                }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative bg-[var(--surface)] rounded-2xl p-8 border border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/0 to-[var(--accent-cyan)]/0 group-hover:from-[var(--primary)]/5 group-hover:to-[var(--accent-cyan)]/5 transition-all duration-300" />

                <div className="relative">
                  <div
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-xl mb-3 text-[var(--text-main)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-[var(--text-sub)]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] animate-gradient" />

          <div className="relative z-10 px-12 py-20 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl mb-6 text-white"
            >
              Sẵn sàng chuyển đổi số?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
            >
              Hàng ngàn doanh nghiệp đã tin tưởng. Đến lượt bạn!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Button
                onClick={() => navigate("/register")}
                size="lg"
                className="bg-white text-[var(--primary)] hover:bg-white/90 text-lg px-12 py-6"
              >
                <span className="flex items-center space-x-2">
                  <span>Đăng ký miễn phí</span>
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </PublicSiteLayout>
  );
}
