import { motion } from 'framer-motion'
import { Sun, Moon, QrCode, MapPin, BarChart3 } from 'lucide-react'
import { useTheme } from '../ThemeProvider'
import { Button } from '../ui/button'

export function AuthLayout({ children, title, subtitle }) {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div className="h-screen grid lg:grid-cols-2 relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
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
        className="hidden lg:flex items-center justify-center p-16 relative overflow-hidden animate-gradient backdrop-blur-sm"
        style={{
          background: 'linear-gradient(to bottom right, #3ab5b0, #3d99be, #56317a)'
        }}
      >
        {/* Animated Grid Pattern Background */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Multiple Floating Orbs - More Dynamic */}
        <motion.div
          className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
          animate={{
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
          animate={{
            y: [0, 30, 0],
            scale: [1, 1.3, 1],
            x: [0, -25, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"
          animate={{
            y: [0, -40, 0],
            x: [0, 30, 0],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-white/8 rounded-full blur-2xl"
          animate={{
            y: [0, 35, 0],
            x: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Sparkle Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Animated Border Glow */}
        <motion.div
          className="absolute inset-0 border-l-2 border-white/10"
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="max-w-lg space-y-6 text-white dark:text-white text-center relative z-10"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Glowing Title */}
          <motion.div
            className="text-5xl font-bold relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: 0.3,
            }}
          >
            <motion.div
              className="absolute inset-0 blur-xl opacity-50"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Attendance Smart
            </motion.div>
            <div className="relative">Attendance Smart</div>
          </motion.div>

          <motion.p
            className="text-xl opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Hệ thống chấm công thông minh với QR, GPS và nhận diện khuôn mặt
          </motion.p>

          {/* Feature Cards with Icons */}
          <motion.div
            className="grid grid-cols-3 gap-4 pt-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { icon: QrCode, label: "Quét QR", delay: 0.1, color: "from-cyan-400 to-blue-500" },
              { icon: MapPin, label: "GPS Check", delay: 0.2, color: "from-green-400 to-emerald-500" },
              { icon: BarChart3, label: "Báo cáo", delay: 0.3, color: "from-purple-400 to-pink-500" },
            ].map((item, index) => {
              const IconComponent = item.icon
              return (
                <motion.div
                  key={index}
                  className="relative bg-white/10 backdrop-blur-md rounded-2xl p-4 hover:bg-white/20 transition-all cursor-pointer border border-white/20 group"
                  whileHover={{ scale: 1.1, y: -8 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + item.delay }}
                >
                  {/* Glow Effect on Hover */}
                  <motion.div
                    className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-gradient-to-br ${item.color}`}
                  />
                  
                  <div className="relative z-10">
                    <motion.div
                      className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: index * 0.2,
                      }}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </motion.div>
                    <div className="text-sm font-medium">{item.label}</div>
                  </div>

                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    }}
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'linear',
                    }}
                  />
                </motion.div>
              )
            })}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

