import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Download,
  Search,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  getPayrollRecords,
  getDepartments,
  getPayrollById,
  approvePayroll,
  markAsPaid,
  type PayrollRecord,
} from "../../../services/payrollService";

export default function PayrollPage() {
  const { t } = useTranslation("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  
  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const params: {
        month?: string;
        page: number;
        limit: number;
        status?: string;
        department?: string;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (selectedMonth) {
        params.month = selectedMonth;
      }
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterDepartment !== "all") {
        params.department = filterDepartment;
      }

      const response = await getPayrollRecords(params);
      setPayrollData(response.records || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching payroll:", error);
      console.error("Error details:", error.response?.data || error.message);

      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        t("payroll.error");
      toast.error(errorMsg);

      setPayrollData([]);
      setPagination({
        total: 0,
        page: 1,
        limit: itemsPerPage,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, currentPage, itemsPerPage, filterStatus, filterDepartment]);

  // Lắng nghe sự kiện realtime khi payroll được duyệt/thanh toán
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePayrollUpdated = ((event: Event) => {
      // Refetch danh sách payroll để cập nhật trạng thái mà không cần F5
      fetchPayrollData();
    }) as EventListener;

    const handlePayrollStatusChanged = ((event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const notification = customEvent.detail;

      // Chỉ xử lý các notification liên quan đến payroll
      if (!notification || notification.relatedEntityType !== 'payroll') {
        return;
      }

      // Hiển thị toast thân thiện cho người dùng
      if (notification.type === 'system') {
        toast.success(notification.title || 'Bảng lương đã được cập nhật');
      }

      // Refetch danh sách payroll để cập nhật trạng thái mà không cần F5
      fetchPayrollData();
    }) as EventListener;

    window.addEventListener('payroll-updated', handlePayrollUpdated);
    window.addEventListener('payroll-status-changed', handlePayrollStatusChanged);

    return () => {
      window.removeEventListener('payroll-updated', handlePayrollUpdated);
      window.removeEventListener('payroll-status-changed', handlePayrollStatusChanged);
    };
  }, []);

  // Client-side search filtering (by name/employeeId)
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return payrollData;
    }
    return payrollData.filter((record) => {
      const employeeName = record.userId?.name || "";
      const empId = record.employeeId || record.userId?.employeeId || "";

      return (
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [payrollData, searchTerm]);

  // Reset to page 1 when filters change (except search which is client-side)
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDepartment, filterStatus, selectedMonth]);

  const exportToExcel = async () => {
    try {
      // Show loading toast
      toast.loading("Đang xuất file Excel...", { id: "export-excel" });

      // Fetch all records for export (without pagination)
      let allExportData: PayrollRecord[] = [];
      
      if (searchTerm) {
        // If there's a search term, use filtered data (client-side)
        allExportData = filteredData;
      } else {
        // Fetch all records from server for export
        const params: {
          month?: string;
          page?: number;
          limit: number;
          status?: string;
          department?: string;
        } = {
          limit: 10000, // Large limit to get all records
        };

        if (selectedMonth) {
          params.month = selectedMonth;
        }
        if (filterStatus !== "all") {
          params.status = filterStatus;
        }
        if (filterDepartment !== "all") {
          params.department = filterDepartment;
        }

        const response = await getPayrollRecords(params);
        allExportData = response.records || [];
      }

      if (allExportData.length === 0) {
        toast.error("Không có dữ liệu để xuất", { id: "export-excel" });
        return;
      }

      // Prepare data for Excel
      const excelData = allExportData.map((record) => ({
        [t("payroll.employeeName")]: record.userId?.name || "N/A",
        [t("payroll.table.department")]: record.department || "N/A",
        [t("payroll.table.position")]: record.position || "N/A",
        [t("payroll.table.workDays")]: record.workDays,
        [t("payroll.table.totalDays")]: record.totalDays,
        [t("payroll.table.overtimeHours")]: record.overtimeHours,
        [t("payroll.table.leaveDays")]: record.leaveDays,
        [t("payroll.table.lateDays")]: record.lateDays,
        [t("payroll.table.baseSalary")]: record.baseSalary,
        [t("payroll.table.overtimePay")]: record.overtimePay,
        [t("payroll.table.bonus")]: record.bonus,
        [t("payroll.table.deductions")]: record.deductions,
        [t("payroll.table.totalSalary")]: record.totalSalary,
        [t("payroll.table.status")]: 
          record.status === "paid" 
            ? t("payroll.filters.paid")
            : record.status === "approved"
            ? t("payroll.filters.approved")
            : t("payroll.filters.pending"),
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 25 }, // Employee Name
        { wch: 20 }, // Department
        { wch: 20 }, // Position
        { wch: 12 }, // Work Days
        { wch: 12 }, // Total Days
        { wch: 15 }, // Overtime Hours
        { wch: 12 }, // Leave Days
        { wch: 12 }, // Late Days
        { wch: 15 }, // Base Salary
        { wch: 15 }, // Overtime Pay
        { wch: 15 }, // Bonus
        { wch: 15 }, // Deductions
        { wch: 15 }, // Total Salary
        { wch: 15 }, // Status
      ];
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Bảng lương");

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { 
        bookType: "xlsx", 
        type: "array",
        cellStyles: true,
      });

      // Create blob and download
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${t("payroll.filePrefix")}_${selectedMonth}.xlsx`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Đã xuất ${allExportData.length} bản ghi ra file Excel`, { 
        id: "export-excel" 
      });
    } catch (error) {
      console.error("Export Excel error:", error);
      toast.error("Có lỗi xảy ra khi xuất file Excel", { id: "export-excel" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30";
      case "approved":
        return "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30";
      case "pending":
        return "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30";
      default:
        return "bg-[var(--surface)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return t("payroll.filters.paid");
      case "approved":
        return t("payroll.filters.approved");
      case "pending":
        return t("payroll.filters.pending");
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Stats calculation - using current page data only
  // Note: For accurate stats, you might want a separate stats endpoint
  const stats = {
    totalEmployees: pagination.total || payrollData.length,
    totalPayroll: payrollData.reduce((sum, r) => sum + r.totalSalary, 0),
    avgSalary:
      payrollData.length > 0
        ? payrollData.reduce((sum, r) => sum + r.totalSalary, 0) /
          payrollData.length
        : 0,
    pendingApproval: payrollData.filter((r) => r.status === "pending").length,
  };

  // Handler functions
  const handleViewDetails = async (record: PayrollRecord) => {
    try {
      setLoadingAction(true);
      const detailedRecord = await getPayrollById(record._id);
      setSelectedRecord(detailedRecord);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể tải chi tiết bảng lương");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleOpenApproveDialog = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsApproveDialogOpen(true);
  };

  const handleOpenMarkPaidDialog = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsMarkPaidDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;

    try {
      setLoadingAction(true);
      await approvePayroll(selectedRecord._id);
      toast.success("Duyệt bảng lương thành công");
      setIsApproveDialogOpen(false);
      setSelectedRecord(null);
      
      // Refresh data with current pagination
      const params: {
        month?: string;
        page: number;
        limit: number;
        status?: string;
        department?: string;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (selectedMonth) {
        params.month = selectedMonth;
      }
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterDepartment !== "all") {
        params.department = filterDepartment;
      }

      const response = await getPayrollRecords(params);
      setPayrollData(response.records || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể duyệt bảng lương");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedRecord) return;

    try {
      setLoadingAction(true);
      await markAsPaid(selectedRecord._id);
      toast.success("Đánh dấu đã thanh toán thành công");
      setIsMarkPaidDialogOpen(false);
      setSelectedRecord(null);
      
      // Refresh data with current pagination
      const params: {
        month?: string;
        page: number;
        limit: number;
        status?: string;
        department?: string;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (selectedMonth) {
        params.month = selectedMonth;
      }
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterDepartment !== "all") {
        params.department = filterDepartment;
      }

      const response = await getPayrollRecords(params);
      setPayrollData(response.records || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể đánh dấu đã thanh toán");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
              {t("payroll.title")}
            </h1>
            <p className="text-[var(--text-sub)]">{t("payroll.description")}</p>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)] hover:opacity-90 shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("payroll.export")}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t("payroll.stats.totalEmployees"),
            value: stats.totalEmployees,
            color: "primary",
            icon: Users,
            suffix: "",
            delay: 0.1,
          },
          {
            label: t("payroll.stats.totalSalary"),
            value: stats.totalPayroll,
            color: "success",
            icon: DollarSign,
            format: "currency",
            delay: 0.2,
          },
          {
            label: t("payroll.stats.avgSalary"),
            value: stats.avgSalary,
            color: "accent-cyan",
            icon: TrendingUp,
            format: "currency",
            delay: 0.3,
          },
          {
            label: t("payroll.stats.pending"),
            value: stats.pendingApproval,
            color: "warning",
            icon: Clock,
            suffix: "",
            delay: 0.4,
          },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-cyan)] transition-all relative overflow-hidden group">
              <motion.div
                className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br from-[var(--${stat.color})] to-transparent`}
                initial={false}
              />

              <CardContent className="p-6 relative z-10 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-sub)]">
                      {stat.label}
                    </p>
                    <motion.p
                      className={`text-2xl mt-2 text-[var(--${stat.color})]`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: stat.delay + 0.2, type: "spring" }}
                    >
                      {stat.format === "currency"
                        ? formatCurrency(stat.value).replace("₫", "").trim() +
                          "đ"
                        : stat.value + (stat.suffix || "")}
                    </motion.p>
                  </div>
                  <motion.div
                    className={`p-3 rounded-xl bg-[var(--${stat.color})]/10`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <stat.icon
                      className={`h-6 w-6 text-[var(--${stat.color})]`}
                    />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="p-6 mt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                  <Input
                    placeholder={t("payroll.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                  />
                </div>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white pointer-events-none z-10" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
              <Select
                value={filterDepartment}
                onValueChange={setFilterDepartment}
              >
                <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={t("payroll.filters.department")} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem
                    value="all"
                    className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                  >
                    {t("payroll.filters.allDepartments")}
                  </SelectItem>
                  {departments.map((dept) => (
                    <SelectItem
                      key={dept}
                      value={dept}
                      className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                    >
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder={t("payroll.filters.status")} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectItem
                    value="all"
                    className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                  >
                    {t("payroll.filters.all")}
                  </SelectItem>
                  <SelectItem
                    value="pending"
                    className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                  >
                    {t("payroll.filters.pending")}
                  </SelectItem>
                  <SelectItem
                    value="approved"
                    className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                  >
                    {t("payroll.filters.approved")}
                  </SelectItem>
                  <SelectItem
                    value="paid"
                    className="text-[var(--text-main)] focus:bg-[var(--shell)] focus:text-[var(--text-main)]"
                  >
                    {t("payroll.filters.paid")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payroll Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-main)]">
              {t("payroll.details")} -{" "}
              {new Date(selectedMonth).toLocaleDateString("vi-VN", {
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--border)] hover:bg-transparent">
                    <TableHead className="text-[var(--text-sub)]">
                      {t("payroll.employeeName")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)]">
                      {t("payroll.table.department")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      {t("payroll.table.workDays")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      {t("payroll.table.overtimeHours")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      {t("payroll.table.baseSalary")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      {t("payroll.table.overtimePay")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      {t("payroll.table.bonus")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      {t("payroll.table.deductions")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      {t("payroll.table.totalSalary")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      {t("payroll.table.status")}
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                          <p className="text-[var(--text-sub)]">
                            {t("payroll.loading")}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record, index) => (
                      <TableRow
                        key={record._id}
                        className="border-[var(--border)] hover:bg-[var(--shell)] transition-colors"
                      >
                        <TableCell className="text-[var(--text-main)]">
                          {record.userId?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-[var(--text-sub)]">
                          {record.department}
                        </TableCell>
                        <TableCell className="text-center text-[var(--text-main)]">
                          {record.workDays}/{record.totalDays}
                        </TableCell>
                        <TableCell className="text-center text-[var(--text-main)]">
                          {record.overtimeHours}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-main)]">
                          {formatCurrency(record.baseSalary)}
                        </TableCell>
                        <TableCell className="text-right text-[var(--success)]">
                          +{formatCurrency(record.overtimePay)}
                        </TableCell>
                        <TableCell className="text-right text-[var(--success)]">
                          +{formatCurrency(record.bonus)}
                        </TableCell>
                        <TableCell className="text-right text-[var(--error)]">
                          -{formatCurrency(record.deductions)}
                        </TableCell>
                        <TableCell className="text-right text-[var(--text-main)]">
                          {formatCurrency(record.totalSalary)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(record.status)}>
                            {getStatusLabel(record.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(record)}
                              className="h-8 w-8 p-0 border-[var(--border)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {record.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenApproveDialog(record)}
                                className="h-8 w-8 p-0 border-[var(--success)] text-[var(--success)] hover:bg-[var(--success)]/10"
                                title="Duyệt"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {record.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenMarkPaidDialog(record)}
                                className="h-8 w-8 p-0 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                                title="Đánh dấu đã thanh toán"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {!loading && payrollData.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">💼</div>
                <p className="text-[var(--text-sub)]">{t("payroll.noData")}</p>
              </motion.div>
            )}

            {/* Pagination Controls */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--text-sub)]">
                  <span>
                    Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} của {pagination.total}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-2">
                    <span>Dòng mỗi trang</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                      const newLimit = Number(v);
                      setItemsPerPage(newLimit);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-20 h-8 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={pagination.page === 1}
                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                  >
                    ‹
                  </Button>

                  <span className="px-4 text-sm text-[var(--text-main)]">
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="h-8 w-8 border-[var(--border)] text-[var(--text-main)]"
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Chi tiết bảng lương
            </DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              {selectedRecord && `${selectedRecord.userId?.name || "N/A"} - Tháng ${selectedRecord.month}`}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-2">
              {/* Employee Info - Header */}
              <div className="p-4 bg-[var(--shell)] rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[var(--text-main)]">
                    {selectedRecord.userId?.name || "N/A"}
                  </h3>
                  <Badge className={getStatusColor(selectedRecord.status)}>
                    {getStatusLabel(selectedRecord.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-sub)] text-xs">Phòng ban</span>
                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedRecord.department}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-sub)] text-xs">Chức vụ</span>
                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedRecord.position || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-sub)] text-xs">Tháng</span>
                    <p className="text-[var(--text-main)] font-medium mt-1">{selectedRecord.month}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-sub)] text-xs">Kỳ lương</span>
                    <p className="text-[var(--text-main)] font-medium mt-1">
                      {new Date(selectedRecord.periodStart).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - {new Date(selectedRecord.periodEnd).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column - Attendance & History */}
                <div className="space-y-4">
                  {/* Attendance Details */}
                  <div className="p-4 bg-[var(--shell)] rounded-xl">
                    <h4 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wide mb-3">
                      Thông tin chấm công
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-sub)]">Ngày công</span>
                        <p className="text-[var(--text-main)] font-medium text-sm">
                          {selectedRecord.workDays}/{selectedRecord.totalDays}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-sub)]">Giờ làm thêm</span>
                        <p className="text-[var(--text-main)] font-medium text-sm">
                          {selectedRecord.overtimeHours} giờ
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-sub)]">Ngày nghỉ</span>
                        <p className="text-[var(--text-main)] font-medium text-sm">
                          {selectedRecord.leaveDays} ngày
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--text-sub)]">Ngày đi muộn</span>
                        <p className="text-[var(--text-main)] font-medium text-sm">
                          {selectedRecord.lateDays} ngày
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Approval Info */}
                  {(selectedRecord.approvedAt || selectedRecord.paidAt) && (
                    <div className="p-4 bg-[var(--shell)] rounded-xl">
                      <h4 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wide mb-3">
                        Lịch sử xử lý
                      </h4>
                      <div className="space-y-2 text-sm">
                        {selectedRecord.approvedAt && (
                          <div className="flex justify-between">
                            <span className="text-[var(--text-sub)]">Ngày duyệt:</span>
                            <span className="text-[var(--text-main)] font-medium">
                              {new Date(selectedRecord.approvedAt).toLocaleString("vi-VN", { 
                                day: "2-digit", 
                                month: "2-digit", 
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        )}
                        {selectedRecord.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-[var(--text-sub)]">Ngày thanh toán:</span>
                            <span className="text-[var(--text-main)] font-medium">
                              {new Date(selectedRecord.paidAt).toLocaleString("vi-VN", { 
                                day: "2-digit", 
                                month: "2-digit", 
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Salary Details */}
                <div className="p-4 bg-[var(--shell)] rounded-xl">
                  <h4 className="text-sm font-semibold text-[var(--text-sub)] uppercase tracking-wide mb-3">
                    Chi tiết lương
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--text-sub)] text-sm">Lương cơ bản</span>
                      <span className="text-[var(--text-main)] font-medium">
                        {formatCurrency(selectedRecord.baseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--text-sub)] text-sm">Phụ cấp làm thêm</span>
                      <span className="text-[var(--success)] font-medium">
                        +{formatCurrency(selectedRecord.overtimePay)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--text-sub)] text-sm">Thưởng</span>
                      <span className="text-[var(--success)] font-medium">
                        +{formatCurrency(selectedRecord.bonus)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--text-sub)] text-sm">Khấu trừ</span>
                      <span className="text-[var(--error)] font-medium">
                        -{formatCurrency(selectedRecord.deductions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-[var(--primary)]">
                      <span className="text-[var(--text-main)] font-semibold text-base">Tổng lương</span>
                      <span className="text-[var(--text-main)] font-bold text-xl">
                        {formatCurrency(selectedRecord.totalSalary)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Duyệt bảng lương</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn duyệt bảng lương này?
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-2 py-2">
              <p className="text-[var(--text-main)]">
                <strong>{selectedRecord.userId?.name || "N/A"}</strong> - Tháng {selectedRecord.month}
              </p>
              <p className="text-sm text-[var(--text-sub)]">
                Tổng lương: <span className="font-semibold text-[var(--text-main)]">{formatCurrency(selectedRecord.totalSalary)}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
              disabled={loadingAction}
            >
              Hủy
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loadingAction}
              className="bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
            >
              {loadingAction ? "Đang xử lý..." : "Xác nhận duyệt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation Dialog */}
      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]">
          <DialogHeader>
            <DialogTitle>Đánh dấu đã thanh toán</DialogTitle>
            <DialogDescription className="text-[var(--text-sub)]">
              Bạn có chắc chắn muốn đánh dấu bảng lương này đã được thanh toán?
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-2 py-2">
              <p className="text-[var(--text-main)]">
                <strong>{selectedRecord.userId?.name || "N/A"}</strong> - Tháng {selectedRecord.month}
              </p>
              <p className="text-sm text-[var(--text-sub)]">
                Tổng lương: <span className="font-semibold text-[var(--text-main)]">{formatCurrency(selectedRecord.totalSalary)}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMarkPaidDialogOpen(false)}
              className="border-[var(--border)] text-[var(--text-main)]"
              disabled={loadingAction}
            >
              Hủy
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={loadingAction}
              className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white"
            >
              {loadingAction ? "Đang xử lý..." : "Xác nhận thanh toán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
