import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { resendOtp, verifyOtp, verifyResetOtp } from '@/services/authService'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { ErrorWithMessage, LocationState } from '@/types'
import { getRoleBasePath, type UserRoleType } from '@/utils/roles'

export default function VerifyOtp() {
  const { t } = useTranslation(['auth', 'common'])
  const location = useLocation()
  const navigate = useNavigate()
  const { setToken, setUser } = useAuth()
  const emailFromState = (location.state as LocationState)?.email || ''
  const purposeFromState = (location.state as LocationState)?.purpose || 'register' // 'register' or 'reset'
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
          toast.success(t('auth:verifyOtp.verifySuccess'))
          navigate('/reset-password', { state: { email } })
        } else {
          toast.error(data?.message || t('auth:verifyOtp.verifyError'))
          setOtp('')
        }
      } else {
        const data = await verifyOtp({ email, otp })
        if (data?.token) {
          setToken(data.token)
          if (data?.user) setUser(data.user)
          toast.success(t('auth:verifyOtp.success'))
          const redirectPath = data?.user?.role 
            ? getRoleBasePath(data.user.role as UserRoleType)
            : '/employee'
          setTimeout(() => navigate(redirectPath), 1000)
        } else {
          toast.error(t('auth:verifyOtp.verifyError'))
          setOtp('')
        }
      }
    } catch (err) {
      const error = err as ErrorWithMessage
      toast.error(error.message || t('auth:verifyOtp.error'))
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
      toast.success(t('auth:verifyOtp.resendSuccess'))
      setCountdown(60)
      setCanResend(false)
      setOtp('')
    } catch (err) {
      const error = err as ErrorWithMessage
      toast.error(error.message || t('auth:verifyOtp.resendError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title={t('auth:verifyOtp.title')} 
      subtitle={`${t('auth:verifyOtp.subtitle')} ${email}`}
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
          <span>{t('auth:verifyOtp.back')}</span>
        </Link>

        {/* Info Box */}
        <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-[var(--accent-cyan)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[var(--text-sub)]">
                {t('auth:verifyOtp.info')}
              </p>
              <p className="text-xs text-[var(--text-sub)] mt-1 opacity-70">
                {t('auth:verifyOtp.expiry')}
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
            {otp.length}/6 {t('auth:verifyOtp.otpLength')}
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
                {t('auth:verifyOtp.submitting')}
              </>
            ) : (
              t('auth:verifyOtp.submit')
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
              <span>{t('auth:verifyOtp.resend')}</span>
            </motion.button>
          ) : (
            <p className="text-sm text-[var(--text-sub)]">
              {t('auth:verifyOtp.resendAfter')}{' '}
              <span className="text-[var(--accent-cyan)] font-medium">
                {countdown}s
              </span>
            </p>
          )}

          <p className="text-xs text-[var(--text-sub)] opacity-70">
            {t('auth:verifyOtp.notReceived')}
          </p>
        </div>
      </motion.div>
    </AuthLayout>
  )
}

