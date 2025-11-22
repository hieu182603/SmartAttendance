import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { register as registerApi } from '../../services/authService'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '../../types'

interface FormData {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
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
  }

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu không khớp!')
      return
    }
    if (!formData.agreeTerms) {
      toast.error('Vui lòng đồng ý với điều khoản sử dụng')
      return
    }

    setIsLoading(true)

    try {
      await registerApi({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
      })
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực OTP.')
      navigate('/verify-otp', { state: { email: formData.email, purpose: 'register' } })
    } catch (err) {
      const error = err as ErrorWithMessage
      toast.error(error.message || 'Đăng ký thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Đăng ký tài khoản" 
      subtitle="Tạo tài khoản mới để bắt đầu"
    >
      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-[var(--text-main)] text-sm">Họ và tên</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Nguyễn Văn A"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="h-9 text-sm"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[var(--text-main)] text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9 text-sm"
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[var(--text-main)] text-sm">Mật khẩu</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-9 text-sm pr-10"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          
          {/* Password Strength Indicators - Single Row */}
          {formData.password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5"
            >
              {[
                { label: '8+ ký tự', valid: passwordStrength.hasMinLength },
                { label: 'A-Z', valid: passwordStrength.hasUpperCase },
                { label: 'a-z', valid: passwordStrength.hasLowerCase },
                { label: '0-9', valid: passwordStrength.hasNumber },
              ].map((requirement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center space-x-1.5"
                >
                  <CheckCircle2
                    className={`h-3 w-3 transition-colors flex-shrink-0 ${
                      requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)] opacity-30'
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors whitespace-nowrap ${
                      requirement.valid ? 'text-[var(--success)]' : 'text-[var(--text-sub)]'
                    }`}
                  >
                    {requirement.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-[var(--text-main)] text-sm">Xác nhận mật khẩu</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`h-9 text-sm pr-10 ${
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
              {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {formData.confirmPassword && !passwordsMatch && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-red-500"
            >
              Mật khẩu xác nhận không khớp
            </motion.p>
          )}
        </div>

        <div className="flex items-start space-x-2 pt-1">
          <Checkbox 
            id="terms" 
            checked={formData.agreeTerms}
            onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked })}
            className="h-3.5 w-3.5 mt-0.5"
          />
          <label htmlFor="terms" className="text-xs text-[var(--text-sub)] cursor-pointer leading-tight">
            Tôi đồng ý với{' '}
            <a href="#" className="text-[var(--accent-cyan)] hover:underline">
              điều khoản
            </a>{' '}
            và{' '}
            <a href="#" className="text-[var(--accent-cyan)] hover:underline">
              chính sách
            </a>
          </label>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 text-sm bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Đăng ký'
            )}
          </Button>
        </motion.div>

        <p className="text-center text-xs text-[var(--text-sub)] pt-1">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-[var(--accent-cyan)] hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  )
}

