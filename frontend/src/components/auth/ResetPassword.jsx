import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { resetPassword } from '../../services/authService'
import { toast } from 'sonner'

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || ''
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Password strength validation
  const passwordStrength = {
    hasMinLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
  const isPasswordValid = Object.values(passwordStrength).every(v => v)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast.error('Mật khẩu không đủ mạnh')
      return
    }

    if (!passwordsMatch) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPassword({ email, password: formData.password })
      
      if (response.success) {
        toast.success(response.message || 'Đặt lại mật khẩu thành công')
        navigate('/login')
      } else {
        toast.error(response.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Đặt lại mật khẩu" 
      subtitle="Tạo mật khẩu mới cho tài khoản của bạn"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Display */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-sub)]">
              Đặt lại mật khẩu cho: <span className="text-[var(--accent-cyan)] font-medium">{email}</span>
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--text-main)]">
              Mật khẩu mới
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent pr-10"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Strength Indicators */}
          {formData.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <p className="text-sm text-[var(--text-sub)]">Yêu cầu mật khẩu:</p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: 'Ít nhất 8 ký tự', valid: passwordStrength.hasMinLength },
                  { label: 'Chữ hoa (A-Z)', valid: passwordStrength.hasUpperCase },
                  { label: 'Chữ thường (a-z)', valid: passwordStrength.hasLowerCase },
                  { label: 'Số (0-9)', valid: passwordStrength.hasNumber },
                  { label: 'Ký tự đặc biệt (!@#$...)', valid: passwordStrength.hasSpecialChar },
                ].map((requirement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center space-x-1 rounded-full border border-[var(--border)] px-2 py-1 bg-[var(--surface)]/60"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 transition-colors ${
                        requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)] opacity-30'
                      }`}
                    />
                    <span
                      className={`text-[11px] transition-colors ${
                        requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)]'
                      }`}
                    >
                      {requirement.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[var(--text-main)]">
              Xác nhận mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent pr-10 ${
                  formData.confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                }`}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                Mật khẩu xác nhận không khớp
              </motion.p>
            )}
          </div>

          {/* Submit Button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Đặt lại mật khẩu
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </AuthLayout>
  )
}

