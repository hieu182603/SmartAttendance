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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  type CreateReviewData,
} from "@/services/performanceService";
import { getAllUsers } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
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
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [employees, setEmployees] = useState<Array<{ _id: string; fullName: string; position: string }>>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<CreateReviewData>({
    employeeId: "",
    period: "",
    status: "draft",
    categories: {
      technical: 0,
      communication: 0,
      teamwork: 0,
      leadership: 0,
      problemSolving: 0,
    },
    achievements: [],
    improvements: [],
    comments: "",
  });
  const [formLoading, setFormLoading] = useState(false);

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

  const generatePeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const options: Array<{ value: string; label: string }> = [];
    for (let q = 1; q <= 4; q++) {
      options.push({ value: `Q${q} ${currentYear}`, label: `Q${q} ${currentYear} (Quý ${q})` });
    }
    if (selectedReview?.period && !options.find(opt => opt.value === selectedReview.period)) {
      options.push({ value: selectedReview.period, label: selectedReview.period });
    }
    return options;
  };

  const calculateOverallScore = () => {
    const { technical = 0, communication = 0, teamwork = 0, leadership = 0, problemSolving = 0 } = formData.categories || {};
    return Math.round((technical + communication + teamwork + leadership + problemSolving) / 5);
  };

  const handleOpenReview = useCallback((review: PerformanceReview) => {
    setSelectedReview(review);
    setFormData({
      employeeId: review.employeeId?._id || "",
      period: review.period || "",
      status: review.status || "draft",
      categories: review.categories || { technical: 0, communication: 0, teamwork: 0, leadership: 0, problemSolving: 0 },
      achievements: review.achievements || [],
      improvements: review.improvements || [],
      comments: review.comments || "",
    });
    setIsModalOpen(true);
  }, []);

  const handleCreateReview = useCallback(() => {
    setSelectedReview(null);
    setFormData({
      employeeId: "",
      period: "",
      status: "draft",
      categories: { technical: 0, communication: 0, teamwork: 0, leadership: 0, problemSolving: 0 },
      achievements: [],
      improvements: [],
      comments: "",
    });
    setIsModalOpen(true);
  }, []);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (selectedReview) {
        await performanceService.updateReview(selectedReview._id, formData);
        toast.success("Cập nhật đánh giá thành công");
      } else {
        await performanceService.createReview(formData);
        toast.success("Tạo đánh giá thành công");
      }
      fetchReviews();
      fetchStats();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setFormLoading(false);
    }
  };

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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-[var(--surface)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border-b border-[var(--border)] p-6 flex items-start justify-between backdrop-blur-sm z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent select-none">
                  {selectedReview ? "Chỉnh sửa đánh giá" : "Tạo đánh giá mới"}
                </h2>
                {selectedReview && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--text-sub)] select-none">
                    <span>👤 <strong className="text-[var(--text-main)]">{selectedReview.reviewerId?.fullName || selectedReview.reviewerId?.name || "N/A"}</strong></span>
                    {selectedReview.createdAt && <span>📅 {new Date(selectedReview.createdAt).toLocaleString("vi-VN")}</span>}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="text-[var(--text-sub)] hover:text-[var(--text-main)]">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase">Thông tin cơ bản</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[var(--text-main)] mb-2 block">Nhân viên</Label>
                    {selectedReview ? (
                      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[var(--text-main)]">
                        {selectedReview.employeeId?.fullName || selectedReview.employeeId?.name} - {selectedReview.employeeId?.position}
                      </div>
                    ) : (
                      <Select value={formData.employeeId || undefined} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                        <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                          <SelectValue placeholder="Chọn nhân viên" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp._id} value={emp._id}>{emp.fullName} - {emp.position}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)] mb-2 block">Kỳ đánh giá</Label>
                    <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                      <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                        <SelectValue placeholder="Chọn kỳ đánh giá" />
                      </SelectTrigger>
                      <SelectContent>
                        {generatePeriodOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase">Trạng thái</h3>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Nháp</SelectItem>
                    <SelectItem value="pending">{isManager ? "Gửi đánh giá" : "Chờ phê duyệt"}</SelectItem>
                    {isHROrAbove && (
                      <>
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories */}
              <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase">Điểm đánh giá</h3>
                  <div className="text-right bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 px-4 py-2 rounded-lg border border-[var(--primary)]/30">
                    <p className="text-xs text-[var(--text-sub)]">Điểm tổng quan</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                      {calculateOverallScore()}<span className="text-sm text-[var(--text-sub)]">/100</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(formData.categories || {}).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs text-[var(--text-sub)] block text-center">
                        {key === "technical" ? "🔧 Kỹ thuật" : key === "communication" ? "💬 Giao tiếp" : key === "teamwork" ? "👥 Teamwork" : key === "leadership" ? "⭐ Lãnh đạo" : "🧩 Giải quyết"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => setFormData({ ...formData, categories: { ...formData.categories, [key]: parseInt(e.target.value) || 0 } })}
                        className="bg-[var(--surface)] border-[var(--border)] text-xl font-bold text-center h-14"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-3">
                <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase">💬 Nhận xét chung</h3>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Nhập nhận xét chung..."
                  className="bg-[var(--surface)] border-[var(--border)] min-h-[120px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={formLoading} className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white">
                  {formLoading ? "Đang lưu..." : selectedReview ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
