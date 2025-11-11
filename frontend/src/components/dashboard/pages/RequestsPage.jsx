import React from 'react'
import { FileText, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'

const RequestsPage = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle className="text-[var(--text-main)]">Yêu cầu nghỉ & làm thêm</CardTitle>
        <p className="text-sm text-[var(--text-sub)]">Tạo và theo dõi các yêu cầu của bạn.</p>
      </div>
      <button className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/10 px-3 py-2 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/20">
        <Plus className="h-4 w-4" />
        Tạo yêu cầu
      </button>
    </CardHeader>
    <CardContent className="space-y-6 py-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <FileText className="h-12 w-12 text-[var(--text-sub)]" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-[var(--text-main)]">Bạn chưa có yêu cầu nào</p>
          <p className="text-sm text-[var(--text-sub)]">
            Khi tạo yêu cầu nghỉ hoặc check-in ngoại lệ, trạng thái xử lý sẽ hiển thị tại đây.
          </p>
        </div>
        <Badge variant="warning">Nhấn “Tạo yêu cầu” để bắt đầu</Badge>
      </div>
    </CardContent>
  </Card>
)

export default RequestsPage





