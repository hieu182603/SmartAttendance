import { motion } from 'framer-motion'
import { Sun, Moon, QrCode, MapPin, BarChart3, ArrowLeft } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showBackButton?: boolean
  backTo?: string
}

export function AuthLayout({ children, title, subtitle, showBackButton = false, backTo = '/' }: AuthLayoutProps) {
  const { toggleTheme } = useTheme()

  return (
    <div className="h-screen grid lg:grid-cols-2 relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      {/* Back Button - Top Left Corner */}
      {showBackButton && (
        <motion.div
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <Link
            to={backTo}
            className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--surface)]/80 backdrop-blur-xl border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)] text-[var(--text-main)] hover:text-[var(--accent-cyan)] transition-all duration-300 shadow-lg group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      )}

      {/* Theme Toggle Button */}
      <motion.div
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--surface)]/80 backdrop-blur-xl border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--accent-cyan)] shadow-lg transition-all group"
        >
          <Sun className="h-4 w-4 sm:h-5 sm:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[var(--warning)]" />
          <Moon className="absolute h-4 w-4 sm:h-5 sm:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[var(--accent-cyan)]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </motion.div>

      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 lg:w-1/2">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] rounded-full blur-[100px] opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-br from-[var(--success)] to-[var(--warning)] rounded-full blur-[80px] opacity-20"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Left - Form */}
      <div className="flex items-center justify-center p-3 sm:p-4 lg:p-6 relative z-10 overflow-y-auto" style={{ maxHeight: '100vh' }}>
        <motion.div
          className="w-full max-w-md space-y-2 sm:space-y-3 lg:space-y-4"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-0.5 sm:space-y-1 text-center flex-shrink-0">
            <motion.div
              className="flex items-center justify-center mb-1.5 sm:mb-2 lg:mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                delay: 0.2,
              }}
            >
              <div className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-[var(--primary)] via-[var(--accent-cyan)] to-[var(--success)] bg-clip-text text-transparent animate-gradient">
                Attendance Smart
              </div>
            </motion.div>
            <motion.h1
              className="text-base sm:text-lg lg:text-xl text-[var(--text-main)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                className="text-xs text-[var(--text-sub)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          <motion.div
            className="bg-[var(--surface)] rounded-2xl p-4 sm:p-5 lg:p-6 border border-[var(--border)] shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm flex-shrink-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>

      {/* Right - Banner */}
      <div
        className="hidden lg:flex items-center justify-center p-16 relative overflow-hidden backdrop-blur-sm"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(167, 139, 250, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 10%, rgba(34, 211, 238, 0.2) 0%, transparent 50%),
            linear-gradient(135deg, #14b8a6 0%, #0ea5e9 35%, #3b82f6 65%, #6366f1 100%)
          `,
        }}
      >
        {/* Enhanced Animated Grid Pattern Background */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.15) 2px, transparent 2px)',
            backgroundSize: '60px 60px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '60px 60px'],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Diagonal Overlay Lines */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.3) 35px, rgba(255,255,255,0.3) 70px)',
          }}
          animate={{
            x: [0, 100],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Multiple Floating Orbs - Enhanced */}
        <motion.div
          className="absolute top-20 right-20 w-80 h-80 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)',
          }}
          animate={{
            y: [0, -40, 0],
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-10 left-20 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
          }}
          animate={{
            y: [0, 40, 0],
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, 40, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Enhanced Sparkle Particles */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-white rounded-full shadow-lg shadow-white/50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: 2.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Floating Geometric Shapes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className="absolute w-4 h-4 border-2 border-white/20"
            style={{
              left: `${15 + Math.random() * 70}%`,
              top: `${15 + Math.random() * 70}%`,
              borderRadius: i % 2 === 0 ? '50%' : '0%',
            }}
            animate={{
              y: [0, -30 - Math.random() * 20, 0],
              x: [0, 20 - Math.random() * 40, 0],
              rotate: [0, 360],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Animated Border Glow - Enhanced */}
        <motion.div
          className="absolute inset-0 border-l-4 border-white/20"
          animate={{
            opacity: [0.2, 0.5, 0.2],
            borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="max-w-2xl space-y-8 text-white dark:text-white text-center relative z-10 px-8"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Glowing Title - Enhanced with Better Visibility */}
          <motion.div
            className="text-6xl font-extrabold relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: 0.3,
            }}
          >
            {/* Glow Background Layer */}
            <motion.div
              className="absolute inset-0 blur-3xl text-white opacity-40"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Attendance Smart
            </motion.div>

            {/* Main Text - Solid White for Maximum Clarity */}
            <div
              className="relative text-white font-black"
              style={{
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 255, 255, 0.2)',
                letterSpacing: '0.02em',
              }}
            >
              Attendance Smart
            </div>
          </motion.div>

          <motion.p
            className="text-2xl font-light leading-relaxed tracking-wide text-white"
            style={{
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Hệ thống chấm công thông minh với QR, GPS và nhận diện khuôn mặt
          </motion.p>

          {/* Decorative Line */}
          <motion.div
            className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-transparent via-white to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 96, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />

          {/* Feature Cards with Icons - Enhanced */}
          <motion.div
            className="grid grid-cols-3 gap-6 pt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { icon: QrCode, label: "Quét QR", delay: 0.1, color: "from-cyan-400 via-cyan-500 to-blue-500", bgColor: "bg-cyan-500/20" },
              { icon: MapPin, label: "GPS Check", delay: 0.2, color: "from-emerald-400 via-green-500 to-teal-500", bgColor: "bg-emerald-500/20" },
              { icon: BarChart3, label: "Báo cáo", delay: 0.3, color: "from-purple-400 via-violet-500 to-pink-500", bgColor: "bg-purple-500/20" },
            ].map((item, index) => {
              const IconComponent = item.icon
              return (
                <motion.div
                  key={index}
                  className="relative group"
                  whileHover={{ scale: 1.05, y: -12 }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + item.delay, type: "spring", stiffness: 300 }}
                >
                  {/* Glassmorphism Card */}
                  <div className="relative bg-white/15 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-2xl shadow-black/20 overflow-hidden">
                    {/* Pulsing Background on Hover */}
                    <motion.div
                      className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-2xl bg-gradient-to-br ${item.color}`}
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Animated Corner Accent */}
                    <motion.div
                      className="absolute top-0 right-0 w-16 h-16 opacity-20"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, white 50%)`,
                      }}
                      animate={{
                        opacity: [0.1, 0.3, 0.1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.3,
                      }}
                    />

                    <div className="relative z-10">
                      {/* Icon Container with Enhanced Animation */}
                      <motion.div
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-2xl relative`}
                        animate={{
                          rotate: [0, 8, -8, 0],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.3,
                        }}
                      >
                        {/* Icon Glow */}
                        <motion.div
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} blur-md`}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <IconComponent className="h-8 w-8 text-white relative z-10" />
                      </motion.div>

                      <div className="text-base font-semibold tracking-wide">{item.label}</div>
                    </div>

                    {/* Enhanced Shine Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl"
                      style={{
                        background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent)',
                      }}
                      animate={{
                        x: ['-150%', '250%'],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: 'easeInOut',
                      }}
                    />

                    {/* Bottom Border Accent */}
                    <motion.div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r ${item.color} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: '60%' }}
                      transition={{
                        delay: 0.9 + item.delay,
                        duration: 0.6,
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Additional Info Badge */}
          <motion.div
            className="flex items-center justify-center gap-3 pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/30 text-sm font-medium"
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.15)' }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.span
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                ✨ Hiện đại - Nhanh chóng - An toàn
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
