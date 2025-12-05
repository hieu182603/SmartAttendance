import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '@/types'
import { getRoleBasePath, type UserRoleType } from '@/utils/roles'

export default function Login() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const { login, token, loading, user } = useAuth()

  const defaultRoute = useMemo(() => {
    if (!user?.role) return '/employee'
    return getRoleBasePath(user.role as UserRoleType)
  }, [user])

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && token) {
      navigate(defaultRoute, { replace: true })
    }
  }, [token, loading, navigate, defaultRoute])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim()
    if (!trimmed) return t('auth:login.emailRequired')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) return t('auth:login.emailInvalid')
    return undefined
  }

  const validatePassword = (password: string): string | undefined => {
    if (!password) return t('auth:login.passwordRequired')
    return undefined
  }

  const handleBlur = (field: 'email' | 'password') => {
    setTouched({ ...touched, [field]: true })
    const newErrors = { ...errors }
    
    if (field === 'email') {
      newErrors.email = validateEmail(email)
    } else if (field === 'password') {
      newErrors.password = validatePassword(password)
    }
    
    setErrors(newErrors)
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (errors.email) {
      setErrors({ ...errors, email: undefined })
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (errors.password) {
      setErrors({ ...errors, password: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ email: true, password: true })

    // Validate all fields
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setErrors(newErrors)

    // Check if form is valid
    if (newErrors.email || newErrors.password) {
      toast.error(t('auth:login.formValidationError'))
      return
    }

    setIsLoading(true)
    
    try {
      const data = await login({ email: email.trim(), password })
      toast.success(t('auth:login.success'))
      const nextRoute = data?.user?.role 
        ? getRoleBasePath(data.user.role as UserRoleType)
        : '/employee'
      navigate(nextRoute, { replace: true })
    } catch (err) {
      const error = err as ErrorWithMessage
      toast.error(error.message || t('auth:login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      title={t('auth:login.title')} 
      subtitle={t('auth:login.subtitle')}
      showBackButton={true}
      backTo="/"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[var(--text-main)]">{t('auth:login.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth:login.emailPlaceholder')}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={() => handleBlur('email')}
            className={`bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent ${
              touched.email && errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
            required
            disabled={isLoading}
          />
          {touched.email && errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500"
            >
              {errors.email}
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[var(--text-main)]">{t('auth:login.password')}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:login.passwordPlaceholder')}
              value={password}
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

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
            />
            <label htmlFor="remember" className="text-sm text-[var(--text-sub)] cursor-pointer">
              {t('auth:login.rememberMe')}
            </label>
          </div>
          <Link 
            to="/forgot-password"
            className="text-sm text-[var(--accent-cyan)] hover:underline"
          >
            {t('auth:login.forgotPassword')}
          </Link>
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
                {t('auth:login.submitting')}
              </>
            ) : (
              t('auth:login.submit')
            )}
          </Button>
        </motion.div>

        <p className="text-center text-sm text-[var(--text-sub)] mt-6">
          {t('auth:login.noAccount')}{' '}
          <Link
            to="/register"
            className="text-[var(--accent-cyan)] hover:underline"
          >
            {t('auth:login.register')}
          </Link>
        </p>
      </motion.form>
      </motion.div>
    </AuthLayout>
  )
}


