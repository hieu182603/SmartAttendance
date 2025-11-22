import React from 'react'
import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const CameraCheckinPage: React.FC = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-[var(--text-main)]">Chấm công bằng Camera AI</CardTitle>
      <p className="text-sm text-[var(--text-sub)]">Nhận diện khuôn mặt để xác thực điểm danh.</p>
    </CardHeader>
    <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--shell)]/60 p-6 text-[var(--accent-cyan)] shadow-inner">
        <Camera className="h-12 w-12" />
      </div>
      <div className="space-y-3">
        <p className="text-lg font-semibold text-[var(--text-main)]">
          Tính năng sẽ sẵn sàng khi cấu hình camera hoàn tất
        </p>
        <p className="text-sm leading-relaxed text-[var(--text-sub)]">
          Camera được cấu hình tại văn phòng của bạn sẽ xác thực tự động. Vui lòng đảm bảo nguồn sáng đủ và khuôn mặt
          trong khung hình.
        </p>
      </div>
      <button className="rounded-xl border border-[var(--accent-cyan)] px-5 py-3 text-sm font-medium text-[var(--accent-cyan)] transition hover:bg-[var(--accent-cyan)]/10">
        Kiểm tra cấu hình
      </button>
    </CardContent>
  </Card>
)

export default CameraCheckinPage




