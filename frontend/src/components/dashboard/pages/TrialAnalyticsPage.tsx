import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface TrialAnalyticsData {
  overview: {
    totalTrialSignups: number;
    activeTrials: number;
    expiredTrials: number;
    convertedTrials: number;
    conversionRate: string;
    timestamp: string;
  };
  trends: {
    dailySignups: Array<{ date: string; count: number }>;
    conversionTrend: Array<{ date: string; conversions: number }>;
  };
  conversion: {
    byPlan: Array<{ plan: string; conversions: number }>;
    averageTimeToConvert: number;
  };
  engagement: {
    loginRate: string;
    featureUsageRate: string;
    requestCreationRate: string;
    averageSessionDuration: string;
    mostUsedFeatures: Array<{ feature: string; usage: number }>;
  };
  trialDuration: {
    average: number;
    median: number;
    distribution: Array<{ range: string; count: number }>;
  };
}

const TrialAnalyticsPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const [analyticsData, setAnalyticsData] = useState<TrialAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrialAnalytics();
  }, []);

  const fetchTrialAnalytics = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API call
      const mockData: TrialAnalyticsData = {
        overview: {
          totalTrialSignups: 247,
          activeTrials: 89,
          expiredTrials: 23,
          convertedTrials: 135,
          conversionRate: "54.7%",
          timestamp: new Date().toISOString(),
        },
        trends: {
          dailySignups: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 15) + 5,
          })),
          conversionTrend: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            conversions: Math.floor(Math.random() * 8) + 1,
          })),
        },
        conversion: {
          byPlan: [
            { plan: "EMPLOYEE", conversions: 89 },
            { plan: "MANAGER", conversions: 32 },
            { plan: "HR_MANAGER", conversions: 14 },
          ],
          averageTimeToConvert: 5,
        },
        engagement: {
          loginRate: "78.5%",
          featureUsageRate: "65.2%",
          requestCreationRate: "34.1%",
          averageSessionDuration: "14.2 minutes",
          mostUsedFeatures: [
            { feature: "Chấm công", usage: 198 },
            { feature: "Xem lịch sử", usage: 156 },
            { feature: "Tạo yêu cầu", usage: 84 },
            { feature: "Xem lịch làm việc", usage: 102 },
            { feature: "Xem hồ sơ", usage: 67 },
          ],
        },
        trialDuration: {
          average: 5,
          median: 4,
          distribution: [
            { range: "1-3 days", count: 67 },
            { range: "4-7 days", count: 98 },
            { range: "8-14 days", count: 34 },
            { range: "15+ days", count: 15 },
          ],
        },
      };

      setAnalyticsData(mockData);
      setError(null);
    } catch (err) {
      setError("Không thể tải dữ liệu analytics");
      console.error("Error fetching trial analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-sub)]">Đang tải dữ liệu analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || "Có lỗi xảy ra"}</p>
          <Button onClick={fetchTrialAnalytics} className="mt-4">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const { overview, trends, conversion, engagement, trialDuration } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            📊 Trial Analytics Dashboard
          </h1>
          <p className="text-[var(--text-sub)] mt-1">
            Theo dõi hiệu suất chương trình dùng thử
          </p>
        </div>
        <Button onClick={fetchTrialAnalytics} variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Tổng đăng ký trial</p>
                  <p className="text-2xl font-bold text-[var(--text-main)]">
                    {overview.totalTrialSignups}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Trial đang active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {overview.activeTrials}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Đã chuyển đổi</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {overview.convertedTrials}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)]">Tỷ lệ chuyển đổi</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {overview.conversionRate}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
          <TabsTrigger value="conversion">Chuyển đổi</TabsTrigger>
          <TabsTrigger value="engagement">Tương tác</TabsTrigger>
          <TabsTrigger value="duration">Thời gian</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Đăng ký trial theo ngày (30 ngày)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.dailySignups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      formatter={(value: number) => [value, 'Đăng ký']}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Chuyển đổi theo ngày (30 ngày)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends.conversionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      formatter={(value: number) => [value, 'Chuyển đổi']}
                    />
                    <Bar dataKey="conversions" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chuyển đổi theo gói</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={conversion.byPlan}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ plan, conversions }) => `${plan}: ${conversions}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="conversions"
                    >
                      {conversion.byPlan.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thống kê chuyển đổi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-[var(--text-sub)]">Thời gian trung bình để chuyển đổi</span>
                  <Badge variant="secondary">{conversion.averageTimeToConvert} ngày</Badge>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Chi tiết theo gói:</h4>
                  {conversion.byPlan.map((plan, index) => (
                    <div key={plan.plan} className="flex justify-between items-center">
                      <span className="text-sm">{plan.plan}</span>
                      <Badge variant="outline">{plan.conversions} users</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tỷ lệ tương tác</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Tỷ lệ đăng nhập</span>
                  <Badge className="bg-blue-500">{engagement.loginRate}</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Tỷ lệ sử dụng tính năng</span>
                  <Badge className="bg-green-500">{engagement.featureUsageRate}</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Tỷ lệ tạo yêu cầu</span>
                  <Badge className="bg-orange-500">{engagement.requestCreationRate}</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Thời gian phiên trung bình</span>
                  <Badge className="bg-purple-500">{engagement.averageSessionDuration}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tính năng được sử dụng nhiều nhất</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {engagement.mostUsedFeatures.map((feature, index) => (
                    <div key={feature.feature} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span>{feature.feature}</span>
                      </div>
                      <Badge variant="outline">{feature.usage} users</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thời gian trial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Thời gian trung bình</span>
                  <Badge className="bg-blue-500">{trialDuration.average} ngày</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-[var(--text-sub)]">Thời gian trung vị</span>
                  <Badge className="bg-green-500">{trialDuration.median} ngày</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phân bố thời gian chuyển đổi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trialDuration.distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrialAnalyticsPage;
