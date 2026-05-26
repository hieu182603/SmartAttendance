import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { companyService, type Company } from '@/services/companyService'
import { setSuperAdminCompanyFilter } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { UserRole } from '@/utils/roles'

interface SuperAdminContextValue {
  companies: Company[]
  selectedCompanyId: string | null
  selectedCompany: Company | null
  setSelectedCompanyId: (id: string | null) => void
  loadingCompanies: boolean
}

const SuperAdminContext = createContext<SuperAdminContextValue>({
  companies: [],
  selectedCompanyId: null,
  selectedCompany: null,
  setSelectedCompanyId: () => undefined,
  loadingCompanies: false,
})

export const SuperAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  const setSelectedCompanyId = useCallback((id: string | null) => {
    setSelectedCompanyIdState(id)
    setSuperAdminCompanyFilter(id)
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    setLoadingCompanies(true)
    companyService
      .list({ limit: 200 })
      .then(res => setCompanies(res.data))
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCompanies(false))
  }, [isSuperAdmin])

  // Sync axios filter on mount (in case context re-mounts)
  useEffect(() => {
    setSuperAdminCompanyFilter(selectedCompanyId)
  }, [selectedCompanyId])

  const selectedCompany = companies.find(c => c._id === selectedCompanyId) ?? null

  return (
    <SuperAdminContext.Provider value={{ companies, selectedCompanyId, selectedCompany, setSelectedCompanyId, loadingCompanies }}>
      {children}
    </SuperAdminContext.Provider>
  )
}

export const useSuperAdminFilter = () => useContext(SuperAdminContext)
