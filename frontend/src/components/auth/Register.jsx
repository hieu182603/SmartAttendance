import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../AuthLayout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { register as registerApi } from '../../services/authService'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp!')
      return
    }
    if (!formData.agreeTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng')
      return
    }

    try {
      setSubmitting(true)
      await registerApi({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
      })
      navigate('/verify-otp', { state: { email: formData.email } })
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Đăng ký tài khoản" subtitle="Tạo tài khoản mới để bắt đầu">
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
            className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-[var(--text-main)]">
            Họ và tên
          </Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Nguyễn Văn A"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[var(--text-main)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@company.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
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
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-main)] focus:ring-[var(--primary)] focus:ring-2 focus:border-transparent"
            required
          />
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeTerms}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, agreeTerms: checked })
            }
          />
          <label
            htmlFor="terms"
            className="text-sm text-[var(--text-sub)] cursor-pointer leading-relaxed"
          >
            Tôi đồng ý với{' '}
            <a href="#" className="text-[var(--accent-cyan)] hover:underline">
              điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a href="#" className="text-[var(--accent-cyan)] hover:underline">
              chính sách bảo mật
            </a>
          </label>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/30"
          >
            {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>
        </motion.div>

        <p className="text-center text-sm text-[var(--text-sub)]">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-[var(--accent-cyan)] hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  )
}
