import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from './AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { resetPassword } from '../../services/authService'
import { toast } from 'sonner'
import type { ErrorWithMessage, LocationState } from '../../types'

interface FormData {
  password: string
  confirmPassword: string
}

export default function ResetPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const location = useLocation()
  const navigate = useNavigate()
  const email = (location.state as LocationState)?.email || ''
  const [formData, setFormData] = useState<FormData>({
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast.error(t('auth:resetPassword.weakPassword'))
      return
    }

    if (!passwordsMatch) {
      toast.error(t('auth:resetPassword.confirmPasswordNotMatch'))
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPassword({ email, password: formData.password })
      
      if (response.success) {
        toast.success(response.message || t('auth:resetPassword.success'))
        navigate('/login')
      } else {
        toast.error(response.message || t('auth:resetPassword.genericError'))
      }
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || t('auth:resetPassword.genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title={t('auth:resetPassword.title')} 
      subtitle={t('auth:resetPassword.subtitle')}
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
              {t('auth:resetPassword.resetFor')} <span className="text-[var(--accent-cyan)] font-medium">{email}</span>
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--text-main)]">
              {t('auth:resetPassword.password')}
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
              <p className="text-sm text-[var(--text-sub)]">{t('auth:resetPassword.passwordRequirements')}</p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: t('auth:resetPassword.minLength'), valid: passwordStrength.hasMinLength },
                  { label: t('auth:resetPassword.hasUpperCase'), valid: passwordStrength.hasUpperCase },
                  { label: t('auth:resetPassword.hasLowerCase'), valid: passwordStrength.hasLowerCase },
                  { label: t('auth:resetPassword.hasNumber'), valid: passwordStrength.hasNumber },
                  { label: t('auth:resetPassword.hasSpecialChar'), valid: passwordStrength.hasSpecialChar },
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
              {t('auth:resetPassword.confirmPassword')}
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
                {t('auth:resetPassword.confirmPasswordNotMatch')}
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
                  {t('auth:resetPassword.submitting')}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('auth:resetPassword.submit')}
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </AuthLayout>
  )
}

