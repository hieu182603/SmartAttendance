import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createLeaveRequest } from '@/services/leaveService'
import { toast } from 'sonner'
import type { ErrorWithMessage } from '@/types'

interface LeaveRequestFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const LEAVE_TYPES = [
  { value: 'leave', label: 'Nghỉ phép năm' },
  { value: 'sick', label: 'Nghỉ ốm' },
  { value: 'unpaid', label: 'Nghỉ không lương' },
  { value: 'compensatory', label: 'Nghỉ bù' },
  { value: 'maternity', label: 'Nghỉ thai sản' },
] as const

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [type, setType] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type || !startDate || !reason) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (endDate && endDate < startDate) {
      toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu')
      return
    }

    setSubmitting(true)
    try {
      await createLeaveRequest({
        type: type as 'leave' | 'sick' | 'unpaid' | 'compensatory' | 'maternity',
        startDate,
        endDate: endDate || startDate,
        reason: reason.trim(),
      })
      toast.success('Đã gửi đơn nghỉ phép thành công')
      setType('')
      setStartDate('')
      setEndDate('')
      setReason('')
      onSuccess?.()
    } catch (error) {
      const err = error as ErrorWithMessage
      toast.error(err.message || 'Không thể gửi đơn nghỉ phép')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[var(--text-main)]">Loại nghỉ *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="border-[var(--border)] bg-[var(--input-bg)]">
            <SelectValue placeholder="Chọn loại nghỉ" />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((leaveType) => (
              <SelectItem key={leaveType.value} value={leaveType.value}>
                {leaveType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[var(--text-main)]">Ngày bắt đầu *</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-[var(--border)] bg-[var(--input-bg)]"
            required
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[var(--text-main)]">Ngày kết thúc</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-[var(--border)] bg-[var(--input-bg)]"
            min={startDate || undefined}
            disabled={submitting}
          />
          {!endDate && (
            <p className="text-xs text-[var(--text-sub)] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Để trống nếu nghỉ 1 ngày
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-main)]">Lý do *</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do nghỉ phép..."
          className="min-h-[100px] border-[var(--border)] bg-[var(--input-bg)]"
          required
          disabled={submitting}
        />
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-[var(--border)] text-[var(--text-main)]"
            disabled={submitting}
          >
            Hủy
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting || !type || !startDate || !reason}
          className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
        >
          {submitting ? 'Đang gửi...' : 'Gửi đơn'}
        </Button>
      </div>
    </form>
  )
}

