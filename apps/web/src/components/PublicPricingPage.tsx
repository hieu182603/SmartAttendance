import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import UpgradePage from '@/components/dashboard/pages/UpgradePage'

export default function PublicPricingPage() {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent-cyan)] border-t-transparent" />
      </div>
    )
  }

  if (token) {
    return <Navigate to="/employee/upgrade" replace />
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--shell)]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-sub)] transition-colors hover:text-[var(--accent-cyan)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--accent-cyan)]" />
            <span className="text-lg font-semibold text-[var(--text-main)]">SmartAttendance</span>
          </div>
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--accent-cyan)] hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <UpgradePage mode="catalog" />
      </main>
    </div>
  )
}
