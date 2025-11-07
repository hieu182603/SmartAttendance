import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { resendOtp, verifyOtp } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setToken, setUser } = useAuth()
  const emailFromState = location.state?.email || ''
  const [email, setEmail] = useState(emailFromState)
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const onVerify = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      setSubmitting(true)
      const data = await verifyOtp({ email, otp })
      setMessage('Xác thực thành công!')
      if (data?.token) {
        setToken(data.token)
        if (data?.user) setUser(data.user)
        setTimeout(() => navigate('/'), 1000)
      } else {
        navigate('/login')
      }
    } catch (err) {
      setError(err.message || 'Xác thực OTP thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const onResend = async () => {
    setError('')
    setMessage('')
    try {
      await resendOtp({ email })
      setMessage('OTP đã được gửi lại. Vui lòng kiểm tra email.')
    } catch (err) {
      setError(err.message || 'Gửi lại OTP thất bại')
    }
  }

  return (
    <AuthLayout title="Xác thực OTP" subtitle="Nhập mã OTP đã gửi tới email">
      <motion.form
        onSubmit={onVerify}
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
          >
            {message}
          </motion.div>
        )}
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
          <Label htmlFor="otp" className="text-[var(--text-main)]">
            Mã OTP
          </Label>
          <Input
            id="otp"
            type="text"
            placeholder="Nhập OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onResend}
            className="text-sm text-[var(--accent-cyan)] hover:underline"
          >
            Gửi lại OTP
          </button>
          <Link
            to="/login"
            className="text-sm text-[var(--text-sub)] hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
          >
            {submitting ? 'Đang xác thực...' : 'Xác thực'}
          </Button>
        </motion.div>
      </motion.form>
    </AuthLayout>
  )
}
