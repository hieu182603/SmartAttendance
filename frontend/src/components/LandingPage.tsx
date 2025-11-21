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
} from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from './ThemeProvider'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const { token, loading } = useAuth()

  // Redirect to employee dashboard if already logged in
  useEffect(() => {
    if (!loading && token) {
      navigate('/employee', { replace: true })
    }
  }, [token, loading, navigate])

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
      <section className="container mx-auto px-6 pt-20 pb-32">
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
              <span className="text-sm text-[var(--text-main)]">
                Giải pháp chấm công thông minh #1 Việt Nam
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-5xl md:text-7xl leading-tight"
            >
              <span className="text-[var(--text-main)]">
                Chấm công
              </span>
              <br />
              <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-transparent animate-gradient">
                Thông minh
              </span>
              <br />
              <span className="text-[var(--text-main)]">
                Dễ dàng
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl text-[var(--text-sub)] max-w-lg"
            >
              Quản lý chấm công với QR Code, GPS và nhận diện
              khuôn mặt. Tự động hóa hoàn toàn, chính xác tuyệt
              đối.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                onClick={() => navigate('/register')}
                size="lg"
                className="relative overflow-hidden group bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-all duration-300 text-lg px-8 py-6"
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <span>Bắt đầu ngay</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--primary)]"
                  initial={{ x: "100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center space-x-8 pt-8"
            >
              <div>
                <div className="text-3xl text-[var(--text-main)] mb-1">
                  10,000+
                </div>
                <div className="text-sm text-[var(--text-sub)]">
                  Doanh nghiệp
                </div>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <div className="text-3xl text-[var(--text-main)] mb-1">
                  99.9%
                </div>
                <div className="text-sm text-[var(--text-sub)]">
                  Độ chính xác
                </div>
              </div>
              <div className="h-12 w-px bg-[var(--border)]" />
              <div>
                <div className="text-3xl text-[var(--text-main)] mb-1">
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
              className="absolute top-10 -right-10 bg-gradient-to-br from-[var(--success)]/90 to-[var(--accent-cyan)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--success)]/30"
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
              className="absolute bottom-10 -left-10 bg-gradient-to-br from-[var(--primary)]/90 to-[var(--warning)]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[var(--primary)]/30"
            >
              <Users className="h-8 w-8 text-white mb-2" />
              <div className="text-white text-sm">
                52 Online
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-32">
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
      <section className="container mx-auto px-6 py-32">
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
      <footer className="border-t border-[var(--border)] py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] p-2 rounded-xl">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl text-[var(--text-main)]">
                SmartAttendance
              </span>
            </div>

            <div className="text-[var(--text-sub)] text-sm">
              © 2024 SmartAttendance. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

