import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getRequestTypes, createRequest as createRequestApi, getMyRequests } from "@/services/requestService";
import shiftService from "@/services/shiftService";
import { getLeaveBalance } from "@/services/dashboardService";
import { toast } from "sonner";
import type { RequestType as RequestTypeOption } from "@/services/requestService";
import type { ErrorWithMessage } from "@/types";

const FALLBACK_REQUEST_TYPES = [
  { value: "leave", label: "Nghỉ phép thường" },
  { value: "sick", label: "Nghỉ ốm" },
  { value: "unpaid", label: "Nghỉ không lương" },
  { value: "maternity", label: "Nghỉ thai sản" },
  { value: "overtime", label: "Làm thêm giờ (OT)" }
];

interface DateRange {
  start: string;
  end: string;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultType?: string;
}

export function CreateRequestModal({ isOpen, onOpenChange, onSuccess, defaultType = "" }: CreateRequestModalProps) {
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];

  const [requestType, setRequestType] = useState<string>(defaultType);
  const [requestReason, setRequestReason] = useState("");
  const [requestOvertimeHours, setRequestOvertimeHours] = useState<number | "">("");
  const [requestDateRange, setRequestDateRange] = useState<DateRange>({
    start: today,
    end: today,
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [requestedDays, setRequestedDays] = useState(0);

  const [requestTypes, setRequestTypes] = useState<RequestTypeOption[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch required data
      fetchData();
    }
  }, [isOpen]);

  // When requestTypes or defaultType changes, update the initial selection
  useEffect(() => {
    if (isOpen) {
      setRequestType(defaultType || (requestTypes.length > 0 ? requestTypes[0].value : "leave"));
      setRequestReason("");
      setRequestOvertimeHours("");
      setRequestDateRange({ start: today, end: today });
    }
  }, [isOpen, defaultType, requestTypes, today]);

  const fetchData = async () => {
    try {
      const [typesRes, balanceRes, requestsRes] = await Promise.all([
        getRequestTypes().catch(() => ({ types: [] })),
        getLeaveBalance().catch(() => []),
        getMyRequests({ limit: 1000 }).catch(() => ({ requests: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }))
      ]);

      if (typesRes && 'types' in typesRes && typesRes.types?.length) {
        setRequestTypes(typesRes.types);
      }
      
      if (Array.isArray(balanceRes)) {
        setLeaveBalance(balanceRes);
      } else if (balanceRes && typeof balanceRes === 'object') {
        const balanceArray: any[] = [];
        const b = balanceRes as any;
        if (b.annual) balanceArray.push({ id: 'annual', ...b.annual });
        if (b.sick) balanceArray.push({ id: 'sick', ...b.sick });
        if (b.unpaid) balanceArray.push({ id: 'unpaid', ...b.unpaid });
        if (b.maternity) balanceArray.push({ id: 'maternity', ...b.maternity });
        setLeaveBalance(balanceArray);
      }
      
      if (requestsRes && 'requests' in requestsRes && requestsRes.requests) {
        setAllRequests(requestsRes.requests);
      }
    } catch (error) {
      console.error("Failed to fetch modal data:", error);
    }
  };

  const hasConflict = useMemo(() => {
    if (!requestDateRange.start || requestType === "overtime") return false;
    const reqStart = new Date(requestDateRange.start);
    reqStart.setHours(0, 0, 0, 0);
    const reqEnd = requestDateRange.end ? new Date(requestDateRange.end) : new Date(requestDateRange.start);
    reqEnd.setHours(23, 59, 59, 999);
    
    return allRequests.some(req => {
      if (req.status !== 'pending' && req.status !== 'approved') return false;
      if (req.type === 'overtime') return false;
      const existingStart = new Date(req.startDate);
      existingStart.setHours(0, 0, 0, 0);
      const existingEnd = new Date(req.endDate);
      existingEnd.setHours(23, 59, 59, 999);
      return (reqStart <= existingEnd && reqEnd >= existingStart);
    });
  }, [requestDateRange, allRequests, requestType]);

  useEffect(() => {
    const fetchRequestedDays = async () => {
      if (!requestDateRange.start) {
        setRequestedDays(0);
        return;
      }
      const start = requestDateRange.start;
      const end = requestDateRange.end || requestDateRange.start;
      try {
        const schedule = await shiftService.getMySchedule(start, end);
        const count = schedule.filter((s: any) => s.shiftId && s.status !== 'off').length;
        setRequestedDays(count);
      } catch (err) {
        console.error("Failed to fetch schedule for calculate days", err);
        setRequestedDays(0);
      }
    };
    fetchRequestedDays();
  }, [requestDateRange.start, requestDateRange.end]);

  const handleCreateRequest = async () => {
    if (!requestType) {
      toast.error(t('dashboard:requests.dialog.validation.type'));
      return;
    }
    if (requestReason.trim().length < 10) {
      toast.error("Vui lòng nhập lý do chi tiết (tối thiểu 10 ký tự)");
      return;
    }
    if (!requestDateRange.start) {
      toast.error("Vui lòng chọn ngày bắt đầu");
      return;
    }
    
    if (requestType !== "overtime") {
      const start = new Date(requestDateRange.start);
      const end = requestDateRange.end ? new Date(requestDateRange.end) : start;
      if (end < start) {
        toast.error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu");
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: any = {
        type: requestType,
        startDate: requestDateRange.start,
        endDate: requestType === "overtime" ? requestDateRange.start : (requestDateRange.end || requestDateRange.start),
        reason: requestReason.trim(),
      };
      
      if (requestType === "overtime" && requestOvertimeHours) {
        payload.overtimeHours = Number(requestOvertimeHours);
      }

      await createRequestApi(payload);
      toast.success(t('dashboard:requests.dialog.createSuccess'));
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      const err = error as ErrorWithMessage;
      toast.error(err.response?.data?.message || err.message || t('dashboard:requests.dialog.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
        <DialogHeader>
          <DialogTitle>{t('dashboard:requests.dialog.title')}</DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            {t('dashboard:requests.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t('dashboard:requests.type')}</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger className="border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-main)]">
                <SelectValue placeholder={t('dashboard:requests.dialog.selectType')} />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                {(requestTypes.length ? requestTypes : FALLBACK_REQUEST_TYPES).map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(requestType === "leave" || requestType === "sick" || requestType === "maternity") && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)] p-3">
                {leaveBalance.length > 0 ? (
                  (() => {
                    const leaveTypeMap: Record<string, string> = {
                      "leave": "annual",
                      "sick": "sick",
                      "maternity": "maternity"
                    };
                    const leaveBalanceId = leaveTypeMap[requestType];
                    const leaveType = leaveBalance.find((lb) => lb.id === leaveBalanceId);
                    
                    if (!leaveType) {
                      return <p className="text-sm text-[var(--text-sub)]">Không tìm thấy thông tin ngày phép</p>;
                    }
                    
                    const remaining = leaveType.remaining ?? 0;
                    const isValid = requestedDays === 0 || remaining === null || remaining === undefined || requestedDays <= remaining;
                    
                    const leaveTypeName = requestType === "leave" ? t('dashboard:requests.types.leave') : requestType === "sick" ? "Nghỉ ốm" : "Nghỉ thai sản";
                    
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-sub)]">Số ngày {leaveTypeName.toLowerCase()} còn lại:</span>
                          <span className={`font-semibold ${remaining > 0 || remaining === null || remaining === undefined ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                            {remaining === null || remaining === undefined ? '∞' : remaining} ngày
                          </span>
                        </div>
                        {requestedDays > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-sub)]">Số ngày yêu cầu:</span>
                            <span className={`font-semibold ${isValid && !hasConflict ? 'text-[var(--text-main)]' : 'text-[var(--error)]'}`}>
                              {hasConflict ? 0 : requestedDays} ngày
                            </span>
                          </div>
                        )}
                        {requestedDays > 0 && !isValid && remaining !== null && remaining !== undefined && (
                          <p className="text-xs text-[var(--error)] mt-1">Số ngày yêu cầu vượt quá số ngày còn lại</p>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-[var(--text-sub)]">Đang tải thông tin ngày phép...</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('dashboard:requests.dialog.startDate')}</Label>
              <Input
                type="date"
                min={today}
                value={requestDateRange.start}
                onChange={(e) => setRequestDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-main)]"
              />
            </div>
            {requestType !== "overtime" && (
              <div className="space-y-2">
                <Label>{t('dashboard:requests.dialog.endDate')}</Label>
                <Input
                  type="date"
                  min={requestDateRange.start || today}
                  value={requestDateRange.end}
                  onChange={(e) => setRequestDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-main)]"
                />
              </div>
            )}
          </div>

          {hasConflict && (
            <div className="text-sm text-[var(--error)] bg-[var(--error)]/10 p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Đã có yêu cầu khác (Chờ duyệt hoặc Đã duyệt) trùng với khoảng thời gian này.
            </div>
          )}
          
          {requestType === "overtime" && (
            <div className="space-y-2">
              <Label>Số giờ tăng ca (tuỳ chọn)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={requestOvertimeHours}
                onChange={(e) => setRequestOvertimeHours(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ví dụ: 4"
                className="border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-main)]"
              />
              <p className="text-xs text-[var(--text-sub)]">Nếu để trống, hệ thống sẽ tự tính toán.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('dashboard:requests.reason')}</Label>
            <Textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder={t('dashboard:requests.dialog.reasonPlaceholder')}
              className="min-h-[120px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-main)]"
            />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button disabled={isSubmitting} variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isSubmitting || hasConflict} onClick={handleCreateRequest} className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:opacity-90">
            {isSubmitting ? t('dashboard:requests.dialog.submitting') : t('dashboard:requests.dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
