import React from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const SchedulePage = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle className="text-[var(--text-main)]">Lịch làm việc</CardTitle>
        <p className="text-sm text-[var(--text-sub)]">Theo dõi ca làm việc và lịch trình sắp tới.</p>
      </div>
      <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-sub)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]">
        Đồng bộ lịch
      </button>
    </CardHeader>
    <CardContent className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--shell)]/60 p-5 text-[var(--accent-cyan)]">
          <Calendar className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-[var(--text-main)]">Chưa có lịch làm việc được gán</p>
          <p className="text-sm text-[var(--text-sub)]">
            Khi phòng nhân sự cập nhật ca làm việc, thông tin sẽ hiển thị tại đây. Bạn có thể đồng bộ với lịch cá nhân
            để nhận thông báo nhắc nhở.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)

export default SchedulePage






