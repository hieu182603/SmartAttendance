import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import UpgradePage from '@/components/dashboard/pages/UpgradePage'
import PublicSiteLayout from '@/components/PublicSiteLayout'

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
    <PublicSiteLayout>
      <main className="container mx-auto px-6 py-10">
        <UpgradePage mode="catalog" />
      </main>
    </PublicSiteLayout>
  )
}
