import React from 'react'
import { cn } from '@/components/ui/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSuperAdminFilter } from '@/context/SuperAdminContext'

const PLAN_LABELS: Record<string, string> = {
  premium: 'Premium',
  standard: 'Standard',
  starter: 'Starter',
  trial: 'Trial',
}

interface CompanySelectorProps {
  variant?: 'default' | 'filter'
  /** filter: inline = 200px trên desktop; grid = full width trong cột grid */
  filterLayout?: 'inline' | 'grid'
  className?: string
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  variant = 'default',
  filterLayout = 'inline',
  className,
}) => {
  const { companies, selectedCompanyId, setSelectedCompanyId, loadingCompanies } = useSuperAdminFilter()
  const isFilter = variant === 'filter'
  const selectValue = selectedCompanyId ?? 'all'

  return (
    <div
      className={cn(
        'relative min-w-0',
        isFilter
          ? filterLayout === 'grid'
            ? 'w-full min-w-0'
            : 'w-full md:w-[200px] shrink-0'
          : 'w-full max-w-[280px]',
        className,
      )}
    >
      <Select
        value={selectValue}
        onValueChange={v => setSelectedCompanyId(v === 'all' ? null : v)}
        disabled={loadingCompanies}
      >
        <SelectTrigger className="w-full bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
          <SelectValue
            placeholder={
              loadingCompanies
                ? 'Đang tải…'
                : isFilter
                  ? 'Lọc theo công ty'
                  : 'Tất cả công ty'
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
          <SelectItem value="all">Tất cả công ty</SelectItem>
          {companies.map(company => (
            <SelectItem key={company._id} value={company._id}>
              <span className="truncate">
                {company.name}
                <span className="text-[var(--text-sub)] ml-1">
                  [{PLAN_LABELS[company.plan] ?? company.plan}]
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default CompanySelector
