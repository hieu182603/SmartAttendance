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
import { usePermissions } from "@/hooks/usePermissions";
import { UserRole, Permission, type UserRoleType } from "@/utils/roles";
import RoleGuard from "@/components/RoleGuard";
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

  // Use permissions hook instead of hardcoded role checks
  const { user } = useAuth();
  const { hasMinimumRole, role } = usePermissions();
  const userRole = (role || user?.role || UserRole.EMPLOYEE) as UserRoleType;
  const isManager = hasMinimumRole(UserRole.MANAGER) && userRole === UserRole.MANAGER;

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
  }, [isManager, t]);

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
      toast.error(t('dashboard:performanceReview.errors.loadReviews'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterStatus, searchQuery, t]);

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
  }, [fetchEmployees, fetchAvailablePeriods]);

  useEffect(() => {
    // Fetch reviews and stats in parallel for better performance
    Promise.all([fetchReviews(), fetchStats()]);
  }, [filterPeriod, filterStatus, fetchReviews, fetchStats]);

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
        return t('dashboard:performanceReview.status.completed');
      case "pending":
        return t('dashboard:performanceReview.status.pending');
      case "rejected":
        return t('dashboard:performanceReview.status.rejected');

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
    
    // Validate nghiệp vụ
    if (!formData.employeeId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    
    if (!formData.period) {
      toast.error("Vui lòng chọn kỳ đánh giá");
      return;
    }
    
    // Manager không thể set status = "completed"
    if (isManager && formData.status === "completed") {
      toast.error("Manager không thể phê duyệt đánh giá. Vui lòng gửi để HR phê duyệt (chọn trạng thái 'Chờ duyệt')");
      return;
    }
    
    // Validate điểm số
    const categories = formData.categories || {};
    const invalidScores = Object.entries(categories).filter(
      ([_, value]) => value < 0 || value > 100
    );
    if (invalidScores.length > 0) {
      toast.error("Điểm số phải trong khoảng 0-100");
      return;
    }
    
    setFormLoading(true);
    try {
      // Không gửi overallScore lên - backend sẽ tự tính
      const submitData = { ...formData };
      delete (submitData as any).overallScore;
      
      if (selectedReview) {
        await performanceService.updateReview(selectedReview._id, submitData);
        toast.success("Cập nhật đánh giá thành công");
      } else {
        await performanceService.createReview(submitData);
        toast.success("Tạo đánh giá thành công");
      }
      fetchReviews();
      fetchStats();
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || t('dashboard:performanceReview.errors.generic'));
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
      toast.error(t('dashboard:performanceReview.errors.exportReport'));
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
    const reason = prompt(t('dashboard:performanceReview.dialog.rejectPrompt'));
    if (!reason || reason.trim() === "") {
      toast.error(t('dashboard:performanceReview.errors.rejectReason'));
      return;
    }

    try {
      await performanceService.rejectReview(review._id, reason);
      toast.success("Đã từ chối đánh giá");
      fetchReviews();
      fetchStats();
    } catch (error) {
      toast.error(t('dashboard:performanceReview.errors.rejectError'));
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
              ? t('dashboard:performanceReview.actions.createAndSend')
              : t('dashboard:performanceReview.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <RoleGuard permission={Permission.VIEW_REPORTS} fallback={null}>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </RoleGuard>
          <Button
            onClick={handleCreateReview}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard:performanceReview.actions.create')}
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
                  <p className="text-sm text-[var(--text-sub)] select-none">{t('dashboard:performanceReview.total')}</p>
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
                    {stats.avgScore ? stats.avgScore.toFixed(1) : "0"}
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
                <SelectValue placeholder={t('dashboard:performanceReview.dialog.period')} />
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
            <p className="text-[var(--text-sub)]">{t('dashboard:performanceReview.loading')}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 select-none">
            <FileText className="h-16 w-16 text-[var(--text-sub)] mx-auto mb-4" />
            <p className="text-[var(--text-sub)]">{t('dashboard:performanceReview.noReviews')}</p>
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

                          {/* Action Buttons - Logic nghiệp vụ đúng */}
                          {/* Manager chỉ sửa được đánh giá của mình (draft/pending/rejected), không sửa được completed */}
                          {/* HR+ có thể phê duyệt pending và sửa tất cả */}
                          {(isManager && 
                            (typeof review.reviewerId === 'object' ? review.reviewerId?._id : review.reviewerId) === user?.userId && 
                            review.status !== "completed") ||
                          (!isManager && (hasMinimumRole(UserRole.HR_MANAGER) || hasMinimumRole(UserRole.ADMIN))) ? (
                            <Button
                              onClick={() => handleOpenReview(review)}
                              variant="outline"
                              size="sm"
                              className="border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {review.status === "pending" && !isManager 
                                ? t('dashboard:performanceReview.actions.approve') 
                                : t('dashboard:performanceReview.actions.edit')}
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

                          {/* Chỉ HR+ mới được từ chối đánh giá pending */}
                          {review.status === "pending" && !isManager && (hasMinimumRole(UserRole.HR_MANAGER) || hasMinimumRole(UserRole.ADMIN)) && (
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
                                {t('dashboard:performanceReview.totalScore')}
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
                                      ? t('dashboard:performanceReview.categories.technical')
                                      : key === "communication"
                                        ? t('dashboard:performanceReview.categories.communication')
                                        : key === "teamwork"
                                          ? t('dashboard:performanceReview.categories.teamwork')
                                          : key === "leadership"
                                            ? t('dashboard:performanceReview.categories.leadership')
                                            : t('dashboard:performanceReview.categories.problemSolving')}
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
                  {selectedReview ? t('dashboard:performanceReview.dialog.editTitle') : t('dashboard:performanceReview.dialog.createTitle')}
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
                          <SelectValue placeholder={t('dashboard:performanceReview.dialog.selectEmployee')} />
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
                        <SelectValue placeholder={t('dashboard:performanceReview.dialog.selectPeriod')} />
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
                    <SelectItem value="pending">
                      {isManager ? "Gửi để duyệt" : t('dashboard:performanceReview.actions.waitingApproval')}
                    </SelectItem>
                    {/* Chỉ HR+ mới được phê duyệt/từ chối */}
                    <RoleGuard permission={Permission.REQUESTS_APPROVE_ALL} fallback={null}>
                      <>
                        <SelectItem value="completed">Hoàn thành (Phê duyệt)</SelectItem>
                        {/* Chỉ hiển thị "Từ chối" nếu đang edit và status là pending */}
                        {selectedReview && selectedReview.status === "pending" && (
                          <SelectItem value="rejected">Từ chối</SelectItem>
                        )}
                      </>
                    </RoleGuard>
                  </SelectContent>
                </Select>
                {/* Thông báo nghiệp vụ */}
                {isManager && formData.status === "pending" && (
                  <p className="text-xs text-[var(--warning)] mt-2">
                    💡 Ghi chú: Đánh giá ở trạng thái "Chờ duyệt" sẽ được HR xem xét và phê duyệt.
                  </p>
                )}
                {isManager && formData.status === "completed" && (
                  <p className="text-xs text-[var(--error)] mt-2">
                    ⚠️ Manager không thể phê duyệt đánh giá. Vui lòng chọn "Gửi để duyệt".
                  </p>
                )}
              </div>

              {/* Categories */}
              <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase">Điểm đánh giá</h3>
                  <div className="text-right bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 px-4 py-2 rounded-lg border border-[var(--primary)]/30">
                    <p className="text-xs text-[var(--text-sub)]">{t('dashboard:performanceReview.totalScore')}</p>
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
                        onFocus={(e) => {
                          e.target.select();
                          // Nếu giá trị là 0, xóa để dễ nhập
                          if (value === 0) {
                            e.target.value = '';
                          }
                        }}
                        onBlur={(e) => {
                          // Nếu để trống, set về 0
                          if (e.target.value === '') {
                            setFormData({ ...formData, categories: { ...formData.categories, [key]: 0 } });
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (val === '' || (!isNaN(val as number) && (val as number) >= 0 && (val as number) <= 100)) {
                            setFormData({ ...formData, categories: { ...formData.categories, [key]: val === '' ? 0 : val as number } });
                          }
                        }}
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
                  placeholder={t('dashboard:performanceReview.dialog.generalNotesPlaceholder')}
                  className="bg-[var(--surface)] border-[var(--border)] min-h-[120px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('dashboard:performanceReview.dialog.cancel')}</Button>
                <Button type="submit" disabled={formLoading} className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white">
                  {formLoading ? t('dashboard:performanceReview.actions.saving') : selectedReview ? t('dashboard:performanceReview.actions.update') : t('dashboard:performanceReview.actions.createNew')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
