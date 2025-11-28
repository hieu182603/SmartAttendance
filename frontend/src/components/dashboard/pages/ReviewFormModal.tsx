import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { toast } from "sonner";
import {
  performanceService,
  type PerformanceReview,
  type CreateReviewData,
} from "../../../services/performanceService";
import { useAuth } from "../../../context/AuthContext";

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  review?: PerformanceReview | null;
  onSuccess: () => void;
  employees: Array<{ _id: string; fullName: string; position: string }>;
  mode?: "view" | "edit";
}

export default function ReviewFormModal({
  isOpen,
  onClose,
  review,
  onSuccess,
  employees,
  mode = "edit",
}: ReviewFormModalProps) {
  const { user } = useAuth();
  const userRole = user?.role || "EMPLOYEE";
  const isManager = userRole === "MANAGER";
  const isHROrAbove = ["HR_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole);

  const canEdit = mode === "edit" && (
    !review ||
    isHROrAbove ||
    (isManager && review && ["draft", "pending", "rejected"].includes(review.status))
  );

  const isViewOnly = !canEdit;

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
  const [loading, setLoading] = useState(false);

  const generatePeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const options: Array<{ value: string; label: string }> = [];

    for (let q = 1; q <= 4; q++) {
      const value = `Q${q} ${currentYear}`;
      const label = `Q${q} ${currentYear} (Quý ${q})`;
      options.push({ value, label });
    }

    if (review?.period && !options.find(opt => opt.value === review.period)) {
      options.push({
        value: review.period,
        label: review.period,
      });
    }

    return options;
  };

  const calculateOverallScore = () => {
    const {
      technical = 0,
      communication = 0,
      teamwork = 0,
      leadership = 0,
      problemSolving = 0,
    } = formData.categories || {};
    return Math.round(
      (technical + communication + teamwork + leadership + problemSolving) / 5
    );
  };

  const overallScore = calculateOverallScore();

  useEffect(() => {
    if (isOpen) {
      if (review) {
        setFormData({
          employeeId: review.employeeId?._id || "",
          period: review.period || "",
          status: review.status || "draft",
          categories: review.categories || {
            technical: 0,
            communication: 0,
            teamwork: 0,
            leadership: 0,
            problemSolving: 0,
          },
          achievements: review.achievements || [],
          improvements: review.improvements || [],
          comments: review.comments || "",
        });
      } else {
        setFormData({
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
      }
    }
  }, [review, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (review) {
        await performanceService.updateReview(review._id, formData);
        toast.success("Cập nhật đánh giá thành công");
      } else {
        await performanceService.createReview(formData);
        toast.success("Tạo đánh giá thành công");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--surface)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-cyan)]/10 border-b border-[var(--border)] p-6 flex items-start justify-between backdrop-blur-sm z-10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent select-none">
              {isViewOnly
                ? "Chi tiết đánh giá"
                : review
                  ? "Chỉnh sửa đánh giá"
                  : "Tạo đánh giá mới"}
            </h2>
            {review && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--text-sub)] select-none">
                <span className="flex items-center gap-1">
                  👤{" "}
                  <strong className="text-[var(--text-main)]">
                    {review.reviewerId?.fullName || review.reviewerId?.name || "N/A"}
                  </strong>
                </span>
                {review.createdAt && (
                  <span className="flex items-center gap-1">
                    📅 {new Date(review.createdAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>
            )}
            {isViewOnly && (
              <p className="text-sm text-[var(--warning)] mt-2 select-none flex items-center gap-1">
                👁️ Chế độ xem - Không thể chỉnh sửa
              </p>
            )}
            {!isViewOnly && isManager && (
              <p className="text-sm text-[var(--primary)] mt-2 select-none flex items-center gap-1">
                👤 Manager - Tạo và gửi đánh giá
              </p>
            )}
            {!isViewOnly && isHROrAbove && (
              <p className="text-sm text-[var(--success)] mt-2 select-none flex items-center gap-1">
                ✅ HR - Phê duyệt và hoàn thiện đánh giá
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--shell)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" autoComplete="off">
          {/* Basic Information */}
          <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-wide">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-[var(--text-main)] font-medium mb-2 block">Nhân viên</Label>
                {isViewOnly || !!review ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[var(--text-main)] select-none">
                    {review?.employeeId?.fullName || review?.employeeId?.name || "N/A"}
                    {review?.employeeId?.position && ` - ${review.employeeId.position}`}
                  </div>
                ) : (
                  <Select
                    value={formData.employeeId || undefined}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employeeId: value })
                    }
                  >
                    <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <div className="p-2 text-sm text-[var(--text-sub)]">
                          Không có nhân viên
                        </div>
                      ) : (
                        employees.map((emp) => (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.fullName} - {emp.position}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label className="text-[var(--text-main)] font-medium mb-2 block">Kỳ đánh giá</Label>
                {isViewOnly ? (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[var(--text-main)] select-none">
                    {formData.period || "N/A"}
                  </div>
                ) : (
                  <Select
                    value={formData.period}
                    onValueChange={(value) => {
                      setFormData({ ...formData, period: value });
                    }}
                  >
                    <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                      <SelectValue placeholder="Chọn kỳ đánh giá">
                        {formData.period || "Chọn kỳ đánh giá"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {generatePeriodOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-wide">Trạng thái</h3>
            {isViewOnly ? (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2.5 text-[var(--text-main)] select-none">
                {formData.status === "completed"
                  ? "Hoàn thành"
                  : formData.status === "pending"
                    ? "Chờ phê duyệt"
                    : formData.status === "rejected"
                      ? "Từ chối"
                      : formData.status === "draft"
                        ? "Nháp"
                        : "N/A"}
              </div>
            ) : (
              <Select
                value={formData.status}
                onValueChange={(value: any) => {
                  setFormData({ ...formData, status: value });
                }}
              >
                <SelectTrigger className="bg-[var(--surface)] border-[var(--border)]">
                  <SelectValue placeholder="Chọn trạng thái">
                    {formData.status === "completed"
                      ? "Hoàn thành"
                      : formData.status === "pending"
                        ? "Chờ phê duyệt"
                        : formData.status === "rejected"
                          ? "Từ chối"
                          : formData.status === "draft"
                            ? "Nháp"
                            : "Chọn trạng thái"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="pending">
                    {isManager ? "Gửi đánh giá" : "Chờ phê duyệt"}
                  </SelectItem>
                  {isHROrAbove && (
                    <>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            {isManager && formData.status === "pending" && (
              <p className="text-xs text-[var(--warning)] p-2.5 bg-[var(--warning)]/10 rounded select-none">
                💡 Đánh giá sẽ được gửi đến HR để phê duyệt
              </p>
            )}
            {isHROrAbove && formData.status === "completed" && (
              <p className="text-xs text-[var(--success)] p-2.5 bg-[var(--success)]/10 rounded select-none">
                ✅ Đánh giá đã được phê duyệt và hoàn thành
              </p>
            )}
          </div>

          {/* Categories */}
          <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-wide">Điểm đánh giá</h3>
              <div className="text-right select-none bg-gradient-to-r from-[var(--primary)]/20 to-[var(--accent-cyan)]/20 px-4 py-2 rounded-lg border border-[var(--primary)]/30">
                <p className="text-xs text-[var(--text-sub)] mb-1">Điểm tổng quan</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] bg-clip-text text-transparent">
                  {overallScore}
                  <span className="text-sm text-[var(--text-sub)]">/100</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(formData.categories || {}).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-[var(--text-sub)] select-none block text-center">
                    {key === "technical"
                      ? "🔧 Kỹ thuật"
                      : key === "communication"
                        ? "💬 Giao tiếp"
                        : key === "teamwork"
                          ? "👥 Teamwork"
                          : key === "leadership"
                            ? "⭐ Lãnh đạo"
                            : "🧩 Giải quyết vấn đề"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categories: {
                          ...formData.categories,
                          [key]: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="bg-[var(--surface)] border-[var(--border)] text-xl font-bold text-center h-14"
                    disabled={isViewOnly}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-[var(--shell)]/50 rounded-lg p-5 border border-[var(--border)] space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-wide">💬 Nhận xét chung</h3>
            <Textarea
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              placeholder="Nhập nhận xét chung..."
              className="bg-[var(--surface)] border-[var(--border)] min-h-[120px]"
              disabled={isViewOnly}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {isViewOnly ? "Đóng" : "Hủy"}
            </Button>
            {!isViewOnly && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
              >
                {loading ? "Đang lưu..." : review ? "Cập nhật" : "Tạo mới"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
