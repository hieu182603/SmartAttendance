import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const statItems = [
  { label: 'Ngày phép còn lại', value: '—', description: 'Chờ dữ liệu từ phòng nhân sự' },
  { label: 'Ngày phép đã dùng', value: '—', description: 'Sẽ hiển thị khi có dữ liệu' },
  { label: 'Ngày phép tạm ứng', value: '—', description: 'Liên hệ quản lý để cập nhật' },
]

const LeaveBalancePage = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-[var(--text-main)]">Ngày phép</CardTitle>
      <p className="text-sm text-[var(--text-sub)]">Theo dõi quyền lợi và ngày phép đã sử dụng.</p>
    </CardHeader>
    <CardContent className="grid gap-4 py-8 sm:grid-cols-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[var(--border)] bg-[var(--shell)]/60 p-5 transition hover:border-[var(--accent-cyan)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--text-sub)]">{item.label}</p>
            <CheckCircle2 className="h-5 w-5 text-[var(--accent-cyan)]" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--text-main)]">{item.value}</p>
          <p className="mt-2 text-xs text-[var(--text-sub)]">{item.description}</p>
        </div>
      ))}
    </CardContent>
  </Card>
)

export default LeaveBalancePage






