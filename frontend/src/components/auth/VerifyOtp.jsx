import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../AuthLayout'
import { Button } from '../ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp'
import { Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { resendOtp, verifyOtp, verifyResetOtp } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setToken, setUser } = useAuth()
  const emailFromState = location.state?.email || ''
  const purposeFromState = location.state?.purpose || 'register' // 'register' or 'reset'
  const [email, setEmail] = useState(emailFromState)
  const [purpose] = useState(purposeFromState)
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  const handleVerify = async () => {
    if (otp.length !== 6) return
    
    setIsLoading(true)

    try {
      if (purpose === 'reset') {
        const data = await verifyResetOtp({ email, otp })
        if (data?.success) {
          toast.success('Xác thực OTP thành công!')
          navigate('/reset-password', { state: { email } })
        } else {
          toast.error(data?.message || 'Xác thực thất bại')
          setOtp('')
        }
      } else {
        const data = await verifyOtp({ email, otp })
        if (data?.token) {
          setToken(data.token)
          if (data?.user) setUser(data.user)
          toast.success('Xác thực thành công!')
          setTimeout(() => navigate('/employee'), 1000)
        } else {
          toast.error('Xác thực thất bại')
          setOtp('')
        }
      }
    } catch (err) {
      toast.error(err.message || 'Xác thực OTP thất bại')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!canResend) return

    setIsLoading(true)
    try {
      await resendOtp({ email })
      toast.success('OTP đã được gửi lại.')
      setCountdown(60)
      setCanResend(false)
      setOtp('')
    } catch (err) {
      toast.error(err.message || 'Gửi lại OTP thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Xác thực OTP" 
      subtitle={`Mã OTP đã được gửi đến ${email}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Back Button */}
        <Link
          to={purpose === 'reset' ? '/forgot-password' : '/register'}
          className="flex items-center space-x-2 text-[var(--text-sub)] hover:text-[var(--accent-cyan)] transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại</span>
        </Link>

        {/* Info Box */}
        <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-[var(--accent-cyan)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[var(--text-sub)]">
                Vui lòng nhập mã OTP 6 số đã được gửi đến email của bạn.
              </p>
              <p className="text-xs text-[var(--text-sub)] mt-1 opacity-70">
                Mã OTP có hiệu lực trong 5 phút.
              </p>
            </div>
          </div>
        </div>

        {/* OTP Input */}
        <div className="flex flex-col items-center space-y-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <p className="text-sm text-[var(--text-main)]">
            {otp.length}/6 số
          </p>
        </div>

        {/* Verify Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleVerify}
            disabled={isLoading || otp.length !== 6}
            className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              'Xác thực OTP'
            )}
          </Button>
        </motion.div>

        {/* Resend OTP */}
        <div className="text-center space-y-2">
          {canResend ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleResendOTP}
              disabled={isLoading}
              className="text-sm text-[var(--accent-cyan)] hover:underline flex items-center justify-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Gửi lại mã OTP</span>
            </motion.button>
          ) : (
            <p className="text-sm text-[var(--text-sub)]">
              Gửi lại mã OTP sau{' '}
              <span className="text-[var(--accent-cyan)] font-medium">
                {countdown}s
              </span>
            </p>
          )}

          <p className="text-xs text-[var(--text-sub)] opacity-70">
            Không nhận được mã? Kiểm tra thư mục spam hoặc yêu cầu gửi lại.
          </p>
        </div>
      </motion.div>
    </AuthLayout>
  )
}
