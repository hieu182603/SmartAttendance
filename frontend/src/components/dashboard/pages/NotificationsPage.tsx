import React from 'react'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const NotificationsPage: React.FC = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-[var(--text-main)]">Thông báo</CardTitle>
      <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-sub)] transition hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]">
        Đánh dấu đã đọc
      </button>
    </CardHeader>
    <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="rounded-full bg-[var(--warning)]/15 p-4 text-[var(--warning)]">
        <Bell className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-[var(--text-main)]">Bạn chưa có thông báo mới</p>
        <p className="text-sm leading-relaxed text-[var(--text-sub)]">
          Khi có cập nhật từ hệ thống, quản lý hoặc phòng nhân sự, thông báo sẽ xuất hiện tại đây để bạn theo dõi kịp
          thời.
        </p>
      </div>
    </CardContent>
  </Card>
)

export default NotificationsPage




