import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng bạn quay trở lại">
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[var(--text-main)]">
            Mật khẩu
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
            />
            <label
              htmlFor="remember"
              className="text-sm text-[var(--text-sub)] cursor-pointer"
            >
              Ghi nhớ đăng nhập
            </label>
          </div>
          <button
            type="button"
            className="text-sm text-[var(--accent-cyan)] hover:underline"
          >
            Quên mật khẩu?
          </button>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </motion.div>

        <p className="text-center text-sm text-[var(--text-sub)] mt-6">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="text-[var(--accent-cyan)] hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  )
}
