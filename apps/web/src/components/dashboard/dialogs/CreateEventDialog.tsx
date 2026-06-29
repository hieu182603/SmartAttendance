import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import eventService from "@/services/eventService";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
}: CreateEventDialogProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const [loading, setLoading] = useState(false);
  const getLocalDateString = (d: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: initialDate ? getLocalDateString(initialDate) : getLocalDateString(),
    startTime: "09:00",
    endTime: "17:00",
    type: "meeting" as
      | "holiday"
      | "meeting"
      | "event"
      | "deadline"
      | "training",
    location: "",
    attendeeCount: "" as number | "",
    isAllDay: false,
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (formData.title.trim() || formData.description.trim()) {
        if (!window.confirm(t("dashboard:eventDialogs.cancelConfirm", { defaultValue: "Bạn có chắc chắn muốn đóng? Các thay đổi chưa lưu sẽ bị mất." }))) {
          return;
        }
      }
      // Reset form
      setFormData({
        title: "",
        description: "",
        date: getLocalDateString(),
        startTime: "09:00",
        endTime: "17:00",
        type: "meeting",
        location: "",
        attendeeCount: "",
        isAllDay: false,
      });
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const colorMap: Record<string, string> = {
      holiday: "#EF4444",
      meeting: "#3B82F6",
      event: "#10B981",
      deadline: "#F59E0B",
      training: "#8B5CF6",
    };

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Không thể tạo sự kiện trong quá khứ");
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề sự kiện");
      return;
    }

    if (!formData.isAllDay && formData.startTime >= formData.endTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    try {
      setLoading(true);
      await eventService.createEvent({
        ...formData,
        attendeeCount: formData.attendeeCount === "" ? undefined : formData.attendeeCount,
        color: colorMap[formData.type] || "#3B82F6",
        startTime: formData.isAllDay ? undefined : formData.startTime,
        endTime: formData.isAllDay ? undefined : formData.endTime,
      });

      toast.success(`✅ ${t("dashboard:eventDialogs.success.created")}`);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        title: "",
        description: "",
        date: getLocalDateString(),
        startTime: "09:00",
        endTime: "17:00",
        type: "meeting",
        location: "",
        attendeeCount: "",
        isAllDay: false,
      });
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error(error.response?.data?.message || "Không thể tạo sự kiện");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo sự kiện mới</DialogTitle>
          <DialogDescription className="text-[var(--text-sub)]">
            Thêm sự kiện, cuộc họp hoặc ngày lễ vào lịch công ty
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Tiêu đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Nhập tiêu đề sự kiện"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="bg-[var(--input-bg)] border-[var(--border)]"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Nhập mô tả chi tiết"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="bg-[var(--input-bg)] border-[var(--border)] min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Loại sự kiện <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-[var(--input-bg)] border-[var(--border)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Họp</SelectItem>
                <SelectItem value="event">Sự kiện</SelectItem>
                <SelectItem value="holiday">Ngày lễ</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="training">Đào tạo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">
              Ngày <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              min={getLocalDateString()}
              className="bg-[var(--input-bg)] border-[var(--border)]"
              required
            />
          </div>

          {/* All Day Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) =>
                setFormData({ ...formData, isAllDay: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="isAllDay" className="cursor-pointer">
              Cả ngày
            </Label>
          </div>

          {/* Time Range */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Giờ bắt đầu</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Giờ kết thúc</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="bg-[var(--input-bg)] border-[var(--border)]"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Địa điểm</Label>
            <Input
              id="location"
              placeholder="Nhập địa điểm tổ chức"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="bg-[var(--input-bg)] border-[var(--border)]"
            />
          </div>

          {/* Attendee Count */}
          <div className="space-y-2">
            <Label htmlFor="attendeeCount">Số người tham gia (dự kiến)</Label>
            <div className="flex items-center gap-2 max-w-[200px]">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-[var(--border)]"
                onClick={() => {
                  const current = Number(formData.attendeeCount) || 0;
                  if (current > 0) {
                    setFormData({ ...formData, attendeeCount: current - 1 });
                  }
                }}
              >
                -
              </Button>
              <Input
                id="attendeeCount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Để trống hoặc nhập số"
                value={formData.attendeeCount === 0 ? "" : formData.attendeeCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setFormData({ ...formData, attendeeCount: "" });
                    return;
                  }
                  const onlyNums = val.replace(/\D/g, "");
                  setFormData({
                    ...formData,
                    attendeeCount: onlyNums ? Number(onlyNums) : "",
                  });
                }}
                onKeyDown={(e) => {
                  if (
                    !/[0-9]/.test(e.key) &&
                    ![
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                  }
                }}
                className="bg-[var(--input-bg)] border-[var(--border)] text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 border-[var(--border)]"
                onClick={() => {
                  const current = Number(formData.attendeeCount) || 0;
                  setFormData({ ...formData, attendeeCount: current + 1 });
                }}
              >
                +
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="border-[var(--border)] text-[var(--text-main)]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white"
            >
              {loading ? "Đang tạo..." : "Tạo sự kiện"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
