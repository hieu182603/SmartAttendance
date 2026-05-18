import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Receipt, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMyPayslip,
  downloadMyPayslipPdf,
  downloadMyPayslipExcel,
  type PayrollRecord,
} from "@/services/payrollService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  paid: "Đã thanh toán",
};

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30",
  approved: "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30",
  pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30",
};

function recentMonths(n = 12) {
  const months: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 1; i <= n; i++) {
    const year = d.getFullYear();
    const month = d.getMonth() - i + 1;
    const dt = new Date(year, month, 1);
    const value = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const label = `Tháng ${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    months.push({ value, label });
  }
  return months;
}

export default function MyPayslipPage() {
  const { t } = useTranslation();
  const months = recentMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.value || "");
  const [payslip, setPayslip] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setNotFound(false);
    setPayslip(null);
    getMyPayslip(selectedMonth)
      .then(setPayslip)
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error(
            err?.response?.data?.message ||
              t("dashboard:myPayslip.toasts.loadError")
          );
        }
      })
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const handleDownloadPdf = async () => {
    toast.loading(t("dashboard:myPayslip.toasts.exportPdfLoading"), { id: "pdf" });
    try {
      await downloadMyPayslipPdf(selectedMonth);
      toast.success(t("dashboard:myPayslip.toasts.exportPdfSuccess"), { id: "pdf" });
    } catch {
      toast.error(t("dashboard:myPayslip.toasts.exportPdfError"), { id: "pdf" });
    }
  };

  const handleDownloadExcel = async () => {
    toast.loading(t("dashboard:myPayslip.toasts.exportExcelLoading"), { id: "xlsx" });
    try {
      await downloadMyPayslipExcel(selectedMonth);
      toast.success(t("dashboard:myPayslip.toasts.exportExcelSuccess"), { id: "xlsx" });
    } catch {
      toast.error(t("dashboard:myPayslip.toasts.exportExcelError"), { id: "xlsx" });
    }
  };

  return (
    <div className="p-6 space-y-6 text-[var(--text-main)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-[var(--accent-cyan)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              {t("dashboard:myPayslip.title")}
            </h1>
            <p className="text-sm text-[var(--text-sub)]">
              {t("dashboard:myPayslip.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44 border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-[var(--text-main)]">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {payslip && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                className="border-[var(--border)] text-[var(--text-main)]"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-cyan)]" />
          <span className="text-[var(--text-sub)]">
            {t("dashboard:myPayslip.loading")}
          </span>
        </div>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-sub)]">
          <AlertCircle className="h-10 w-10 opacity-40" />
          <p>
            {t("dashboard:myPayslip.empty", {
              month: selectedMonth?.slice(5, 7),
              year: selectedMonth?.slice(0, 4),
            })}
          </p>
        </div>
      )}

      {/* Payslip content */}
      {!loading && payslip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Employee info card */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg text-[var(--text-main)]">
                    {(payslip.userId as any)?.name || "—"}
                  </p>
                  <p className="text-sm text-[var(--text-sub)]">
                    {payslip.department || "—"} / {payslip.position || "—"}
                    {payslip.employeeId && ` · ${payslip.employeeId}`}
                  </p>
                  <p className="text-xs text-[var(--text-sub)] mt-0.5">
                    {t("dashboard:myPayslip.period")}:{" "}
                    {new Date(payslip.periodStart).toLocaleDateString("vi-VN")} –{" "}
                    {new Date(payslip.periodEnd).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <Badge className={`${STATUS_COLOR[payslip.status]} border text-sm px-3 py-1`}>
                  {STATUS_LABEL[payslip.status] || payslip.status}
                  {payslip.paidAt &&
                    ` (${new Date(payslip.paidAt).toLocaleDateString("vi-VN")})`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Summary + attendance grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-[var(--surface)] border-[var(--border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[var(--text-sub)]">
                  {t("dashboard:myPayslip.netSalary")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {formatCurrency(payslip.netSalary ?? payslip.totalSalary)}
                </p>
                <p className="text-xs text-[var(--text-sub)] mt-1">
                  {t("dashboard:myPayslip.gross")}: {formatCurrency(payslip.grossSalary ?? payslip.totalSalary)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--surface)] border-[var(--border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[var(--text-sub)]">
                  {t("dashboard:myPayslip.attendance")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.workDays")}</span>
                  <p className="font-semibold">{payslip.workDays} / {payslip.totalDays}</p>
                </div>
                <div>
                  <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.overtime")}</span>
                  <p className="font-semibold">{payslip.overtimeHours}h</p>
                </div>
                <div>
                  <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.late")}</span>
                  <p className="font-semibold text-[var(--warning)]">
                    {t("dashboard:myPayslip.daysValue", { count: payslip.lateDays })}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.leave")}</span>
                  <p className="font-semibold">
                    {t("dashboard:myPayslip.daysValue", {
                      count: payslip.paidLeaveDays ?? payslip.leaveDays,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary breakdown */}
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-sub)]">
                {t("dashboard:myPayslip.breakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 text-sm">
                {[
                  { label: t("dashboard:myPayslip.baseSalary"), value: payslip.baseSalary },
                  { label: t("dashboard:myPayslip.overtimePay"), value: payslip.overtimePay },
                  { label: t("dashboard:myPayslip.bonus"), value: payslip.bonus },
                  { label: t("dashboard:myPayslip.deductions"), value: -payslip.deductions, negative: true },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <span className="text-[var(--text-sub)]">{row.label}</span>
                    <span
                      className={
                        row.negative && payslip.deductions > 0
                          ? "text-[var(--error)] font-medium"
                          : "font-medium text-[var(--text-main)]"
                      }
                    >
                      {row.negative && payslip.deductions > 0
                        ? `−${formatCurrency(payslip.deductions)}`
                        : formatCurrency(row.value < 0 ? 0 : row.value)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between py-2 border-b border-[var(--border)] font-semibold">
                  <span className="text-[var(--text-main)]">
                    {t("dashboard:myPayslip.totalGross")}
                  </span>
                  <span className="text-[var(--text-main)]">{formatCurrency(payslip.grossSalary ?? payslip.totalSalary)}</span>
                </div>

                {payslip.insurance && payslip.insurance.total > 0 && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--text-sub)]">
                      {t("dashboard:myPayslip.insurance")}
                    </span>
                    <span className="text-[var(--error)] font-medium">−{formatCurrency(payslip.insurance.total)}</span>
                  </div>
                )}

                {payslip.tax && payslip.tax.amount > 0 && (
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.tax")}</span>
                    <span className="text-[var(--error)] font-medium">−{formatCurrency(payslip.tax.amount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-3 font-bold text-base mt-1 border-t-2 border-[var(--border)]">
                  <span className="text-[var(--text-main)]">
                    {t("dashboard:myPayslip.totalNet")}
                  </span>
                  <span className="text-[var(--accent-cyan)]">{formatCurrency(payslip.netSalary ?? payslip.totalSalary)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
