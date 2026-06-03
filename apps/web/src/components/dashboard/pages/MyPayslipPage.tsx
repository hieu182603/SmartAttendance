import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  Calendar,
  TrendingUp,
  Wallet,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getMyPayslips,
  downloadMyPayslipPdf,
  downloadMyPayslipExcel,
  type PayrollRecord,
} from "@/services/payrollService";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const formatCurrency = (value: number, hide: boolean) => {
  if (hide) return "••••••";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
};

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30",
  approved: "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30",
  pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30",
};

export default function MyPayslipPage() {
  const { t } = useTranslation();
  const [payslips, setPayslips] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideSalary, setHideSalary] = useState(() => {
    return localStorage.getItem("hide_salary_amount") === "true";
  });
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyPayslips()
      .then(setPayslips)
      .catch((err) => {
        toast.error(
          err?.response?.data?.message || t("dashboard:myPayslip.toasts.loadError")
        );
      })
      .finally(() => setLoading(false));
  }, [t]);

  const toggleHideSalary = () => {
    setHideSalary((prev) => {
      const next = !prev;
      localStorage.setItem("hide_salary_amount", String(next));
      return next;
    });
  };

  const handleDownloadPdf = async (month: string) => {
    toast.loading(t("dashboard:myPayslip.toasts.exportPdfLoading"), { id: `pdf-${month}` });
    try {
      await downloadMyPayslipPdf(month);
      toast.success(t("dashboard:myPayslip.toasts.exportPdfSuccess"), { id: `pdf-${month}` });
    } catch {
      toast.error(t("dashboard:myPayslip.toasts.exportPdfError"), { id: `pdf-${month}` });
    }
  };

  const handleDownloadExcel = async (month: string) => {
    toast.loading(t("dashboard:myPayslip.toasts.exportExcelLoading"), { id: `xlsx-${month}` });
    try {
      await downloadMyPayslipExcel(month);
      toast.success(t("dashboard:myPayslip.toasts.exportExcelSuccess"), { id: `xlsx-${month}` });
    } catch {
      toast.error(t("dashboard:myPayslip.toasts.exportExcelError"), { id: `xlsx-${month}` });
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "paid") return t("dashboard:myPayslip.statusLabels.paid", { defaultValue: "Đã thanh toán" });
    if (status === "approved") return t("dashboard:leaveBalance.status.approved", { defaultValue: "Đã duyệt" });
    return t("dashboard:leaveBalance.status.pending", { defaultValue: "Chờ duyệt" });
  };

  // Metrics calculations based on paid or approved payslips
  const validPayslips = payslips.filter((p) => p.status === "paid" || p.status === "approved");
  const totalEarned = validPayslips.reduce((sum, p) => sum + (p.netSalary ?? p.totalSalary), 0);
  const averageSalary = validPayslips.length > 0 ? totalEarned / validPayslips.length : 0;
  const latestSalary = payslips[0] ? (payslips[0].netSalary ?? payslips[0].totalSalary) : 0;

  return (
    <div className="p-6 space-y-6 text-[var(--text-main)] max-w-7xl mx-auto">
      {/* Header section with glass effect */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 rounded-xl border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]">
            <Wallet className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              {t("dashboard:myPayslip.title")}
            </h1>
            <p className="text-sm text-[var(--text-sub)]">
              {t("dashboard:myPayslip.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
        </div>
      </motion.div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-cyan)]" />
          <span className="text-sm text-[var(--text-sub)] font-medium animate-pulse">
            {t("dashboard:myPayslip.loading")}
          </span>
        </div>
      )}

      {/* No payslips found */}
      {!loading && payslips.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4 p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center max-w-lg mx-auto"
        >
          <div className="p-4 bg-[var(--warning)]/10 text-[var(--warning)] rounded-full border border-[var(--warning)]/30">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              {t("dashboard:myPayslip.empty", { month: "—", year: "—" }).replace(" —/—", "")}
            </h3>
            <p className="text-sm text-[var(--text-sub)] mt-1">
              Chưa có dữ liệu bảng lương được tính cho tài khoản của bạn.
            </p>
          </div>
        </motion.div>
      )}

      {!loading && payslips.length > 0 && (
        <>
          {/* Summary KPIs cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4"
          >
            {/* KPI 1: Total Earned */}
            <Card className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] border-[var(--border)] shadow-md rounded-2xl overflow-hidden group">
              <CardContent className="p-5 mt-4 flex items-center justify-between relative">
                <div className="space-y-1 z-10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                    {t("dashboard:myPayslip.summary.totalEarned")}
                  </span>
                  <p className="text-2xl font-extrabold text-[var(--text-main)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    {formatCurrency(totalEarned, hideSalary)}
                  </p>
                </div>
                <div className="p-3 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 rounded-xl z-10">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Monthly Average */}
            <Card className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] border-[var(--border)] shadow-md rounded-2xl overflow-hidden group">
              <CardContent className="p-5 mt-4 flex items-center justify-between relative">
                <div className="space-y-1 z-10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                    {t("dashboard:myPayslip.summary.average")}
                  </span>
                  <p className="text-2xl font-extrabold text-[var(--text-main)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    {formatCurrency(averageSalary, hideSalary)}
                  </p>
                </div>
                <div className="p-3 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/25 rounded-xl z-10">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Latest Period */}
            <Card className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] border-[var(--border)] shadow-md rounded-2xl overflow-hidden group">
              <CardContent className="p-5 mt-4 flex items-center justify-between relative">
                <div className="space-y-1 z-10">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                    {t("dashboard:myPayslip.summary.latest")} ({payslips[0]?.month})
                  </span>
                  <p className="text-2xl font-extrabold text-[var(--accent-cyan)]">
                    {formatCurrency(latestSalary, hideSalary)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-tr from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 rounded-xl z-10">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payslip History Table Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <Card className="bg-[var(--surface)] border-[var(--border)] shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-[var(--border)] flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[var(--accent-cyan)]" />
                  {t("dashboard:myPayslip.history")}
                </CardTitle>
                <div className="text-xs text-[var(--text-sub)] font-medium">
                  {payslips.length} {t("dashboard:approveRequests.stats.total").toLowerCase()}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-[var(--text-sub)] text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">{t("dashboard:myPayslip.tableMonth")}</th>
                        <th className="py-4 px-4">{t("dashboard:myPayslip.workDays")}</th>
                        <th className="py-4 px-4 hidden md:table-cell">{t("dashboard:myPayslip.baseSalary")}</th>
                        <th className="py-4 px-4 hidden sm:table-cell">{t("dashboard:myPayslip.gross")}</th>
                        <th className="py-4 px-4">{t("dashboard:myPayslip.netSalary")}</th>
                        <th className="py-4 px-4">{t("dashboard:myPayslip.tableStatus")}</th>
                        <th className="py-4 px-6 text-center">{t("dashboard:myPayslip.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-sm">
                      {payslips.map((rec, index) => (
                        <motion.tr
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          key={rec._id}
                          className="hover:bg-[var(--surface-hover)] transition-colors"
                        >
                          {/* Month column */}
                          <td className="py-4 px-6 font-semibold text-[var(--text-main)]">
                            Tháng {rec.month.slice(5, 7)}/{rec.month.slice(0, 4)}
                          </td>
                          {/* Worked Days column */}
                          <td className="py-4 px-4">
                            <span className="font-semibold text-[var(--text-main)]">
                              {rec.workDays}
                            </span>
                            <span className="text-[var(--text-sub)] text-xs">
                              {" "}/ {rec.totalDays} ngày
                            </span>
                          </td>
                          {/* Base Salary column */}
                          <td className="py-4 px-4 hidden md:table-cell font-medium">
                            {formatCurrency(rec.baseSalary, hideSalary)}
                          </td>
                          {/* Gross Salary column */}
                          <td className="py-4 px-4 hidden sm:table-cell font-medium">
                            {formatCurrency(rec.grossSalary ?? rec.totalSalary, hideSalary)}
                          </td>
                          {/* Net Salary column */}
                          <td className="py-4 px-4 font-bold text-[var(--accent-cyan)]">
                            {formatCurrency(rec.netSalary ?? rec.totalSalary, hideSalary)}
                          </td>
                          {/* Status Badge column */}
                          <td className="py-4 px-4">
                            <Badge className={`${STATUS_COLOR[rec.status]} border text-xs px-2.5 py-0.5 rounded-full font-medium`}>
                              {getStatusLabel(rec.status)}
                            </Badge>
                          </td>
                          {/* Actions column */}
                          <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={toggleHideSalary}
                              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)] transition-all cursor-pointer rounded-lg p-2"
                              title={hideSalary ? t("dashboard:myPayslip.showSalary") : t("dashboard:myPayslip.hideSalary")}
                            >
                              {hideSalary ? (
                                <Eye className="h-4 w-4 text-[var(--accent-cyan)]" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPayslip(rec)}
                              className="text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 hover:text-[var(--accent-cyan)] transition-all cursor-pointer rounded-lg px-3"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPdf(rec.month)}
                              className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)] transition-all cursor-pointer rounded-lg p-2"
                              title="Tải PDF"
                            >
                              <Download className="h-4 w-4 text-red-400" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Slide-over Detail Modal with Glassmorphism */}
      <AnimatePresence>
        {selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPayslip(null)}
              className="absolute inset-0 bg-[#000] backdrop-blur-sm"
            />

            {/* Modal Content Box */}
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="relative w-full max-w-5xl h-auto max-h-[92vh] bg-[var(--shell)] border border-[var(--border)] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30 rounded-xl text-[var(--accent-cyan)]">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">
                      {t("dashboard:myPayslip.breakdown")}
                    </h3>
                    <p className="text-xs text-[var(--text-sub)]">
                      Kỳ lương tháng {selectedPayslip.month.slice(5, 7)}/{selectedPayslip.month.slice(0, 4)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPayslip(null)}
                  className="text-[var(--text-sub)] hover:bg-[var(--border)] rounded-xl cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable details content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Employee / Meta Box */}
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex justify-between items-start shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-[var(--text-main)] tracking-tight">
                      {(selectedPayslip.userId as any)?.name || "—"}
                    </h4>
                    <p className="text-xs text-[var(--text-sub)]">
                      {selectedPayslip.department || "—"} · {selectedPayslip.position || "—"}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLOR[selectedPayslip.status]} border text-xs px-2.5 py-0.5 rounded-full font-semibold`}>
                    {getStatusLabel(selectedPayslip.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/85 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-sub)] font-semibold">
                      {t("dashboard:myPayslip.totalNet")}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--accent-cyan)]">
                      {formatCurrency(selectedPayslip.netSalary ?? selectedPayslip.totalSalary, hideSalary)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/85 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-sub)] font-semibold">{t("dashboard:myPayslip.workDays")}</p>
                    <p className="mt-1 text-sm font-bold text-[var(--text-main)]">
                      {selectedPayslip.workDays}/{selectedPayslip.totalDays}
                    </p>
                  </div>
                </div>

                {/* Period and Download Action buttons */}
                <div className="flex items-center justify-between gap-3 text-xs p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-[var(--text-sub)] font-medium">{t("dashboard:myPayslip.periodApplied")}</p>
                    <p className="font-bold text-[var(--text-main)]">
                      {new Date(selectedPayslip.periodStart).toLocaleDateString("vi-VN")} –{" "}
                      {new Date(selectedPayslip.periodEnd).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPdf(selectedPayslip.month)}
                      className="border-[var(--border)] text-xs text-[var(--text-main)] hover:bg-[var(--border)] transition-all cursor-pointer rounded-lg px-2.5 py-1"
                    >
                      <Download className="h-3.5 w-3.5 mr-1 text-red-400" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadExcel(selectedPayslip.month)}
                      className="border-[var(--border)] text-xs text-[var(--text-main)] hover:bg-[var(--border)] transition-all cursor-pointer rounded-lg px-2.5 py-1"
                    >
                      <Download className="h-3.5 w-3.5 mr-1 text-green-400" />
                      Excel
                    </Button>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/75 p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)]">
                    {t("dashboard:myPayslip.attendance")}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
                      <p className="text-[10px] text-[var(--text-sub)] font-semibold uppercase">{t("dashboard:myPayslip.workDays")}</p>
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {selectedPayslip.workDays} / {selectedPayslip.totalDays} ngày
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
                      <p className="text-[10px] text-[var(--text-sub)] font-semibold uppercase">{t("dashboard:myPayslip.overtime")}</p>
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {selectedPayslip.overtimeHours}h
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
                      <p className="text-[10px] text-[var(--text-sub)] font-semibold uppercase">{t("dashboard:myPayslip.late")}</p>
                      <p className="text-sm font-bold text-[var(--warning)]">
                        {t("dashboard:myPayslip.daysValue", { count: selectedPayslip.lateDays })}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
                      <p className="text-[10px] text-[var(--text-sub)] font-semibold uppercase">{t("dashboard:myPayslip.leave")}</p>
                      <p className="text-sm font-bold text-[var(--text-main)]">
                        {t("dashboard:myPayslip.daysValue", { count: selectedPayslip.paidLeaveDays ?? selectedPayslip.leaveDays })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Details */}
                <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)]">
                    {t("dashboard:myPayslip.breakdown")}
                  </h4>
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)] text-sm">
                    {/* Basic Base Salary */}
                    <div className="p-3.5 bg-[var(--surface)] flex justify-between">
                      <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.baseSalary")}</span>
                      <span className="font-semibold text-[var(--text-main)]">
                        {formatCurrency(selectedPayslip.baseSalary, hideSalary)}
                      </span>
                    </div>

                    {/* Worked Salary (Base pay calculated based on actual active days) */}
                    <div className="p-3.5 bg-[var(--surface)] flex justify-between">
                      <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.actualBaseSalary")}</span>
                      <span className="font-semibold text-[var(--text-main)]">
                        {formatCurrency(selectedPayslip.actualBaseSalary ?? selectedPayslip.baseSalary, hideSalary)}
                      </span>
                    </div>

                    {/* Overtime Pay */}
                    <div className="p-3.5 bg-[var(--surface)] flex justify-between">
                      <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.overtimePay")}</span>
                      <span className="font-semibold text-[var(--text-main)]">
                        {formatCurrency(selectedPayslip.overtimePay, hideSalary)}
                      </span>
                    </div>

                    {/* Bonuses */}
                    <div className="p-3.5 bg-[var(--surface)] flex justify-between">
                      <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.bonus")}</span>
                      <span className="font-semibold text-[var(--text-main)]">
                        {formatCurrency(selectedPayslip.bonus, hideSalary)}
                      </span>
                    </div>

                    {/* Custom deductions */}
                    <div className="p-3.5 bg-[var(--surface)] flex justify-between">
                      <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.deductions")}</span>
                      <span className={selectedPayslip.deductions > 0 ? "font-semibold text-red-400" : "font-semibold"}>
                        {selectedPayslip.deductions > 0 ? "−" : ""}{formatCurrency(selectedPayslip.deductions, hideSalary)}
                      </span>
                    </div>

                    {/* Social/Health/Unemployment Insurance */}
                    {selectedPayslip.insurance && selectedPayslip.insurance.total > 0 && (
                      <div className="p-3.5 bg-[var(--surface)] flex justify-between text-red-400">
                        <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.insurance")}</span>
                        <span className="font-medium">
                          −{formatCurrency(selectedPayslip.insurance.total, hideSalary)}
                        </span>
                      </div>
                    )}

                    {/* Personal Income Tax */}
                    {selectedPayslip.tax && selectedPayslip.tax.amount > 0 && (
                      <div className="p-3.5 bg-[var(--surface)] flex justify-between text-red-400">
                        <span className="text-[var(--text-sub)]">{t("dashboard:myPayslip.tax")}</span>
                        <span className="font-medium">
                          −{formatCurrency(selectedPayslip.tax.amount, hideSalary)}
                        </span>
                      </div>
                    )}

                    {/* Net take-home pay */}
                    <div className="p-4 bg-gradient-to-tr from-[var(--accent-cyan)]/18 to-[var(--accent-cyan)]/6 flex justify-between font-extrabold text-base items-center">
                      <span className="text-[var(--text-main)] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[var(--accent-cyan)] animate-pulse" />
                        {t("dashboard:myPayslip.totalNet")}
                      </span>
                      <span className="text-[var(--accent-cyan)] text-lg">
                        {formatCurrency(selectedPayslip.netSalary ?? selectedPayslip.totalSalary, hideSalary)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end">
                <Button
                  onClick={() => setSelectedPayslip(null)}
                  className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-cyan)]/80 hover:scale-[1.02] text-[#fff] font-bold py-2 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[var(--accent-cyan)]/25"
                >
                  {t("dashboard:approveRequests.actions.cancel", { defaultValue: "Đóng" })}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
