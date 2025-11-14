import React from 'react'
import { History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const HistoryPage = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-[var(--text-main)]">Lịch sử chấm công</CardTitle>
      <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-sub)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]">
        Xuất báo cáo
      </button>
    </CardHeader>
    <CardContent className="space-y-6 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-[var(--primary)]/10 p-4 text-[var(--primary)]">
          <History className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-[var(--text-main)]">Theo dõi mọi lần điểm danh của bạn</p>
          <p className="text-sm leading-relaxed text-[var(--text-sub)]">
            Các bản ghi chính xác sẽ xuất hiện ở đây khi hệ thống đồng bộ dữ liệu từ máy chấm công hoặc ứng dụng di
            động.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default HistoryPage






