import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { forgotPassword } from '@/services/authService'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '@/types'

export default function ForgotPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [touched, setTouched] = useState(false)

  // Validation function
  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim()
    if (!trimmed) return t('auth:forgotPassword.emailRequired')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) return t('auth:forgotPassword.emailInvalid')
    return undefined
  }

  const handleBlur = () => {
    setTouched(true)
    setError(validateEmail(email))
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (error) {
      setError(undefined)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Mark as touched
    setTouched(true)

    // Validate email
    const emailError = validateEmail(email)
    setError(emailError)

    if (emailError) {
      toast.error(t('auth:forgotPassword.formValidationError'))
      return
    }

    setIsLoading(true)

    try {
      const response = await forgotPassword({ email: email.trim() })
      
      if (response.success) {
        toast.success(response.message || t('auth:forgotPassword.success'))
        navigate('/verify-reset-otp', { state: { email: email.trim(), purpose: 'reset' } })
      } else {
        toast.error(response.message || t('auth:forgotPassword.genericError'))
      }
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || t('auth:forgotPassword.genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title={t('auth:forgotPassword.title')} 
      subtitle={t('auth:forgotPassword.subtitle')}
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
          <span>{t('auth:forgotPassword.backToLogin')}</span>
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Box */}
          <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-[var(--accent-cyan)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text-sub)]">
                {t('auth:forgotPassword.info')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--text-main)]">
              {t('auth:forgotPassword.email')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleBlur}
              className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent ${
                touched && error ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              required
              disabled={isLoading}
            />
            {touched && error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {error}
              </motion.p>
            )}
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
                  {t('auth:forgotPassword.submitting')}
                </>
              ) : (
                t('auth:forgotPassword.submit')
              )}
            </Button>
          </motion.div>

          {/* Help Text */}
          <div className="text-center space-y-2">
            <p className="text-sm text-[var(--text-sub)]">
              {t('auth:forgotPassword.rememberPassword')}{' '}
              <Link
                to="/login"
                className="text-[var(--accent-cyan)] hover:underline"
              >
                {t('auth:forgotPassword.loginNow')}
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </AuthLayout>
  )
}

