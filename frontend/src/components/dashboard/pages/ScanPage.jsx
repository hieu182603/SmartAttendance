import React from 'react'
import { motion } from 'framer-motion'
import { QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'

const ScanPage = () => (
  <Card className="border-[var(--border)] bg-[var(--surface)]">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-[var(--text-main)]">Quét mã QR</CardTitle>
      <p className="text-sm text-[var(--text-sub)]">
        Sử dụng tính năng quét QR để xác nhận thời gian làm việc của bạn.
      </p>
    </CardHeader>
    <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
      <motion.div
        className="inline-flex h-28 w-28 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"
        animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <QrCode className="h-14 w-14" />
      </motion.div>
      <div className="space-y-3">
        <p className="text-lg font-semibold text-[var(--text-main)]">
          Camera của bạn sẽ hoạt động khi bắt đầu quét
        </p>
        <p className="text-sm leading-relaxed text-[var(--text-sub)]">
          Nhấn nút bên dưới để mở trình quét QR. Hệ thống sẽ tự động ghi nhận thời gian check-in/check-out của bạn khi
          quét thành công.
        </p>
      </div>
      <button className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[var(--primary)]/30 transition hover:opacity-90">
        Bắt đầu quét
      </button>
    </CardContent>
  </Card>
)

export default ScanPage





