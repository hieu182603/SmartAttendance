import { useState } from "react";
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
  Filter,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { Progress } from "../../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "sonner";

interface Review {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  period: string;
  reviewDate: string;
  reviewer: string;
  overallScore: number;
  status: "completed" | "pending" | "draft";
  categories: {
    technical: number;
    communication: number;
    teamwork: number;
    leadership: number;
    problemSolving: number;
  };
  achievements: string[];
  improvements: string[];
  comments: string;
}

const mockReviews: Review[] = [
  {
    id: "REV001",
    employeeId: "EMP001",
    employeeName: "Nguyễn Văn A",
    position: "Senior Developer",
    period: "Q3 2025",
    reviewDate: "2025-10-15",
    reviewer: "Hoàng Văn E",
    overallScore: 92,
    status: "completed",
    categories: {
      technical: 95,
      communication: 88,
      teamwork: 90,
      leadership: 92,
      problemSolving: 94,
    },
    achievements: [
      "Hoàn thành dự án ABC trước deadline 2 tuần",
      "Mentor 3 junior developers",
      "Tối ưu performance hệ thống, giảm 40% thời gian tải",
    ],
    improvements: [
      "Cần cải thiện kỹ năng present",
      "Tham gia nhiều hơn vào các buổi họp team",
    ],
    comments: "Nhân viên xuất sắc, đóng góp tích cực cho team.",
  },
  {
    id: "REV002",
    employeeId: "EMP002",
    employeeName: "Trần Thị B",
    position: "Frontend Developer",
    period: "Q3 2025",
    reviewDate: "2025-10-16",
    reviewer: "Hoàng Văn E",
    overallScore: 85,
    status: "completed",
    categories: {
      technical: 88,
      communication: 85,
      teamwork: 90,
      leadership: 75,
      problemSolving: 82,
    },
    achievements: [
      "Redesign UI/UX dashboard",
      "Implement dark mode cho toàn bộ app",
      "Fix 50+ bugs",
    ],
    improvements: ["Nâng cao kỹ năng backend", "Học thêm về DevOps"],
    comments: "Làm việc chăm chỉ, có tinh thần trách nhiệm cao.",
  },
  {
    id: "REV003",
    employeeId: "EMP003",
    employeeName: "Lê Văn C",
    position: "Backend Developer",
    period: "Q3 2025",
    reviewDate: "",
    reviewer: "Hoàng Văn E",
    overallScore: 0,
    status: "pending",
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
  },
];

export default function PerformanceReviewPage() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "pending" | "draft"
  >("all");

  const filteredReviews = reviews.filter((review) => {
    if (filterStatus !== "all" && review.status !== filterStatus) return false;
    if (filterPeriod !== "all" && review.period !== filterPeriod) return false;
    if (
      searchQuery &&
      !review.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const stats = {
    total: reviews.length,
    completed: reviews.filter((r) => r.status === "completed").length,
    pending: reviews.filter((r) => r.status === "pending").length,
    avgScore: Math.round(
      reviews
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + r.overallScore, 0) /
        reviews.filter((r) => r.status === "completed").length
    ),
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-[var(--success)]";
    if (score >= 75) return "text-[var(--warning)]";
    if (score >= 60) return "text-[var(--accent-cyan)]";
    return "text-[var(--error)]";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-[var(--success)]/20 text-[var(--success)]";
    if (score >= 75) return "bg-[var(--warning)]/20 text-[var(--warning)]";
    if (score >= 60)
      return "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]";
    return "bg-[var(--error)]/20 text-[var(--error)]";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--success)]/20 text-[var(--success)]";
      case "pending":
        return "bg-[var(--warning)]/20 text-[var(--warning)]";
      case "draft":
        return "bg-gray-500/20 text-gray-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const handleViewReview = (review: Review) => {
    toast.success(`👁️ Xem đánh giá ${review.employeeName}`);
  };

  const handleEditReview = (review: Review) => {
    toast.success(`✏️ Chỉnh sửa đánh giá ${review.employeeName}`);
  };

  const handleCreateReview = () => {
    toast.success("📝 Tạo đánh giá mới");
  };

  const handleExport = () => {
    toast.success("📥 Đang xuất báo cáo đánh giá...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
            Đánh giá hiệu suất
          </h1>
          <p className="text-[var(--text-sub)] mt-2">
            Quản lý đánh giá hiệu suất làm việc của nhân viên
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-[var(--border)] text-[var(--text-main)]"
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
          <Button
            onClick={handleCreateReview}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo đánh giá
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
                  <p className="text-sm text-[var(--text-sub)]">Tổng số</p>
                  <p className="text-3xl text-[var(--primary)] mt-2">
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
                  <p className="text-sm text-[var(--text-sub)]">Hoàn thành</p>
                  <p className="text-3xl text-[var(--success)] mt-2">
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
                  <p className="text-sm text-[var(--text-sub)]">Chờ đánh giá</p>
                  <p className="text-3xl text-[var(--warning)] mt-2">
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
                  <p className="text-sm text-[var(--text-sub)]">Điểm TB</p>
                  <p className="text-3xl text-[var(--accent-cyan)] mt-2">
                    {stats.avgScore}
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
                  placeholder="Tìm kiếm theo tên nhân viên..."
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
                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
              </SelectContent>
            </Select>
            <Tabs
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as any)}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review, index) => (
          <motion.div
            key={review.id}
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
                          {review.employeeName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg text-[var(--text-main)]">
                          {review.employeeName}
                        </h3>
                        <p className="text-sm text-[var(--text-sub)]">
                          {review.position}
                        </p>
                      </div>
                      <Badge
                        className={getStatusColor(review.status)}
                        style={{ marginLeft: "auto" }}
                      >
                        {review.status === "completed"
                          ? "Hoàn thành"
                          : review.status === "pending"
                          ? "Chờ đánh giá"
                          : "Nháp"}
                      </Badge>
                    </div>

                    {review.status === "completed" && (
                      <>
                        {/* Overall Score */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--text-sub)]">
                              Điểm tổng quan
                            </span>
                            <div className="flex items-center gap-2">
                              <Star
                                className={`h-5 w-5 ${getScoreColor(
                                  review.overallScore
                                )}`}
                              />
                              <span
                                className={`text-2xl ${getScoreColor(
                                  review.overallScore
                                )}`}
                              >
                                {review.overallScore}
                              </span>
                              <span className="text-sm text-[var(--text-sub)]">
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
                                  className={`text-xl ${getScoreColor(value)}`}
                                >
                                  {value}
                                </div>
                                <div className="text-xs text-[var(--text-sub)] mt-1">
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
                        <div className="flex items-center gap-6 text-sm text-[var(--text-sub)] mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{review.period}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Đánh giá bởi: {review.reviewer}</span>
                          </div>
                          {review.reviewDate && (
                            <div>Ngày: {review.reviewDate}</div>
                          )}
                        </div>

                        {/* Achievements & Improvements */}
                        {review.achievements.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-[var(--text-sub)] mb-2">
                              ✅ Thành tích:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {review.achievements.map((achievement, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-[var(--text-main)]"
                                >
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {review.improvements.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-[var(--text-sub)] mb-2">
                              📈 Cần cải thiện:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {review.improvements.map((improvement, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-[var(--text-main)]"
                                >
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {review.comments && (
                          <div className="p-3 rounded-lg bg-[var(--shell)] border border-[var(--border)]">
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
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-[var(--warning)] mx-auto mb-3" />
                        <p className="text-[var(--text-sub)]">
                          Chưa có đánh giá cho kỳ này
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleViewReview(review)}
                      variant="outline"
                      size="sm"
                      className="border-[var(--border)] text-[var(--text-main)]"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Xem
                    </Button>
                    <Button
                      onClick={() => handleEditReview(review)}
                      variant="outline"
                      size="sm"
                      className="border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {review.status === "pending" ? "Đánh giá" : "Sửa"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
