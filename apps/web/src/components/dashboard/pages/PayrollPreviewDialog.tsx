import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  previewPayroll,
  type PayrollPreview,
  type PayrollBreakdownItem,
} from "@/services/payrollService";
import {
  Loader2,
  Wallet,
  Building2,
  Briefcase,
  CalendarDays,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface PayrollPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  month: string;
  onConfirmGenerate?: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const SALARY_SOURCE_LABEL: Record<string, string> = {
  USER_OVERRIDE: "Thiết lập riêng",
  SALARY_MATRIX: "Thang lương",
  DEPT_DEFAULT: "Mặc định phòng ban",
  POS_DEFAULT: "Mặc định chức vụ",
  GLOBAL_DEFAULT: "Mặc định hệ thống",
};

type RowTone = "income" | "deduction" | "neutral" | "highlight";

const getRowTone = (row: PayrollBreakdownItem): RowTone => {
  const label = row.label.toLowerCase();
  if (label.includes("thực lĩnh") || label.includes("gross")) return "highlight";
  if (
    row.value < 0 ||
    label.includes("khấu trừ") ||
    label.includes("bhxh") ||
    label.includes("thuế")
  )
    return "deduction";
  if (row.value > 0 && !label.includes("ngày công")) return "income";
  return "neutral";
};

const toneAmount: Record<RowTone, string> = {
  income: "text-[var(--success)]",
  deduction: "text-[var(--error)]",
  highlight: "text-[var(--accent-cyan)]",
  neutral: "text-[var(--text-main)]",
};

const SOURCE_TAG_RE =
  /\s*\[(USER_OVERRIDE|SALARY_MATRIX|DEPT_DEFAULT|POS_DEFAULT|GLOBAL_DEFAULT)\]/g;

const formatFormulaForDisplay = (formula: string): string => {
  if (!formula?.trim()) return "—";

  const sourceMatch = formula.match(
    /\[(USER_OVERRIDE|SALARY_MATRIX|DEPT_DEFAULT|POS_DEFAULT|GLOBAL_DEFAULT)\]/
  );
  const withoutTags = formula.replace(SOURCE_TAG_RE, "").trim();

  if (sourceMatch && (!withoutTags || /^[\d.,\s]+$/.test(withoutTags))) {
    return SALARY_SOURCE_LABEL[sourceMatch[1]] ?? withoutTags;
  }

  const cleaned = withoutTags
    .replace(/\bactualBase\b/gi, "lương ngày công")
    .replace(/\bOT\b/g, "tăng ca")
    .replace(/\bgross\b/gi, "lương gộp")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s*-\s*/g, " − ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "—";
};

export function PayrollPreviewDialog({
  open,
  onOpenChange,
  userId,
  userName,
  month,
  onConfirmGenerate,
}: PayrollPreviewDialogProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId || !month) return;
    setLoading(true);
    setPreview(null);
    previewPayroll(userId, month)
      .then(setPreview)
      .catch((err) => {
        toast.error(
          err?.response?.data?.message ||
            t("dashboard:payrollPreview.toasts.loadError")
        );
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, userId, month, onOpenChange, t]);

  const displayMonth = month
    ? `${month.slice(5, 7)}/${month.slice(0, 4)}`
    : "";

  const netAmount = useMemo(() => {
    if (!preview) return 0;
    const netRow = preview.breakdown.find((r) =>
      r.label.toLowerCase().includes("thực lĩnh")
    );
    return netRow?.value ?? preview.salary.totalSalary ?? 0;
  }, [preview]);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,860px)] w-[min(98vw,1120px)] max-w-[1120px] flex-col overflow-hidden border-[var(--border)] bg-[var(--background)] p-0 text-[var(--text-main)] shadow-2xl">
        {/* Compact top bar */}
        <DialogHeader className="shrink-0 border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-cyan)] text-sm font-bold text-white">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                {t("dashboard:payrollPreview.title")}
              </DialogTitle>
              <p className="truncate text-sm text-[var(--text-sub)]">
                <span className="font-medium text-[var(--text-main)]">
                  {userName}
                </span>
                {" · "}
                {t("dashboard:payrollPreview.month")} {displayMonth}
                {preview && (
                  <>
                    {" · "}
                    {SALARY_SOURCE_LABEL[preview.salary.salarySource] ??
                      preview.salary.salarySource}
                  </>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Horizontal body */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[420px] items-center justify-center gap-3"
              >
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-cyan)]" />
                <span className="text-sm text-[var(--text-sub)]">
                  {t("dashboard:payrollPreview.loading")}
                </span>
              </motion.div>
            )}

            {preview && !loading && (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid h-full min-h-[420px] grid-cols-1 md:grid-cols-[300px_1fr]"
              >
                {/* Left — summary */}
                <aside className="flex flex-col gap-3 border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
                  <div className="rounded-xl border border-[var(--accent-cyan)]/30 bg-gradient-to-br from-[var(--shell)] to-[var(--surface)] p-3">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      <Wallet className="h-3 w-3 text-[var(--accent-cyan)]" />
                      Thực lĩnh
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-[var(--accent-cyan)]">
                      {formatCurrency(netAmount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Ngày công",
                        value: `${preview.attendance.workDays}/${preview.attendance.totalDays}`,
                        icon: CalendarDays,
                      },
                      {
                        label: "Giờ OT",
                        value: preview.attendance.overtimeHours,
                        icon: Clock,
                      },
                      {
                        label: "Đi muộn",
                        value: preview.attendance.lateDays,
                        icon: AlertTriangle,
                      },
                      {
                        label: "Nghỉ",
                        value: preview.attendance.leaveDays,
                        icon: CalendarDays,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div
                        key={label}
                        className="rounded-lg border border-[var(--border)] bg-[var(--shell)]/80 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-[var(--text-sub)]">
                          <Icon className="h-2.5 w-2.5" />
                          {label}
                        </div>
                        <p className="text-sm font-semibold tabular-nums">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--text-sub)]">
                    <p className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3 w-3 shrink-0 text-[var(--accent-cyan)]" />
                      {preview.department}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Briefcase className="h-3 w-3 shrink-0 text-[var(--accent-cyan)]" />
                      {preview.position}
                    </p>
                  </div>

                </aside>

                {/* Right — breakdown table */}
                <section className="flex min-h-0 flex-col p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-sub)]">
                    Chi tiết tính lương
                  </p>
                  <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--border)]">
                    <Table className="w-full table-fixed">
                      <TableHeader>
                        <TableRow className="border-[var(--border)] hover:bg-transparent">
                          <TableHead className="h-9 w-[22%] text-xs text-[var(--text-sub)]">
                            Khoản mục
                          </TableHead>
                          <TableHead className="h-9 text-xs text-[var(--text-sub)]">
                            Công thức
                          </TableHead>
                          <TableHead className="h-9 w-[24%] shrink-0 text-right text-xs text-[var(--text-sub)]">
                            Số tiền
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.breakdown.map((row, i) => {
                          const tone = getRowTone(row);
                          const isHighlight = tone === "highlight";
                          return (
                            <TableRow
                              key={`${row.label}-${i}`}
                              className={`border-[var(--border)] ${
                                isHighlight
                                  ? "bg-[var(--accent-cyan)]/10 font-semibold"
                                  : "hover:bg-[var(--shell)]/80"
                              }`}
                            >
                              <TableCell
                                className={`py-2 text-xs ${
                                  isHighlight
                                    ? "text-[var(--accent-cyan)]"
                                    : "text-[var(--text-main)]"
                                }`}
                              >
                                {row.label}
                              </TableCell>
                              <TableCell className="py-2 text-xs leading-snug text-[var(--text-sub)]">
                                {formatFormulaForDisplay(row.formula)}
                              </TableCell>
                              <TableCell
                                className={`py-2 text-right text-xs font-semibold tabular-nums ${toneAmount[tone]}`}
                              >
                                {row.value < 0
                                  ? `−${formatCurrency(Math.abs(row.value))}`
                                  : formatCurrency(row.value)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-[var(--border)] bg-[var(--shell)]/40 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[var(--border)]"
          >
            {t("dashboard:payrollPreview.actions.close")}
          </Button>
          {onConfirmGenerate && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onConfirmGenerate();
              }}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white hover:opacity-90"
            >
              {t("dashboard:payrollPreview.actions.generate")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
