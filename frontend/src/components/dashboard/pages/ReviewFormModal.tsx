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

  useEffect(() => {
    if (review) {
      setFormData({
        employeeId: review.employeeId._id,
        period: review.period,
        status: review.status,
        categories: review.categories,
        achievements: review.achievements,
        improvements: review.improvements,
        comments: review.comments,
      });
    } else {
      // Reset form
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-[var(--text-main)]">
              {isViewOnly
                ? "Chi tiết đánh giá"
                : review
                ? "Chỉnh sửa đánh giá"
                : "Tạo đánh giá mới"}
            </h2>
            {isViewOnly && (
              <p className="text-sm text-[var(--text-sub)] mt-1">
                👁️ Chế độ xem - Không thể chỉnh sửa
              </p>
            )}
            {!isViewOnly && isManager && (
              <p className="text-sm text-[var(--text-sub)] mt-1">
                👤 Manager - Tạo và gửi đánh giá
              </p>
            )}
            {!isViewOnly && isHROrAbove && (
              <p className="text-sm text-[var(--text-sub)] mt-1">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nhân viên</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
                disabled={!!review || isViewOnly}
              >
                <SelectTrigger className="bg-[var(--shell)] border-[var(--border)]">
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.fullName} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kỳ đánh giá</Label>
              <Input
                value={formData.period}
                onChange={(e) =>
                  setFormData({ ...formData, period: e.target.value })
                }
                placeholder="VD: Q3 2025"
                className="bg-[var(--shell)] border-[var(--border)]"
                disabled={isViewOnly}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label>Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) =>
                setFormData({ ...formData, status: value })
              }
              disabled={isViewOnly}
            >
              <SelectTrigger className="bg-[var(--shell)] border-[var(--border)]">
                <SelectValue />
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
            {isManager && formData.status === "pending" && (
              <p className="text-xs text-[var(--text-sub)] mt-1">
                💡 Đánh giá sẽ được gửi đến HR để phê duyệt
              </p>
            )}
            {isHROrAbove && formData.status === "completed" && (
              <p className="text-xs text-[var(--success)] mt-1">
                ✅ Đánh giá đã được phê duyệt và hoàn thành
              </p>
            )}
          </div>

          {/* Categories */}
          <div>
            <Label className="mb-3 block">Điểm đánh giá (0-100)</Label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.categories || {}).map(([key, value]) => (
                <div key={key}>
                  <Label className="text-sm text-[var(--text-sub)]">
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
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addAchievement())
                  }
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
                  <span className="text-sm text-[var(--text-main)]">
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
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addImprovement())
                  }
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
                  <span className="text-sm text-[var(--text-main)]">
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
