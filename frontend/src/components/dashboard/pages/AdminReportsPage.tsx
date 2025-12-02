import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Download,
  TrendingUp,
  Calendar,
  BarChart3,
  Users,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Mock data - Replace with API calls
const monthlyData = [
  { month: "T1", ontime: 420, late: 15, absent: 10, overtime: 25 },
  { month: "T2", ontime: 410, late: 20, absent: 15, overtime: 30 },
  { month: "T3", ontime: 430, late: 12, absent: 8, overtime: 28 },
  { month: "T4", ontime: 425, late: 18, absent: 12, overtime: 32 },
  { month: "T5", ontime: 435, late: 10, absent: 9, overtime: 35 },
  { month: "T6", ontime: 440, late: 8, absent: 7, overtime: 40 },
];

const departmentData = [
  { name: "IT", value: 18, color: "#6366F1" },
  { name: "HR", value: 8, color: "#06B6D4" },
  { name: "Sales", value: 12, color: "#10B981" },
  { name: "Marketing", value: 10, color: "#F59E0B" },
  { name: "Khác", value: 4, color: "#EF4444" },
];

const topPerformers = [
  { name: "Nguyễn Văn A", attendance: 98, rank: 1 },
  { name: "Trần Thị B", attendance: 96, rank: 2 },
  { name: "Lê Văn C", attendance: 95, rank: 3 },
  { name: "Phạm Thị D", attendance: 94, rank: 4 },
  { name: "Hoàng Văn E", attendance: 93, rank: 5 },
];

export default function AdminReportsPage() {
  const { t } = useTranslation(["dashboard", "common"]);
  const [timeRange, setTimeRange] = useState("month");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    setLoading(true);
    // Simulate export
    setTimeout(() => {
      setLoading(false);
      toast.success(t("dashboard:adminReports.exportSuccess") || "Xuất báo cáo thành công!");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            {t("dashboard:adminReports.title") || "Báo cáo & Thống kê"}
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            {t("dashboard:adminReports.description") || "Phân tích chi tiết chấm công"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--surface)] border-[var(--border)]">
              <SelectItem value="week">
                {t("dashboard:adminReports.timeRange.week") || "Tuần này"}
              </SelectItem>
              <SelectItem value="month">
                {t("dashboard:adminReports.timeRange.month") || "Tháng này"}
              </SelectItem>
              <SelectItem value="quarter">
                {t("dashboard:adminReports.timeRange.quarter") || "Quý này"}
              </SelectItem>
              <SelectItem value="year">
                {t("dashboard:adminReports.timeRange.year") || "Năm này"}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading
              ? t("common:loading") || "Đang xuất..."
              : t("dashboard:adminReports.export") || "Xuất báo cáo"}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:adminReports.stats.total") || "Tổng công"}
                  </p>
                  <p className="text-3xl mt-2 text-[var(--text-main)]">2,670</p>
                  <div className="flex items-center mt-2 text-sm text-[var(--success)]">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+8.2%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--accent-cyan)]/10">
                  <Calendar className="h-6 w-6 text-[var(--accent-cyan)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:adminReports.stats.ontime") || "Đúng giờ"}
                  </p>
                  <p className="text-3xl mt-2 text-[var(--success)]">2,560</p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">95.9%</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--success)]/10">
                  <Clock className="h-6 w-6 text-[var(--success)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:adminReports.stats.late") || "Đi muộn"}
                  </p>
                  <p className="text-3xl mt-2 text-[var(--warning)]">83</p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">3.1%</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--warning)]/10">
                  <TrendingUp className="h-6 w-6 text-[var(--warning)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">
                    {t("dashboard:adminReports.stats.absent") || "Vắng mặt"}
                  </p>
                  <p className="text-3xl mt-2 text-[var(--error)]">61</p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">2.3%</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--error)]/10">
                  <Users className="h-6 w-6 text-[var(--error)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)]">
                {t("dashboard:adminReports.charts.trend") || "Xu hướng 6 tháng"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="month" stroke="var(--text-sub)" />
                  <YAxis stroke="var(--text-sub)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ontime"
                    stroke="#10B981"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.charts.ontime") || "Đúng giờ"}
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.charts.late") || "Đi muộn"}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.charts.absent") || "Vắng"}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)]">
                {t("dashboard:adminReports.charts.department") ||
                  "Phân bổ theo phòng ban"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overtime Trend Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)]">
                {t("dashboard:adminReports.charts.overtime") ||
                  "Thống kê tăng ca"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="month" stroke="var(--text-sub)" />
                  <YAxis stroke="var(--text-sub)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
                    }}
                  />
                  <Bar
                    dataKey="overtime"
                    fill="#6366F1"
                    radius={[8, 8, 0, 0]}
                    name={t("dashboard:adminReports.charts.overtimeHours") || "Giờ tăng ca"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)]">
                {t("dashboard:adminReports.charts.topPerformers") ||
                  "Nhân viên xuất sắc"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((emp) => (
                  <motion.div
                    key={emp.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + emp.rank * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white text-sm font-semibold">
                        {emp.rank}
                      </div>
                      <span className="text-[var(--text-main)]">{emp.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--success)] font-semibold">
                        {emp.attendance}%
                      </p>
                      <p className="text-xs text-[var(--text-sub)]">
                        {t("dashboard:adminReports.charts.attendanceRate") ||
                          "Tỷ lệ chấm công"}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

