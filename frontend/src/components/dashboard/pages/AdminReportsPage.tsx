import { useState, useEffect, useCallback } from "react";
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
import { getAttendanceAnalytics, exportAttendanceAnalytics } from "@/services/attendanceService";

interface DailyData {
  date: string;
  present: number;
  late: number;
  absent: number;
  overtime?: number;
}

interface DepartmentStat {
  department: string;
  onTime: number;
  late: number;
  absent: number;
  totalEmployees?: number;
}

interface TopPerformer {
  name: string;
  avgCheckIn?: string;
  onTime: number;
  late: number;
  absent: number;
  punctuality: number;
}

interface AnalyticsData {
  dailyData: DailyData[];
  departmentStats: DepartmentStat[];
  topPerformers: TopPerformer[];
  summary: {
    attendanceRate: number;
    avgPresent: number;
    avgLate: number;
    avgAbsent: number;
    trend: number;
    totalEmployees?: number;
    total?: number;
    ontime?: number;
    late?: number;
    absent?: number;
  };
}

interface AnalyticsParams {
  from?: string;
  to?: string;
  department?: string;
  [key: string]: unknown;
}

export default function AdminReportsPage() {
  const { t } = useTranslation(["dashboard", "common"]);
  const [timeRange, setTimeRange] = useState("week");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData>({
    dailyData: [],
    departmentStats: [],
    topPerformers: [],
    summary: {
      attendanceRate: 0,
      avgPresent: 0,
      avgLate: 0,
      avgAbsent: 0,
      trend: 0,
      total: 0,
      ontime: 0,
      late: 0,
      absent: 0
    }
  });

  // Fetch analytics data from API
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params: AnalyticsParams = {};
      const today = new Date();
      const from = new Date();

      // Calculate date range based on selected timeRange
      if (timeRange === "week") {
        from.setDate(today.getDate() - 7);
      } else if (timeRange === "month") {
        from.setDate(today.getDate() - 30);
      } else if (timeRange === "quarter") {
        from.setDate(today.getDate() - 90);
      } else if (timeRange === "year") {
        from.setDate(today.getDate() - 365);
      }

      params.from = from.toISOString().split("T")[0];
      params.to = today.toISOString().split("T")[0];

      console.log('[AdminReports] Fetching with params:', params);
      const result = (await getAttendanceAnalytics(params)) as AnalyticsData;
      console.log('[AdminReports] API Response:', result);
      
      if (result) {
        console.log('[AdminReports] Summary data:', result.summary);
        console.log('[AdminReports] Daily data:', result.dailyData);
        console.log('[AdminReports] Department stats:', result.departmentStats);
        
        setData({
          dailyData: result.dailyData || [],
          departmentStats: result.departmentStats || [],
          topPerformers: result.topPerformers || [],
          summary: {
            attendanceRate: result.summary?.attendanceRate || 0,
            avgPresent: result.summary?.avgPresent || 0,
            avgLate: result.summary?.avgLate || 0,
            avgAbsent: result.summary?.avgAbsent || 0,
            trend: result.summary?.trend || 0,
            total: result.summary?.total || 0,
            ontime: result.summary?.ontime || 0,
            late: result.summary?.late || 0,
            absent: result.summary?.absent || 0,
            totalEmployees: result.summary?.totalEmployees || 0,
          },
        });
      }
    } catch (error) {
      console.error("[AdminReports] fetch error:", error);
      toast.error(t("dashboard:adminReports.loadError"));
    } finally {
      setLoading(false);
    }
  }, [timeRange, t]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async () => {
    try {
      const params: AnalyticsParams = {};
      const today = new Date();
      const from = new Date();

      if (timeRange === "week") {
        from.setDate(today.getDate() - 7);
      } else if (timeRange === "month") {
        from.setDate(today.getDate() - 30);
      } else if (timeRange === "quarter") {
        from.setDate(today.getDate() - 90);
      } else if (timeRange === "year") {
        from.setDate(today.getDate() - 365);
      }

      params.from = from.toISOString().split("T")[0];
      params.to = today.toISOString().split("T")[0];

      toast.loading(t("dashboard:adminReports.exportLoading"), { id: "export" });
      await exportAttendanceAnalytics(params);
      toast.success(
        t("dashboard:adminReports.exportSuccess") || "Xuất báo cáo thành công!",
        { id: "export" }
      );
    } catch (error) {
      toast.error(t("dashboard:adminReports.exportError"), { id: "export" });
    }
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
              ? (t("common:loading") || "Đang xuất...")
              : (t("dashboard:adminReports.export") || "Xuất báo cáo")}
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
                  <p className="text-3xl mt-2 text-[var(--text-main)]">
                    {loading ? "..." : data.summary.total || 0}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-[var(--success)]">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+{data.summary.trend || 0}%</span>
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
                  <p className="text-3xl mt-2 text-[var(--success)]">
                    {loading ? "..." : data.summary.ontime || 0}
                  </p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">
                    {data.summary.attendanceRate || 0}%
                  </p>
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
                  <p className="text-3xl mt-2 text-[var(--warning)]">
                    {loading ? "..." : data.summary.late || 0}
                  </p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">
                    {data.summary.total
                      ? ((data.summary.late || 0) / data.summary.total * 100).toFixed(1)
                      : 0}%
                  </p>
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
                  <p className="text-3xl mt-2 text-[var(--error)]">
                    {loading ? "..." : data.summary.absent || 0}
                  </p>
                  <p className="text-sm mt-2 text-[var(--text-sub)]">
                    {data.summary.total
                      ? ((data.summary.absent || 0) / data.summary.total * 100).toFixed(1)
                      : 0}%
                  </p>
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
                <LineChart data={data.dailyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="date" stroke="var(--text-sub)" />
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
                    dataKey="present"
                    stroke="#10B981"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.stats.ontime")}
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.stats.late")}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name={t("dashboard:adminReports.stats.absent")}
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
                {t("dashboard:adminReports.charts.departmentDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading || data.departmentStats.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-[var(--text-sub)]">
                  {loading ? t("common:loading") : t("common:noData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.departmentStats.map((dept, idx) => ({
                        name: dept.department,
                        value: dept.totalEmployees || dept.onTime || 1,
                        color: ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][idx % 5]
                      }))}
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
                      {data.departmentStats.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][index % 5]} 
                        />
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
              )}
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
                {t("dashboard:adminReports.charts.overtimeStats")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dailyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="date" stroke="var(--text-sub)" />
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
                {t("dashboard:adminReports.charts.topEmployees")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading || data.topPerformers.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-sub)]">
                    {loading ? t("common:loading") : t("common:noData")}
                  </div>
                ) : (
                  data.topPerformers.map((emp, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)] hover:bg-[var(--shell)]/80 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] flex items-center justify-center text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-[var(--text-main)]">{emp.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--success)] font-semibold">
                          {emp.punctuality}%
                        </p>
                        <p className="text-xs text-[var(--text-sub)]">
                          {t("dashboard:adminReports.charts.attendanceRate")}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

