import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar, AlertTriangle, CheckCircle, Play, Send, User, MapPin, File, Check, Trash2, Plus } from "lucide-react";
import type { ManagerTask, EmployeeSchedule } from "@/types/schedule";
import taskService from "@/services/taskService";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ManagerTask | EmployeeSchedule | null;
  onUpdate: (updatedTask: ManagerTask) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
}) => {
  const { t } = useTranslation(["dashboard", "common"]);
  const [note, setNote] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");

  // Reset state when task changes
  useEffect(() => {
    setNote("");
    setIsShaking(false);
    setLoading(false);
  }, [task]);

  // Load checklist (mockup) từ localStorage khi đổi task
  useEffect(() => {
    const id = task && !("shift" in task) ? (task as ManagerTask)._id : null;
    setNewItemText("");
    if (!id) {
      setChecklist([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`task_checklist_${id}`);
      setChecklist(raw ? JSON.parse(raw) : []);
    } catch {
      setChecklist([]);
    }
  }, [task]);

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!task) return null;

  // Determine if it is a Shift or a Task
  const isShift = "shift" in task;
  const managerTask = isShift ? null : (task as ManagerTask);
  const employeeSchedule = isShift ? (task as EmployeeSchedule) : null;

  // Get status color for accent bar and badge
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "assigned":
        return { color: "bg-[var(--primary)]", text: t("dashboard:schedule.taskModal.statusAssigned") || "Chờ Thực Hiện", badgeClass: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30" };
      case "in_progress":
        return { color: "bg-[var(--accent-cyan)]", text: t("dashboard:schedule.taskModal.statusInProgress") || "Đang Thực Hiện", badgeClass: "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30" };
      case "pending_review":
        return { color: "bg-[var(--warning)]", text: t("dashboard:schedule.taskModal.statusPendingReview") || "Chờ Duyệt", badgeClass: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30" };
      case "completed":
        return { color: "bg-[var(--success)]", text: t("dashboard:schedule.taskModal.statusCompleted") || "Đã Hoàn Thành", badgeClass: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30" };
      case "rejected":
        return { color: "bg-[var(--error)]", text: t("dashboard:schedule.taskModal.statusRejected") || "Bị Từ Chối", badgeClass: "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30" };
      default:
        return { color: "bg-[var(--text-sub)]", text: status, badgeClass: "bg-white/10 text-[var(--text-sub)] border-white/20" };
    }
  };

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case "high":
        return { text: t("dashboard:schedule.taskModal.priorityHigh") || "Cao", class: "bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30" };
      case "low":
        return { text: t("dashboard:schedule.taskModal.priorityLow") || "Thấp", class: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30" };
      default:
        return { text: t("dashboard:schedule.taskModal.priorityMedium") || "Trung bình", class: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30" };
    }
  };

  // Actions
  const handleStartTask = async () => {
    if (!managerTask) return;
    setLoading(true);
    try {
      const updated = await taskService.startTask(managerTask._id);
      onUpdate(updated);
      toast.success(t("dashboard:schedule.taskModal.startedSuccess") || "Đã bắt đầu thực hiện task");
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common:messages.error") || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async () => {
    if (!managerTask) return;
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error(t("dashboard:schedule.taskModal.noteRequired") || "Vui lòng nhập ghi chú trước khi nộp");
      return;
    }

    setLoading(false);
    setLoading(true);
    try {
      const updated = await taskService.submitTask(managerTask._id, trimmedNote);
      onUpdate(updated);
      toast.success(t("dashboard:schedule.taskModal.submittedSuccess") || "Đã nộp kết quả, chờ Manager xét duyệt");
      setNote("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common:messages.error") || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // --- Checklist (mockup, lưu localStorage — không đụng backend) ---
  const persistChecklist = (items: ChecklistItem[]) => {
    if (!managerTask) return;
    setChecklist(items);
    try {
      localStorage.setItem(`task_checklist_${managerTask._id}`, JSON.stringify(items));
    } catch {
      /* bỏ qua lỗi quota */
    }
  };
  const toggleChecklistItem = (id: string) =>
    persistChecklist(checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  const removeChecklistItem = (id: string) =>
    persistChecklist(checklist.filter((c) => c.id !== id));
  const addChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    persistChecklist([...checklist, { id: `cl_${Date.now()}_${checklist.length}`, text, done: false }]);
    setNewItemText("");
  };

  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistTotal = checklist.length;
  const checklistPct = checklistTotal ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  // --- Activity Feed (chỉ đọc, dựng từ dữ liệu sẵn có) ---
  const formatDateTime = (d?: string | Date | null) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const activities: { title: string; actor: string; time?: string; note?: string; Icon: React.ElementType; dotClass: string }[] = [];
  if (managerTask) {
    activities.push({
      title: "Giao việc",
      actor: managerTask.assignedBy?.name || "Quản lý",
      time: managerTask.createdAt,
      Icon: User,
      dotClass: "bg-[var(--primary)]/15 text-[var(--primary)]",
    });
    if (managerTask.employeeFeedback?.submittedAt) {
      activities.push({
        title: "Nộp kết quả",
        actor: managerTask.assignedTo?.name || "Nhân viên",
        time: managerTask.employeeFeedback.submittedAt,
        note: managerTask.employeeFeedback.note,
        Icon: Send,
        dotClass: "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]",
      });
    }
    if (managerTask.managerReview?.reviewedAt) {
      const approved = managerTask.managerReview.decision === "approved";
      activities.push({
        title: approved ? "Phê duyệt" : "Từ chối",
        actor: managerTask.assignedBy?.name || "Quản lý",
        time: managerTask.managerReview.reviewedAt,
        note: managerTask.managerReview.note,
        Icon: approved ? CheckCircle : AlertTriangle,
        dotClass: approved
          ? "bg-[var(--success)]/15 text-[var(--success)]"
          : "bg-[var(--error)]/15 text-[var(--error)]",
      });
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#050812]/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-[900px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl z-10 text-[var(--text-main)]"
          >
            {/* Accent color bar */}
            <div className={`h-[4px] w-full ${isShift ? "bg-[var(--primary)]" : getStatusInfo(managerTask!.status).color}`} />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/5 hover:bg-[var(--error)]/20 border border-[var(--border)] hover:border-[var(--error)]/40 text-[var(--text-sub)] hover:text-[var(--error)] w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Shift Modal Content */}
            {isShift ? (
              <div className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <span className="self-start text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30">
                    Ca làm việc
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight mt-1">
                    {employeeSchedule?.shift.name}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] border border-[var(--border)] p-6 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[var(--text-sub)] uppercase font-semibold">
                        Ngày làm việc
                      </span>
                      <span className="text-sm font-medium">
                        {employeeSchedule?.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/10 flex items-center justify-center text-[var(--accent-cyan)]">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[var(--text-sub)] uppercase font-semibold">
                        Khung giờ ca
                      </span>
                      <span className="text-sm font-medium">
                        {employeeSchedule?.shift.startTime} - {employeeSchedule?.shift.endTime} (Nghỉ {employeeSchedule?.shift.breakDuration}p)
                      </span>
                    </div>
                  </div>

                  {employeeSchedule?.location && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[var(--text-sub)] uppercase font-semibold">
                          Địa điểm làm việc
                        </span>
                        <span className="text-sm font-medium">
                          {employeeSchedule.location}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[var(--text-sub)] uppercase font-semibold">
                        Trạng thái điểm danh
                      </span>
                      <span className="text-sm font-medium capitalize">
                        {employeeSchedule?.status || "Không có ca"}
                      </span>
                    </div>
                  </div>
                </div>

                {employeeSchedule?.notes && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                      Ghi chú ca làm việc
                    </span>
                    <p className="text-sm text-[var(--text-sub)] leading-relaxed bg-white/[0.01] border border-[var(--border)] p-4 rounded-lg">
                      {employeeSchedule.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Task Modal Content (2 Columns) */
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6 p-8">
                {/* LEFT Column (60% equivalent: 6/10) */}
                <div className="md:col-span-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <span className={`self-start text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${getStatusInfo(managerTask!.status).badgeClass}`}>
                      {getStatusInfo(managerTask!.status).text}
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight mt-1 text-[var(--text-main)]">
                      {managerTask!.title}
                    </h2>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                      Mô tả chi tiết
                    </span>
                    <p className="text-sm text-[var(--text-sub)] leading-relaxed bg-white/[0.015] border border-[var(--border)] p-4 rounded-xl">
                      {managerTask!.description || "Không có mô tả chi tiết."}
                    </p>
                  </div>

                  {/* Attachments */}
                  {managerTask!.attachments && managerTask!.attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                        Tài liệu đính kèm ({managerTask!.attachments.length})
                      </span>
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto scrollbar-thin">
                        {managerTask!.attachments.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-[var(--border)] text-xs gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <File className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate text-[var(--text-main)]" title={file.name}>
                                  {file.name}
                                </span>
                                {file.size && (
                                  <span className="text-[10px] text-[var(--text-sub)]">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                            </div>
                            <a
                              href={file.url}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white px-2.5 py-1.5 rounded text-[10px] font-semibold transition-all duration-200"
                            >
                              Tải xuống / Xem
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">
                        Thời gian thực hiện
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-sub)]">
                        <Calendar className="w-3.5 h-3.5" />
                        {managerTask!.startDate === managerTask!.endDate
                          ? managerTask!.startDate
                          : `${managerTask!.startDate || ""} - ${managerTask!.endDate || ""}`}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">
                        {t("dashboard:schedule.taskModal.timeRange") || "Khung giờ"}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-sub)]">
                        <Clock className="w-3.5 h-3.5" />
                        {managerTask!.startTime} - {managerTask!.endTime}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">
                        {t("dashboard:schedule.taskModal.priority") || "Độ ưu tiên"}
                      </span>
                      <div>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getPriorityInfo(managerTask!.priority).class}`}>
                          {getPriorityInfo(managerTask!.priority).text}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">
                        {t("dashboard:schedule.taskModal.assignedBy") || "Người giao việc"}
                      </span>
                      <div className="flex items-center gap-2">
                        {managerTask!.assignedBy?.avatarUrl ? (
                          <img
                            src={managerTask!.assignedBy.avatarUrl}
                            alt="manager avatar"
                            className="w-5 h-5 rounded-full border border-[var(--border)] object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                            <User className="w-3 h-3 text-[var(--text-sub)]" />
                          </div>
                        )}
                        <span className="text-xs font-medium text-[var(--text-sub)] truncate">
                          {managerTask!.assignedBy?.name || t("common:roles.manager")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist (việc cần làm — mockup, lưu localStorage) */}
                  <div className="flex flex-col gap-2 mt-2 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                        Việc cần làm {checklistTotal > 0 && `(${checklistDone}/${checklistTotal})`}
                      </span>
                      {checklistTotal > 0 && (
                        <span className="text-[11px] font-semibold text-[var(--primary)]">{checklistPct}%</span>
                      )}
                    </div>

                    {checklistTotal > 0 && (
                      <div className="h-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
                          style={{ width: `${checklistPct}%` }}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 mt-1">
                      {checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group/cl">
                          <button
                            type="button"
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              item.done
                                ? "bg-[var(--success)] border-[var(--success)] text-white"
                                : "border-[var(--border)] hover:border-[var(--primary)]"
                            }`}
                          >
                            {item.done && <Check className="w-3 h-3" />}
                          </button>
                          <span
                            className={`text-xs flex-1 ${
                              item.done ? "line-through text-[var(--text-sub)]" : "text-[var(--text-main)]"
                            }`}
                          >
                            {item.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(item.id)}
                            className="text-[var(--text-sub)] hover:text-[var(--error)] opacity-0 group-hover/cl:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {checklistTotal === 0 && (
                        <span className="text-[11px] text-[var(--text-sub)] italic">Chưa có mục nào.</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <input
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addChecklistItem();
                          }
                        }}
                        placeholder="Thêm việc cần làm..."
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-1.5 px-3 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT Column (40% equivalent: 4/10) */}
                <div className="md:col-span-4 flex flex-col gap-6 border-t md:border-t-0 md:border-l border-[var(--border)] pt-6 md:pt-0 md:pl-6">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub)]">
                      Tương tác & Tiến độ
                    </h3>

                    {/* Assigned State */}
                    {managerTask!.status === "assigned" && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                          Bạn đã được phân công thực hiện công việc này. Nhấn nút bắt đầu để ghi nhận tiến độ.
                        </p>
                        <button
                          onClick={handleStartTask}
                          disabled={loading}
                          className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          {t("dashboard:schedule.taskModal.btnStart") || "Bắt đầu làm"}
                        </button>
                      </div>
                    )}

                    {/* In Progress State */}
                    {managerTask!.status === "in_progress" && (
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-[var(--text-sub)]">
                          {t("dashboard:schedule.taskModal.yourNote") || "Ghi chú của bạn"} <span className="text-red-500">*</span>
                        </label>
                        <motion.textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                          className={`w-full h-28 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none resize-none focus:border-[var(--primary)] transition-all duration-300 ${
                            isShaking ? "border-[var(--error)] shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" : "border-[var(--border)]"
                          }`}
                          placeholder={t("dashboard:schedule.taskModal.notePlaceholder") || "Nhập ghi chú, tiến độ hoặc vấn đề gặp phải..."}
                        />
                        <button
                          onClick={handleSubmitTask}
                          disabled={loading}
                          className="w-full bg-[var(--success)] hover:brightness-110 text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_4px_14px_rgba(16,185,129,0.2)]"
                        >
                          <Send className="w-4 h-4" />
                          {t("dashboard:schedule.taskModal.btnSubmit") || "Nộp kết quả"}
                        </button>
                      </div>
                    )}

                    {/* Pending Review State */}
                    {managerTask!.status === "pending_review" && (
                      <div className="bg-[var(--warning)]/15 border border-[var(--warning)]/20 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
                          <p className="text-xs text-[var(--warning)] leading-relaxed">
                            {t("dashboard:schedule.taskModal.awaitingReview") || "⏳ Đang chờ Manager xét duyệt. Bạn sẽ nhận thông báo khi có kết quả."}
                          </p>
                        </div>
                        {managerTask!.employeeFeedback?.note && (
                          <div className="border-t border-[var(--border)] pt-3">
                            <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">Ghi chú của bạn:</span>
                            <p className="text-xs text-[var(--text-sub)] mt-1 italic leading-relaxed">
                              "{managerTask!.employeeFeedback.note}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed State */}
                    {managerTask!.status === "completed" && (
                      <div className="flex flex-col gap-4">
                        <div className="bg-[var(--success)]/15 border border-[var(--success)]/20 p-4 rounded-xl flex items-start gap-2.5">
                          <CheckCircle className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                          <p className="text-xs text-[var(--success)] font-semibold leading-relaxed">
                            {t("dashboard:schedule.taskModal.completedSuccess") || "✅ Đã hoàn thành và được phê duyệt"}
                          </p>
                        </div>
                        {managerTask!.managerReview?.note && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold">
                              {t("dashboard:schedule.taskModal.managerNote") || "Ghi chú từ Manager"}
                            </span>
                            <p className="text-xs text-[var(--text-sub)] bg-white/[0.01] border border-[var(--border)] p-3 rounded-lg italic">
                              "{managerTask!.managerReview.note}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejected State */}
                    {managerTask!.status === "rejected" && (
                      <div className="flex flex-col gap-4">
                        <div className="bg-[var(--error)]/15 border border-[var(--error)]/20 p-4 rounded-xl flex flex-col gap-3">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-[var(--error)] font-semibold">
                                {t("dashboard:schedule.taskModal.rejectedReason") || "❌ Lý do từ chối"}
                              </span>
                              <p className="text-xs text-[var(--error)] leading-relaxed italic">
                                "{managerTask!.managerReview?.note || "Không có ghi chú cụ thể từ quản lý."}"
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <label className="text-xs font-semibold text-[var(--text-sub)]">
                            Ghi chú hoàn thành lại <span className="text-red-500">*</span>
                          </label>
                          <motion.textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                            className={`w-full h-24 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none resize-none focus:border-[var(--primary)] transition-all duration-300 ${
                              isShaking ? "border-[var(--error)] shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" : "border-[var(--border)]"
                            }`}
                            placeholder={t("dashboard:schedule.taskModal.notePlaceholder") || "Nhập ghi chú nộp lại..."}
                          />
                          <button
                            onClick={handleSubmitTask}
                            disabled={loading}
                            className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.2)]"
                          >
                            <Send className="w-4 h-4" />
                            {t("dashboard:schedule.taskModal.btnResubmit") || "Nộp lại"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activity Feed (chỉ đọc) */}
                  <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub)]">
                      Lịch sử hoạt động
                    </h3>
                    <div className="flex flex-col">
                      {activities.map((act, idx) => (
                        <div key={idx} className="flex gap-3 relative pb-4 last:pb-0">
                          {idx < activities.length - 1 && (
                            <span className="absolute left-[11px] top-6 bottom-0 w-px bg-[var(--border)]" />
                          )}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${act.dotClass}`}>
                            <act.Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-semibold text-[var(--text-main)]">{act.title}</span>
                            <span className="text-[10px] text-[var(--text-sub)]">
                              {act.actor}{act.time ? ` · ${formatDateTime(act.time)}` : ""}
                            </span>
                            {act.note && (
                              <p className="text-[11px] text-[var(--text-sub)] italic mt-0.5 leading-relaxed">
                                "{act.note}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailModal;
