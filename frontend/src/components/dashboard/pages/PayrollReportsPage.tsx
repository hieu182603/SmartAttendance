import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  BarChart3,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import {
  getPayrollReports,
  type PayrollSummary,
  type DepartmentPayroll,
  type MonthlyTrendPoint,
} from "../../../services/payrollService";

const COLORS = ["#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444"];

const formatCompactCurrency = (amount: number): string => {
  if (!amount) return "0";
  return `${(amount / 1_000_000).toFixed(0)}M`;
};

const formatFullCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const PayrollReportsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [summary, setSummary] = useState<PayrollSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentData, setDepartmentData] = useState<DepartmentPayroll[]>([]);
  const [trendData, setTrendData] = useState<MonthlyTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(
    async (monthFilter?: string, shouldInitializeMonth = false) => {
      setLoading(true);
      try {
        const result = await getPayrollReports(
          monthFilter ? { month: monthFilter } : {}
        );
        setSummary(result.summary || []);
        setDepartmentData(result.departments || []);
        setTrendData(result.monthlyTrend || []);

        if (
          shouldInitializeMonth &&
          !selectedMonth &&
          result.summary &&
          result.summary.length > 0
        ) {
          setSelectedMonth(result.summary[0].month);
        }
      } catch (error) {
        console.error("[PayrollReports] fetch error:", error);
        toast.error(t('dashboard:payrollReports.error'));
      } finally {
        setLoading(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    fetchReports(undefined, true);
  }, [fetchReports]);

  useEffect(() => {
    if (selectedMonth) {
      fetchReports(selectedMonth);
    }
  }, [selectedMonth, fetchReports]);

  const currentPayroll =
    summary.find((item) => item.month === selectedMonth) || summary[0];

  const currentIndex = summary.findIndex(
    (item) => item.month === currentPayroll?.month
  );
  const previousPayroll =
    currentIndex >= 0 ? summary[currentIndex + 1] : undefined;

  const salaryChange =
    currentPayroll && previousPayroll
      ? (
          ((currentPayroll.totalSalary - previousPayroll.totalSalary) /
            previousPayroll.totalSalary) *
          100
        ).toFixed(1)
      : null;

  const employeeChange =
    currentPayroll && previousPayroll
      ? currentPayroll.totalEmployees - previousPayroll.totalEmployees
      : 0;

  const filteredDepartments = useMemo(() => {
    if (!searchQuery) return departmentData;
    return departmentData.filter((dept) =>
      dept.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departmentData, searchQuery]);

  const handleExport = (): void => {
    toast.success(t('dashboard:payrollReports.exporting'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            {t('dashboard:payrollReports.title')}
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            {t('dashboard:payrollReports.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedMonth}
            onValueChange={(value) => setSelectedMonth(value)}
            disabled={!summary.length}
          >
            <SelectTrigger className="w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {summary.map((item) => (
                <SelectItem key={item.month} value={item.month}>
                  {item.month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard:payrollReports.export')}
          </Button>
        </div>
      </div>

      {!currentPayroll ? (
        <Card className="bg-[var(--surface)] border-[var(--border)]">
          <CardContent className="py-16 text-center text-[var(--text-sub)]">
            {t('common:noData')}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">
                        {t('dashboard:payrollReports.stats.totalSalary')}
                      </p>
                      <p className="text-2xl text-[var(--primary)] mt-2">
                        {formatCompactCurrency(currentPayroll.totalSalary)}
                      </p>
                      {salaryChange && (
                        <div className="flex items-center gap-1 mt-2">
                          {parseFloat(salaryChange) >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-[var(--success)]" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-[var(--error)]" />
                          )}
                          <span
                            className={`text-xs ${
                              parseFloat(salaryChange) >= 0
                                ? "text-[var(--success)]"
                                : "text-[var(--error)]"
                            }`}
                          >
                            {salaryChange}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">
                        {t('dashboard:payrollReports.stats.employees')}
                      </p>
                      <p className="text-2xl text-[var(--accent-cyan)] mt-2">
                        {currentPayroll.totalEmployees}
                      </p>
                      {previousPayroll && (
                        <Badge className="bg-[var(--success)]/20 text-[var(--success)] mt-2">
                          {employeeChange >= 0 ? "+" : ""}
                          {employeeChange} người
                        </Badge>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                      <Users className="h-6 w-6 text-[var(--accent-cyan)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">Thưởng</p>
                      <p className="text-2xl text-[var(--warning)] mt-2">
                        {formatCompactCurrency(currentPayroll.totalBonuses)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-[var(--warning)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-sub)]">Lương TB</p>
                      <p className="text-2xl text-[var(--success)] mt-2">
                        {formatCompactCurrency(currentPayroll.avgSalary)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-[var(--success)]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[var(--surface)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-main)]">
                  Xu hướng chi phí lương
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
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
                      formatter={(value: number) => `${value} triệu`}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#8B5CF6" name={t('dashboard:payrollReports.stats.totalSalary') + ' (triệu)'} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[var(--surface)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-main)]">
                  {t('dashboard:payrollReports.charts.departmentDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={
                        departmentData as unknown as Record<string, unknown>[]
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ payload }) =>
                        `${payload?.department ?? ""} ${
                          payload?.percentage ?? 0
                        }%`
                      }
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.department}`}
                          fill={COLORS[index % COLORS.length]}
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
                      formatter={(value: number, _name, payload) =>
                        `${payload?.payload?.department}: ${value}%`
                      }
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-[var(--text-main)]">
                Chi tiết theo phòng ban
              </CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-sub)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm phòng ban..."
                  className="pl-10 bg-[var(--shell)] border-[var(--border)]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredDepartments.map((dept, index) => (
                  <motion.div
                    key={dept.department}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg bg-[var(--shell)] border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-[var(--text-main)]">
                          {dept.department}
                        </h3>
                        <p className="text-sm text-[var(--text-sub)]">
                          {dept.employees} nhân viên
                        </p>
                      </div>
                      <Badge
                        style={{
                          backgroundColor: `${COLORS[index % COLORS.length]}40`,
                          color: COLORS[index % COLORS.length],
                        }}
                      >
                        {dept.percentage}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">
                          {t('dashboard:payrollReports.stats.totalSalary')}
                        </p>
                        <p className="text-lg text-[var(--primary)]">
                          {formatCompactCurrency(dept.totalSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">
                          Lương TB
                        </p>
                        <p className="text-lg text-[var(--accent-cyan)]">
                          {formatCompactCurrency(dept.avgSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-sub)]">
                          Chi phí/người
                        </p>
                        <p className="text-lg text-[var(--success)]">
                          {formatCompactCurrency(
                            dept.employees
                              ? dept.totalSalary / dept.employees
                              : 0
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {!filteredDepartments.length && (
                  <p className="text-center text-sm text-[var(--text-sub)] py-6">
                    Không tìm thấy phòng ban phù hợp
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)]">
                Tổng kết {currentPayroll.month}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                    <span className="text-[var(--text-sub)]">
                      {t('dashboard:payrollReports.stats.baseSalary')}
                    </span>
                    <span className="text-[var(--text-main)]">
                      {formatFullCurrency(currentPayroll.totalSalary)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                    <span className="text-[var(--text-sub)]">Tổng thưởng</span>
                    <span className="text-[var(--success)]">
                      +{formatFullCurrency(currentPayroll.totalBonuses)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--shell)]">
                    <span className="text-[var(--text-sub)]">
                      Tổng khấu trừ
                    </span>
                    <span className="text-[var(--error)]">
                      -{formatFullCurrency(currentPayroll.totalDeductions)}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-6 rounded-lg bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border border-[var(--border)]">
                    <p className="text-sm text-[var(--text-sub)] mb-2">
                      Tổng chi phí thực tế
                    </p>
                    <p className="text-3xl text-[var(--primary)]">
                      {formatFullCurrency(currentPayroll.netPay)}
                    </p>
                    <p className="text-sm text-[var(--text-sub)] mt-2">
                      Cho {currentPayroll.totalEmployees} nhân viên
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <div className="text-center text-sm text-[var(--text-sub)]">
          Đang tải dữ liệu...
        </div>
      )}
    </div>
  );
};

export default PayrollReportsPage;

