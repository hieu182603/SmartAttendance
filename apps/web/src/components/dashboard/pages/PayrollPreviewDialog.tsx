import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { previewPayroll, type PayrollPreview } from "@/services/payrollService";
import { Loader2, Info } from "lucide-react";
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
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const SALARY_SOURCE_LABEL: Record<string, string> = {
  USER_OVERRIDE: "Thiết lập riêng",
  SALARY_MATRIX: "Thang lương",
  DEPT_DEFAULT: "Mặc định phòng ban",
  POS_DEFAULT: "Mặc định chức vụ",
  GLOBAL_DEFAULT: "Mặc định hệ thống",
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
  }, [open, userId, month]);

  const displayMonth = month
    ? `${month.slice(5, 7)}/${month.slice(0, 4)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-main)]">
            {t("dashboard:payrollPreview.title")}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            {userName} — {t("dashboard:payrollPreview.month")} {displayMonth}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-cyan)]" />
            <span className="text-[var(--text-sub)]">
              {t("dashboard:payrollPreview.loading")}
            </span>
          </div>
        )}

        {preview && !loading && (
          <div className="space-y-4">
            {/* Employee info */}
            <div className="text-sm text-[var(--text-sub)]">
              <span className="font-medium text-[var(--text-main)]">{preview.department}</span>
              {" / "}
              {preview.position}
              {" · "}
              {preview.employeeId}
            </div>

            {/* Breakdown table */}
            <div className="rounded-lg border border-[var(--border)] overflow-hidden text-sm">
              <table className="w-full">
                <tbody>
                  {preview.breakdown.map((row, i) => {
                    const isTotal = row.label.toLowerCase().includes("tổng");
                    return (
                      <tr
                        key={i}
                        className={
                          isTotal
                            ? "border-t-2 border-[var(--border)] bg-[var(--background)] font-semibold"
                            : "border-t border-[var(--border)]"
                        }
                      >
                        <td className="px-3 py-2 text-[var(--text-sub)]">{row.label}</td>
                        <td className="px-3 py-2 text-[var(--text-sub)] text-xs">{row.formula}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            row.value < 0
                              ? "text-[var(--error)]"
                              : isTotal
                              ? "text-[var(--accent-cyan)]"
                              : "text-[var(--text-main)]"
                          }`}
                        >
                          {row.value < 0
                            ? `−${formatCurrency(Math.abs(row.value))}`
                            : formatCurrency(row.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Salary source badge */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-sub)]">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {t("dashboard:payrollPreview.salarySource")}:{" "}
                <Badge variant="outline" className="text-xs py-0">
                  {SALARY_SOURCE_LABEL[preview.salary.salarySource] ?? preview.salary.salarySource}
                </Badge>
              </span>
            </div>

            {/* Warning note */}
            <p className="text-xs text-[var(--warning)] bg-[var(--warning)]/10 rounded px-3 py-2">
              {t("dashboard:payrollPreview.warning")}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dashboard:payrollPreview.actions.close")}
          </Button>
          {onConfirmGenerate && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onConfirmGenerate();
              }}
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
            >
              {t("dashboard:payrollPreview.actions.generate")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
