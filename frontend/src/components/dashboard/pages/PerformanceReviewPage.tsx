import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Award,
  TrendingUp,
  Target,
  Star,
  Calendar,
  Users,
  FileText,
  Plus,
  Eye,
  Edit,
  Download,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import {
  performanceService,
  type PerformanceReview,
} from "@/services/performanceService";
import { getAllUsers } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import ReviewFormModal from "@/components/dashboard/pages/ReviewFormModal";
import api from "@/services/api";

export default function PerformanceReviewPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "pending" | "draft" | "rejected"
  >("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    avgScore: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(
    null
  );
  const [employees, setEmployees] = useState<
    Array<{ _id: string; fullName: string; position: string }>
  >([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Get user role from auth context
  const { user } = useAuth();
  const userRole = user?.role || "EMPLOYEE";
  const isManager = userRole === "MANAGER";
  const isHROrAbove = ["HR_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole);

  const fetchEmployees = useCallback(async () => {
    try {
      let data: any;

      if (isManager) {
        const response = await api.get("/users/my-team");
        data = response.data;
      } else {
        data = await getAllUsers();
      }

      // Map data to ensure fullName and position are availabe
      const mappedEmployees = (data.users || []).map((user: any) => ({
        _id: user._id,
        fullName: user.fullName || user.name,
        position: user.position || user.role || t('dashboard:performanceReview.employee'),
      }));
      setEmployees(mappedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  }, [isManager]);

  const fetchAvailablePeriods = useCallback(async () => {
    try {
      const data = await performanceService.getAvailablePeriods();
      setAvailablePeriods(data.periods || []);
    } catch (error) {
      console.error("Error fetching periods:", error);
      setAvailablePeriods([]);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await performanceService.getReviews({
        period: filterPeriod !== "all" ? filterPeriod : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: searchQuery || undefined,
      });
      setReviews(data.reviews || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách đánh giá");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await performanceService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAvailablePeriods();
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [filterPeriod, filterStatus]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-dep
  }, [searchQuery]);

  const getScoreColor = useCallback((score: number) => {
    if (score >= 90) return "text-[var(--success)]";
    if (score >= 75) return "text-[var(--warning)]";
    if (score >= 60) return "text-[var(--accent-cyan)]";
    return "text-[var(--error)]";
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--success)]/20 text-[var(--success)]";
      case "pending":
        return "bg-[var(--warning)]/20 text-[var(--warning)]";
      case "rejected":
        return "bg-[var(--error)]/20 text-[var(--error)]";
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "pending":
        return "Chờ đánh giá";
      case "rejected":
        return "Bị từ chối";

    }
  }, []);

  const handleOpenReview = useCallback((review: PerformanceReview) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  }, []);

  const handleCreateReview = useCallback(() => {
    setSelectedReview(null);
    setIsModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    fetchReviews();
    fetchStats();
  }, [fetchReviews, fetchStats]);

  const handleExport = async () => {
    try {
      const data = await performanceService.exportReviews({
        period: filterPeriod !== "all" ? filterPeriod : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });

      // Convert to CSV and download
      const csvContent = convertToCSV(data.data);
      downloadCSV(csvContent, `performance-reviews-${new Date().toISOString().split('T')[0]}.csv`);

      toast.success(`📥 Đã xuất ${data.total} đánh giá`);
    } catch (error) {
      toast.error("Lỗi khi xuất báo cáo");
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header] || "";
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleReject = async (review: PerformanceReview) => {
    const reason = prompt("Nhập lý do reject:");
    if (!reason || reason.trim() === "") {
      toast.error("Vui lòng nhập lý do reject");
      return;
    }

    try {
      await performanceService.rejectReview(review._id, reason);
      toast.success("Đã reject đánh giá");
      fetchReviews();
      fetchStats();
    } catch (error) {
      toast.error("Lỗi khi reject đánh giá");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent select-none">
            {t('dashboard:performanceReview.title')}
          </h1>
          <p className="text-[var(--text-sub)] mt-2 select-none">
            {isManager
              ? "Tạo và gửi đánh giá hiệu suất cho nhân viên"
              : "Quản lý và phê duyệt đánh giá hiệu suất"}
          </p>
        </div>
        <div className="flex gap-2">
          {isHROrAbove && (
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          )}
          <Button
            onClick={handleCreateReview}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isManager ? "Tạo đánh giá" : "Tạo đánh giá"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-[var(--surface)] border-[var(--border)]">
            <CardContent className="p-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-sub)] select-none">Tổng số</p>
                  <p className="text-3xl text-[var(--primary)] mt-2 select-none">
                    {stats.total}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[var(--primary)]" />
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
                  <p className="text-sm text-[var(--text-sub)] select-none">Hoàn thành</p>
                  <p className="text-3xl text-[var(--success)] mt-2 select-none">
                    {stats.completed}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
                  <Award className="h-6 w-6 text-[var(--success)]" />
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
                  <p className="text-sm text-[var(--text-sub)] select-none">Chờ đánh giá</p>
                  <p className="text-3xl text-[var(--warning)] mt-2 select-none">
                    {stats.pending}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--warning)]/20 flex items-center justify-center">
                  <Target className="h-6 w-6 text-[var(--warning)]" />
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
                  <p className="text-sm text-[var(--text-sub)] select-none">Điểm TB</p>
                  <p className="text-3xl text-[var(--accent-cyan)] mt-2 select-none">
                    {stats.avgScore || "N/A"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-[var(--accent-cyan)]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--surface)] border-[var(--border)]">
        <CardContent className="p-6 mt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-sub)]" />
                <Input
                  placeholder={t('dashboard:performanceReview.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]"
                />
              </div>
            </div>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder="Kỳ đánh giá" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kỳ</SelectItem>
                {availablePeriods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-full md:w-[180px] bg-[var(--shell)] border-[var(--border)] text-[var(--text-main)]">
                <SelectValue placeholder={t('dashboard:performanceReview.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="rejected">Bị từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 select-none">
            <p className="text-[var(--text-sub)]">Đang tải...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 select-none">
            <FileText className="h-16 w-16 text-[var(--text-sub)] mx-auto mb-4" />
            <p className="text-[var(--text-sub)]">Không có đánh giá nào</p>
          </div>
        ) : (
          reviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)] transition-all">
                <CardContent className="p-6 mt-4">
                  <div className="flex items-start gap-6">
                    {/* Employee Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-lg">
                            {(review.employeeId.fullName || review.employeeId.name || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg text-[var(--text-main)] select-none">
                            {review.employeeId.fullName || review.employeeId.name}
                          </h3>
                          <p className="text-sm text-[var(--text-sub)] select-none">
                            {review.employeeId.position || t('dashboard:performanceReview.employee')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(review.status)}>
                            {getStatusText(review.status)}
                          </Badge>

                          {/* Action Buttons */}
                          {(isHROrAbove ||
                            (isManager &&
                              ["draft", "pending", "rejected"].includes(
                                review.status
                              ))) ? (
                            <Button
                              onClick={() => handleOpenReview(review)}
                              variant="outline"
                              size="sm"
                              className="border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {review.status === "pending" && isHROrAbove
                                ? "Phê duyệt"
                                : "Sửa"}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleOpenReview(review)}
                              variant="outline"
                              size="sm"
                              className="border-[var(--border)] text-[var(--text-main)]"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xem
                            </Button>
                          )}

                          {isHROrAbove && review.status === "pending" && (
                            <Button
                              onClick={() => handleReject(review)}
                              variant="outline"
                              size="sm"
                              className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Từ chối
                            </Button>
                          )}
                        </div>
                      </div>

                      {review.status === "completed" && (
                        <>
                          {/* Overall Score */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-[var(--text-sub)] select-none">
                                Điểm tổng quan
                              </span>
                              <div className="flex items-center gap-2">
                                <Star
                                  className={`h-5 w-5 ${getScoreColor(
                                    review.overallScore
                                  )}`}
                                />
                                <span
                                  className={`text-2xl select-none ${getScoreColor(
                                    review.overallScore
                                  )}`}
                                >
                                  {review.overallScore}
                                </span>
                                <span className="text-sm text-[var(--text-sub)] select-none">
                                  / 100
                                </span>
                              </div>
                            </div>
                            <Progress
                              value={review.overallScore}
                              className="h-2"
                            />
                          </div>

                          {/* Category Scores */}
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            {Object.entries(review.categories).map(
                              ([key, value]) => (
                                <div key={key} className="text-center">
                                  <div
                                    className={`text-xl select-none ${getScoreColor(value)}`}
                                  >
                                    {value}
                                  </div>
                                  <div className="text-xs text-[var(--text-sub)] mt-1 select-none">
                                    {key === "technical"
                                      ? "Kỹ thuật"
                                      : key === "communication"
                                        ? "Giao tiếp"
                                        : key === "teamwork"
                                          ? "Teamwork"
                                          : key === "leadership"
                                            ? "Lãnh đạo"
                                            : "Giải quyết"}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-6 text-sm text-[var(--text-sub)] mb-4 select-none">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{review.period}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                Đánh giá bởi: {review.reviewerId.fullName || review.reviewerId.name}
                              </span>
                            </div>
                            {review.reviewDate && (
                              <div>
                                Ngày:{" "}
                                {new Date(review.reviewDate).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </div>
                            )}
                          </div>

                          {review.comments && (
                            <div className="p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)] select-none">
                              <p className="text-sm text-[var(--text-sub)] mb-1">
                                💬 Nhận xét:
                              </p>
                              <p className="text-sm text-[var(--text-main)]">
                                {review.comments}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {review.status === "pending" && (
                        <div className="text-center py-8 select-none">
                          <Target className="h-12 w-12 text-[var(--warning)] mx-auto mb-3" />
                          <p className="text-[var(--text-sub)]">
                            Chưa có đánh giá cho kỳ này
                          </p>
                        </div>
                      )}

                      {review.status === "rejected" && review.rejectionReason && (
                        <div className="p-4 rounded-lg bg-[var(--error)]/10 border border-[var(--error)] select-none">
                          <p className="text-sm font-medium text-[var(--error)] mb-2">
                            ❌ Đánh giá bị từ chối
                          </p>
                          <p className="text-sm text-[var(--text-main)]">
                            <strong>Lý do:</strong> {review.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <ReviewFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        review={selectedReview}
        onSuccess={handleModalSuccess}
        employees={employees}
      />
    </div>
  );
}
