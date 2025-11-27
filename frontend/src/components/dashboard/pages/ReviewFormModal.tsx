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

  // Determine if user can edit this review
  const canEdit = mode === "edit" && (
    !review || // New review
    isHROrAbove || // HR can edit all
    (isManager && review && ["draft", "pending", "rejected"].includes(review.status)) // Manager can edit own draft/pending/rejected
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
  const [achievementInput, setAchievementInput] = useState("");
  const [improvementInput, setImprovementInput] = useState("");

  const generatePeriodOptions = () => {
    const currentYear = new Date().getFullYear();

    const options: Array<{ value: string; label: string }> = [];

    // Add quarters for current year (Q1 -> Q4)
    for (let q = 1; q <= 4; q++) {
      const value = `Q${q} ${currentYear}`;
      const label = `Q${q} ${currentYear} (Quý ${q})`;
      options.push({ value, label });
    }

    // Nếu đang sửa và period không có trong list, thêm vào
    if (review?.period && !options.find(opt => opt.value === review.period)) {
      options.push({
        value: review.period,
        label: review.period,
      });
    }

    return options;
  };

  // Calculate overall score real-time
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
      setAchievementInput("");
      setImprovementInput("");
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

  const addAchievement = () => {
    if (achievementInput.trim()) {
      setFormData({
        ...formData,
        achievements: [...(formData.achievements || []), achievementInput],
      });
      setAchievementInput("");
    }
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements?.filter((_, i) => i !== index),
    });
  };

  const addImprovement = () => {
    if (improvementInput.trim()) {
      setFormData({
        ...formData,
        improvements: [...(formData.improvements || []), improvementInput],
      });
      setImprovementInput("");
    }
  };

  const removeImprovement = (index: number) => {
    setFormData({
      ...formData,
      improvements: formData.improvements?.filter((_, i) => i !== index),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--surface)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl text-[var(--text-main)] select-none">
              {isViewOnly
                ? "Chi tiết đánh giá"
                : review
                ? "Chỉnh sửa đánh giá"
                : "Tạo đánh giá mới"}
            </h2>
            {review && (
              <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-sub)] select-none">
                <span>
                  👤 Người đánh giá:{" "}
                  <strong className="text-[var(--text-main)]">
                    {review.reviewerId?.fullName || review.reviewerId?.name || "N/A"}
                  </strong>
                </span>
                {review.createdAt && (
                  <span>
                    📅 Tạo lúc:{" "}
                    {new Date(review.createdAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>
            )}
            {isViewOnly && (
              <p className="text-sm text-[var(--text-sub)] mt-1 select-none">
                👁️ Chế độ xem - Không thể chỉnh sửa
              </p>
            )}
            {!isViewOnly && isManager && (
              <p className="text-sm text-[var(--text-sub)] mt-1 select-none">
                👤 Manager - Tạo và gửi đánh giá
              </p>
            )}
            {!isViewOnly && isHROrAbove && (
              <p className="text-sm text-[var(--text-sub)] mt-1 select-none">
                ✅ HR - Phê duyệt và hoàn thiện đánh giá
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[var(--text-sub)]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" autoComplete="off">
          {/* Employee & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nhân viên</Label>
              {isViewOnly || !!review ? (
                <div className="bg-[var(--shell)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-main)] select-none">
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
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)]" autoFocus={false}>
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
              <Label>Kỳ đánh giá</Label>
              {isViewOnly ? (
                <div className="bg-[var(--shell)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-main)] select-none">
                  {formData.period || "N/A"}
                </div>
              ) : (
                <Select
                  key={`period-${review?._id || 'new'}`}
                  value={formData.period || undefined}
                  onValueChange={(value) => {
                    setFormData({ ...formData, period: value });
                  }}
                >
                  <SelectTrigger className="bg-[var(--shell)] border-[var(--border)]">
                    <SelectValue placeholder="Chọn kỳ đánh giá" />
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

          {/* Status */}
          <div>
            <Label>Trạng thái</Label>
            {isViewOnly ? (
              <div className="bg-[var(--shell)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text-main)] select-none">
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
                key={`status-${review?._id || 'new'}`}
                value={formData.status || undefined}
                onValueChange={(value: any) => {
                  setFormData({ ...formData, status: value });
                }}
              >
                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)]">
                  <SelectValue placeholder="Chọn trạng thái" />
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
              <p className="text-xs text-[var(--text-sub)] mt-1 select-none">
                💡 Đánh giá sẽ được gửi đến HR để phê duyệt
              </p>
            )}
            {isHROrAbove && formData.status === "completed" && (
              <p className="text-xs text-[var(--success)] mt-1 select-none">
                ✅ Đánh giá đã được phê duyệt và hoàn thành
              </p>
            )}
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Điểm đánh giá (0-100)</Label>
              <div className="text-right select-none">
                <p className="text-xs text-[var(--text-sub)]">Điểm tổng quan</p>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {overallScore}
                  <span className="text-sm text-[var(--text-sub)]">/100</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.categories || {}).map(([key, value]) => (
                <div key={key}>
                  <Label className="text-sm text-[var(--text-sub)] select-none">
                    {key === "technical"
                      ? "Kỹ thuật"
                      : key === "communication"
                      ? "Giao tiếp"
                      : key === "teamwork"
                      ? "Teamwork"
                      : key === "leadership"
                      ? "Lãnh đạo"
                      : "Giải quyết vấn đề"}
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
                    className="bg-[var(--shell)] border-[var(--border)]"
                    disabled={isViewOnly}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <Label>Thành tích</Label>
            {!isViewOnly && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={achievementInput}
                  onChange={(e) => setAchievementInput(e.target.value)}
                  placeholder="Nhập thành tích..."
                  className="bg-[var(--shell)] border-[var(--border)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAchievement();
                    }
                  }}
                />
                <Button type="button" onClick={addAchievement}>
                  Thêm
                </Button>
              </div>
            )}
            <ul className="space-y-2">
              {formData.achievements?.map((achievement, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-[var(--shell)] p-2 rounded"
                >
                  <span className="text-sm text-[var(--text-main)] select-none">
                    {achievement}
                  </span>
                  {!isViewOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAchievement(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div>
            <Label>Cần cải thiện</Label>
            {!isViewOnly && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={improvementInput}
                  onChange={(e) => setImprovementInput(e.target.value)}
                  placeholder="Nhập điểm cần cải thiện..."
                  className="bg-[var(--shell)] border-[var(--border)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addImprovement();
                    }
                  }}
                />
                <Button type="button" onClick={addImprovement}>
                  Thêm
                </Button>
              </div>
            )}
            <ul className="space-y-2">
              {formData.improvements?.map((improvement, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-[var(--shell)] p-2 rounded"
                >
                  <span className="text-sm text-[var(--text-main)] select-none">
                    {improvement}
                  </span>
                  {!isViewOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImprovement(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Comments */}
          <div>
            <Label>Nhận xét</Label>
            <Textarea
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              placeholder="Nhập nhận xét chung..."
              className="bg-[var(--shell)] border-[var(--border)] min-h-[100px]"
              disabled={isViewOnly}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {isViewOnly ? "Đóng" : "Hủy"}
            </Button>
            {!isViewOnly && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]"
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
