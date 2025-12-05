import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { resetPassword } from '@/services/authService'
import { toast } from 'sonner'
import type { ErrorWithMessage, LocationState } from '@/types'

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
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({})

  // Validation functions
  const validatePassword = (password: string): string | undefined => {
    if (!password) return t('auth:resetPassword.passwordRequired')
    if (password.length < 8) return t('auth:resetPassword.passwordMinLength')
    if (!/[A-Z]/.test(password)) return t('auth:resetPassword.passwordHasUpperCase')
    if (!/[a-z]/.test(password)) return t('auth:resetPassword.passwordHasLowerCase')
    if (!/[0-9]/.test(password)) return t('auth:resetPassword.passwordHasNumber')
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return t('auth:resetPassword.passwordHasSpecialChar')
    return undefined
  }

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) return t('auth:resetPassword.confirmPasswordRequired')
    if (confirmPassword !== password) return t('auth:resetPassword.passwordsNotMatch')
    return undefined
  }

  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched({ ...touched, [field]: true })
    const newErrors = { ...errors }
    
    if (field === 'password') {
      newErrors.password = validatePassword(formData.password)
      // Re-validate confirm password if it's already filled
      if (formData.confirmPassword) {
        newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password)
      }
    } else if (field === 'confirmPassword') {
      newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password)
    }
    
    setErrors(newErrors)
  }

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value })
    if (errors.password) {
      setErrors({ ...errors, password: undefined })
    }
    // Re-validate confirm password when password changes
    if (formData.confirmPassword) {
      const confirmError = validateConfirmPassword(formData.confirmPassword, value)
      setErrors({ ...errors, confirmPassword: confirmError })
    }
  }

  const handleConfirmPasswordChange = (value: string) => {
    setFormData({ ...formData, confirmPassword: value })
    if (errors.confirmPassword) {
      setErrors({ ...errors, confirmPassword: undefined })
    }
  }

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

    // Mark all fields as touched
    setTouched({ password: true, confirmPassword: true })

    // Validate all fields
    const newErrors = {
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password),
    }

    setErrors(newErrors)

    // Check if form is valid
    if (newErrors.password || newErrors.confirmPassword) {
      toast.error(t('auth:resetPassword.formValidationError'))
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
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent pr-10 ${
                  touched.password && errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
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
            {touched.password && errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {errors.password}
              </motion.p>
            )}
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
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent pr-10 ${
                  touched.confirmPassword && errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''
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
            {touched.confirmPassword && errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500"
              >
                {errors.confirmPassword}
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

