import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Download,
  Search,
  Calendar,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
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
  type PayrollRecord,
} from "../../../services/payrollService";

export default function PayrollPage() {
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

  // Fetch departments on mount
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

  // Fetch payroll data
  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        const response = await getPayrollRecords({
          month: selectedMonth,
          limit: 1000,
        });
        setPayrollData(response.records || []);
      } catch (error: any) {
        console.error("Error fetching payroll:", error);
        console.error("Error details:", error.response?.data || error.message);

        // Show specific error message
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Không thể tải dữ liệu bảng lương";
        toast.error(errorMsg);

        // Use empty data on error
        setPayrollData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, [selectedMonth]);

  const filteredData = payrollData.filter((record) => {
    const employeeName = record.userId?.name || "";
    const empId = record.employeeId || record.userId?.employeeId || "";

    const matchSearch =
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDepartment =
      filterDepartment === "all" || record.department === filterDepartment;
    const matchStatus =
      filterStatus === "all" || record.status === filterStatus;

    return matchSearch && matchDepartment && matchStatus;
  });

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      "Mã NV",
      "Họ tên",
      "Phòng ban",
      "Chức vụ",
      "Ngày công",
      "Tổng ngày",
      "Giờ tăng ca",
      "Ngày nghỉ",
      "Ngày đi muộn",
      "Lương cơ bản",
      "Lương tăng ca",
      "Thưởng",
      "Khấu trừ",
      "Tổng lương",
      "Trạng thái",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((record) =>
        [
          record.employeeId || record.userId?.employeeId || "N/A",
          record.userId?.name || "N/A",
          record.department,
          record.position,
          record.workDays,
          record.totalDays,
          record.overtimeHours,
          record.leaveDays,
          record.lateDays,
          record.baseSalary,
          record.overtimePay,
          record.bonus,
          record.deductions,
          record.totalSalary,
          record.status,
        ].join(",")
      ),
    ].join("\n");

    // Add BOM for UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `Bangluong_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        return "Đã thanh toán";
      case "approved":
        return "Đã duyệt";
      case "pending":
        return "Chờ duyệt";
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

  const stats = {
    totalEmployees: payrollData.length,
    totalPayroll: payrollData.reduce((sum, r) => sum + r.totalSalary, 0),
    avgSalary:
      payrollData.length > 0
        ? payrollData.reduce((sum, r) => sum + r.totalSalary, 0) /
          payrollData.length
        : 0,
    pendingApproval: payrollData.filter((r) => r.status === "pending").length,
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
            <h1 className="text-3xl text-[var(--text-main)] flex items-center space-x-3">
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                💰
              </motion.span>
              <span>Bảng lương</span>
            </h1>
            <p className="text-[var(--text-sub)]">
              Tính công và quản lý lương nhân viên
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-[var(--success)] to-[var(--accent-cyan)] hover:opacity-90 shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng nhân viên",
            value: stats.totalEmployees,
            color: "primary",
            icon: Users,
            suffix: "",
            delay: 0.1,
          },
          {
            label: "Tổng quỹ lương",
            value: stats.totalPayroll,
            color: "success",
            icon: DollarSign,
            format: "currency",
            delay: 0.2,
          },
          {
            label: "TB lương/người",
            value: stats.avgSalary,
            color: "accent-cyan",
            icon: TrendingUp,
            format: "currency",
            delay: 0.3,
          },
          {
            label: "Chờ duyệt",
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
                    placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
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
                  <SelectValue placeholder="Phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="paid">Đã thanh toán</SelectItem>
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
              Chi tiết bảng lương -{" "}
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
                      Mã NV
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)]">
                      Họ tên
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)]">
                      Phòng ban
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      Ngày công
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      Tăng ca (h)
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      Lương CB
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      Tăng ca
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      Thưởng
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      Khấu trừ
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-right">
                      Tổng
                    </TableHead>
                    <TableHead className="text-[var(--text-sub)] text-center">
                      Trạng thái
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
                            Đang tải dữ liệu...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record, index) => (
                      <motion.tr
                        key={record._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                        className="border-[var(--border)] hover:bg-[var(--shell)] transition-colors"
                      >
                        <TableCell className="text-[var(--text-main)]">
                          {record.employeeId ||
                            record.userId?.employeeId ||
                            "N/A"}
                        </TableCell>
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
                      </motion.tr>
                    ))
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {!loading && filteredData.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">💼</div>
                <p className="text-[var(--text-sub)]">Không tìm thấy dữ liệu</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
