import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { forgotPassword } from '../../services/authService'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await forgotPassword({ email })
      
      if (response.success) {
        toast.success(response.message || 'Mã OTP đã được gửi đến email của bạn')
        navigate('/verify-reset-otp', { state: { email, purpose: 'reset' } })
      } else {
        toast.error(response.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Quên mật khẩu" 
      subtitle="Nhập email để nhận mã OTP khôi phục"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link
          to="/login"
          className="flex items-center space-x-2 text-[var(--text-sub)] hover:text-[var(--accent-cyan)] transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại đăng nhập</span>
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Box */}
          <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-[var(--accent-cyan)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text-sub)]">
                Nhập địa chỉ email bạn đã đăng ký. Chúng tôi sẽ gửi mã OTP để bạn có thể đặt lại mật khẩu.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--text-main)]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi mã OTP'
              )}
            </Button>
          </motion.div>

          {/* Help Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-[var(--text-sub)]">
              Bạn nhớ lại mật khẩu?{' '}
              <Link
                to="/login"
                className="text-[var(--accent-cyan)] hover:underline"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </AuthLayout>
  )
}

