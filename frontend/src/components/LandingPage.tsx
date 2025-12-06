import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  QrCode,
  MapPin,
  Users,
  BarChart3,
  CheckCircle,
  Sun,
  Moon,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  BookOpen,
  FileText,
  HelpCircle,
  Phone,
  Mail,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import { getRoleBasePath, type UserRoleType } from '@/utils/roles'

export default function LandingPage() {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const { token, loading, user } = useAuth()

  // Redirect to appropriate dashboard based on role if already logged in
  useEffect(() => {
    if (!loading && token && user?.role) {
      const basePath = getRoleBasePath(user.role as UserRoleType)
      navigate(basePath, { replace: true })
    } else if (!loading && token) {
      navigate('/employee', { replace: true })
    }
  }, [token, loading, navigate, user])

  const onGetStarted = () => {
    navigate('/register')
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative" style={{ backgroundColor: 'var(--background)' }}>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] rounded-full blur-[120px] opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--accent-cyan)] to-[var(--success)] rounded-full blur-[100px] opacity-20"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-[var(--warning)] to-[var(--error)] rounded-full blur-[80px] opacity-10"
          animate={{
            x: [-200, 200, -200],
            y: [-100, 100, -100],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--shell)]/80 border-b border-[var(--border)]"
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-xl blur-lg opacity-50 animate-glow" />
              <div className="relative bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] p-2 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <span className="text-2xl bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-transparent animate-gradient">
              SmartAttendance
            </span>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center space-x-3"
          >
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="text-[var(--text-main)] hover:bg-[var(--surface)]"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[var(--warning)]" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[var(--accent-cyan)]" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)] transition-all duration-300"
            >
              Đăng nhập
            </Button>
          </motion.div>
        </div>
      </motion.header>

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
              <span className="text-[var(--text-main)]">
                Tiết Kiệm{' '}
              </span>
              <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-transparent animate-gradient">
                20 Giờ/Tháng
              </span>
              <br />
              <span className="text-[var(--text-main)]">
                Quản Lý Chấm Công
              </span>
            </motion.h1>

            {/* Value Proposition */}
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-lg md:text-xl text-[var(--text-sub)] max-w-lg leading-relaxed"
            >
              Giúp 12,000+ doanh nghiệp Việt Nam{' '}
              <span className="text-[var(--text-main)] font-semibold">loại bỏ gian lận chấm công</span>,{' '}
              <span className="text-[var(--text-main)] font-semibold">tính lương chính xác</span> trong 3 phút thay vì 3 ngày.
            </motion.p>

            {/* Benefits Bar - NEW */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4"
            >
              {[
                { icon: CheckCircle, text: 'Giảm 95% gian lận chấm công' },
                { icon: Zap, text: 'Tính lương tự động, 0 sai sót' },
                { icon: Clock, text: 'Setup trong 5 phút' },
                { icon: Shield, text: 'Dùng thử miễn phí 30 ngày' },
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <benefit.icon className="h-5 w-5 text-[var(--success)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-main)]">{benefit.text}</span>
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
                    <span>Dùng thử miễn phí 30 ngày</span>
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
                onClick={() => navigate('/login')}
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
                <div className="text-sm text-[var(--text-sub)]">
                  Hỗ trợ
                </div>
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
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative z-10 bg-gradient-to-br from-[var(--surface)] to-[var(--shell)] rounded-3xl border border-[var(--border)] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent-cyan)]/5" />
              <div className="relative">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)]">
                    <QrCode className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="text-[var(--text-main)]">
                      Quét QR
                    </div>
                    <div className="text-sm text-[var(--text-sub)]">
                      Điểm danh nhanh chóng
                    </div>
                  </div>
                </div>

                <div className="aspect-square bg-[var(--input-bg)] rounded-2xl border-2 border-[var(--accent-cyan)] relative overflow-hidden mb-6 animate-glow">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent-cyan)]/20"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 bg-white rounded-xl" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-[var(--success)]">
                    <CheckCircle className="h-4 w-4" />
                    <span>GPS verified</span>
                  </div>
                  <div className="text-[var(--text-sub)]">
                    08:45 AM
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{
                y: [0, -30, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-10 -right-10 z-20 bg-gradient-to-br from-[var(--success)]/90 to-[var(--accent-cyan)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--success)]/30"
            >
              <MapPin className="h-8 w-8 text-white mb-2" />
              <div className="text-white text-sm">
                GPS Active
              </div>
            </motion.div>

            <motion.div
              animate={{
                y: [0, 30, 0],
                rotate: [0, -5, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-10 -left-10 z-20 bg-gradient-to-br from-[var(--primary)]/90 to-[var(--warning)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--primary)]/30"
            >
              <Users className="h-8 w-8 text-white mb-2" />
              <div className="text-white text-sm">
                52 Online
              </div>
            </motion.div>
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
            <BarChart3 className="h-4 w-4 text-[var(--accent-cyan)]" />
            <span className="text-sm font-medium text-[var(--text-main)]">
              ▶️ Xem Demo
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-[var(--text-main)]">
            Xem SmartAttendance{' '}
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
                  <motion.div
                    className="absolute inset-0 rounded-full bg-white/30"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

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
                  <p className="text-sm text-white/80">Xem cách SmartAttendance giúp tiết kiệm thời gian quản lý</p>
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
                <div className="text-sm font-semibold text-[var(--text-main)]">Check-in QR Code</div>
                <div className="text-xs text-[var(--text-sub)]">3 giây hoàn thành</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">Dashboard Real-time</div>
                <div className="text-xs text-[var(--text-sub)]">Theo dõi ngay lập tức</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 flex items-center justify-center">
                <Zap className="h-5 w-5 text-[var(--accent-cyan)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">Tính Lương Tự Động</div>
                <div className="text-xs text-[var(--text-sub)]">Chính xác 100%</div>
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
              icon: QrCode,
              title: "Quét QR Code",
              description:
                "Chấm công nhanh chóng, chính xác với mã QR độc quyền",
              color:
                "from-[var(--primary)] to-[var(--accent-cyan)]",
              delay: 0.1,
            },
            {
              icon: MapPin,
              title: "Định vị GPS",
              description:
                "Xác minh vị trí chấm công tự động, chống gian lận",
              color:
                "from-[var(--success)] to-[var(--accent-cyan)]",
              delay: 0.2,
            },
            {
              icon: Zap,
              title: "Xử lý Real-time",
              description:
                "Dữ liệu cập nhật tức thì, không chậm trễ",
              color: "from-[var(--warning)] to-[var(--error)]",
              delay: 0.3,
            },
            {
              icon: Shield,
              title: "Bảo mật tuyệt đối",
              description:
                "Mã hóa end-to-end, an toàn dữ liệu 100%",
              color: "from-[var(--error)] to-[var(--primary)]",
              delay: 0.4,
            },
            {
              icon: BarChart3,
              title: "Báo cáo chi tiết",
              description:
                "Phân tích sâu, xuất báo cáo đa dạng",
              color:
                "from-[var(--accent-cyan)] to-[var(--success)]",
              delay: 0.5,
            },
            {
              icon: Users,
              title: "Quản lý linh hoạt",
              description:
                "Phân quyền chi tiết, dễ dàng mở rộng",
              color:
                "from-[var(--primary)] to-[var(--success)]",
              delay: 0.6,
            },
          ].map((feature, index) => {
            const Icon = feature.icon
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
            )
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
                onClick={() => navigate('/register')}
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 ">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] p-2 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl text-[var(--text-main)]">
                  Attendance Smart
                </span>
              </div>
              <p className="text-sm text-[var(--text-sub)] leading-relaxed">
                Giải pháp chấm công thông minh hàng đầu Việt Nam,
                giúp doanh nghiệp quản lý nhân sự hiệu quả và chính xác.
              </p>
              <div className="flex items-center space-x-3">
                <a
                  href="#"
                  className="p-2 rounded-lg bg-[var(--shell)] hover:bg-[var(--primary)] text-[var(--text-sub)] hover:text-white transition-all duration-300"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-[var(--shell)] hover:bg-[var(--accent-cyan)] text-[var(--text-sub)] hover:text-white transition-all duration-300"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-[var(--shell)] hover:bg-[var(--primary)] text-[var(--text-sub)] hover:text-white transition-all duration-300"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-lg bg-[var(--shell)] hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 text-[var(--text-sub)] hover:text-white transition-all duration-300"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-[var(--text-main)] mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5 text-[var(--accent-cyan)]" />
                <span>Liên kết nhanh</span>
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Về chúng tôi', href: '#' },
                  { label: 'Tính năng', href: '#' },
                  { label: 'Bảng giá', href: '#' },
                  { label: 'Khách hàng', href: '#' },
                  { label: 'Tin tức', href: '#' },
                ].map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--text-sub)] hover:text-[var(--accent-cyan)] transition-colors duration-300 flex items-center space-x-2 group"
                    >
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-[var(--text-main)] mb-4 flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-[var(--success)]" />
                <span>Tài nguyên</span>
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Hướng dẫn sử dụng', href: '#', icon: FileText },
                  { label: 'API Documentation', href: '#', icon: FileText },
                  { label: 'Câu hỏi thường gặp', href: '#', icon: HelpCircle },
                  { label: 'Hỗ trợ kỹ thuật', href: '#', icon: Shield },
                  { label: 'Điều khoản dịch vụ', href: '#', icon: FileText },
                ].map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--text-sub)] hover:text-[var(--success)] transition-colors duration-300 flex items-center space-x-2 group"
                    >
                      <link.icon className="h-4 w-4 opacity-60 group-hover:opacity-100" />
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-[var(--text-main)] mb-4 flex items-center space-x-2">
                <Phone className="h-5 w-5 text-[var(--warning)]" />
                <span>Liên hệ</span>
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-[var(--text-sub)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[var(--text-sub)]">
                      Tầng 12, Tòa nhà Smart city, Hà Nội
                    </p>
                  </div>
                </li>
                <li className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-[var(--success)] flex-shrink-0" />
                  <a
                    href="tel:1900123456"
                    className="text-sm text-[var(--text-sub)] hover:text-[var(--success)] transition-colors"
                  >
                    1900123456
                  </a>
                </li>
                <li className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-[var(--accent-cyan)] flex-shrink-0" />
                  <a
                    href="mailto:hieunguyenn1501@gmail.com"
                    className="text-sm text-[var(--text-sub)] hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    hieunguyenn1501@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

