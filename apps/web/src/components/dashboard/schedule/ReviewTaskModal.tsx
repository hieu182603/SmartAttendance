import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Calendar, Check, User, File } from "lucide-react";
import type { ManagerTask } from "@/types/schedule";
import taskService from "@/services/taskService";
import { toast } from "sonner";

interface ReviewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ManagerTask | null;
  onSuccess: (updatedTask: ManagerTask) => void;
}

export const ReviewTaskModal: React.FC<ReviewTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess,
}) => {
  const { t } = useTranslation(["dashboard", "common"]);
  const [managerNote, setManagerNote] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setManagerNote(task.managerReview?.note || "");
    } else {
      setManagerNote("");
    }
    setIsShaking(false);
    setLoading(false);
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

  const handleReview = async (decision: "approved" | "rejected") => {
    setIsShaking(false);
    const noteTrimmed = managerNote.trim();

    if (decision === "rejected" && !noteTrimmed) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error(t("dashboard:tasks.reviewModal.rejectNoteRequired") || "Bắt buộc nhập lý do khi từ chối");
      return;
    }

    setLoading(true);
    try {
      const updated = await taskService.reviewTask(task._id, decision, noteTrimmed);
      onSuccess(updated);
      toast.success(
        decision === "approved"
          ? t("dashboard:tasks.reviewModal.approvedMsg") || "Đã phê duyệt thành công"
          : t("dashboard:tasks.reviewModal.rejectedMsg") || "Đã từ chối, nhân viên sẽ nhận thông báo"
      );
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common:messages.error") || "Duyệt việc thất bại");
    } finally {
      setLoading(false);
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
            className="relative w-full max-w-[850px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl z-10 text-[var(--text-main)]"
          >
            {/* Accent bar at top based on status */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[var(--warning)] to-[var(--accent-cyan)]" />
            {/* Viền lề trái theo độ ưu tiên */}
            <div
              className={`absolute top-0 left-0 h-full w-1.5 ${
                task.priority === "high"
                  ? "bg-[var(--error)]"
                  : task.priority === "low"
                  ? "bg-[var(--success)]"
                  : "bg-[var(--warning)]"
              }`}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/5 hover:bg-[var(--error)]/20 border border-[var(--border)] hover:border-[var(--error)]/40 text-[var(--text-sub)] hover:text-[var(--error)] w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body: 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-10 gap-6 p-8">
              {/* LEFT Column (60% equivalent: 6/10) */}
              <div className="md:col-span-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <span className="self-start text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30">
                    {t("dashboard:tasks.pendingReviewBadge") || "Chờ duyệt"}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight mt-2">
                    {task.title}
                  </h2>
                </div>

                 <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                    Mô tả công việc
                  </span>
                  <p className="text-sm text-[var(--text-sub)] leading-relaxed bg-white/[0.015] border border-[var(--border)] p-4 rounded-xl">
                    {task.description || "Không có mô tả chi tiết."}
                  </p>
                </div>

                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                      Tài liệu đính kèm ({task.attachments.length})
                    </span>
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto scrollbar-thin">
                      {task.attachments.map((file, idx) => (
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 bg-[var(--input-bg)]/40 border border-[var(--border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Nhân viên thực hiện
                    </span>
                    <div className="flex items-center gap-2">
                      {task.assignedTo?.avatarUrl ? (
                        <img
                          src={task.assignedTo.avatarUrl}
                          alt="employee avatar"
                          className="w-5 h-5 rounded-full border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-[var(--text-sub)]" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-[var(--text-main)] truncate">
                        {task.assignedTo?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-[var(--input-bg)]/40 border border-[var(--border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold tracking-wider">
                      Độ ưu tiên
                    </span>
                    <div>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getPriorityInfo(task.priority).class}`}>
                        {getPriorityInfo(task.priority).text}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-[var(--input-bg)]/40 border border-[var(--border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Thời gian thực hiện
                    </span>
                    <div className="text-xs text-[var(--text-main)] font-medium">
                      {task.startDate === task.endDate
                        ? task.startDate
                        : `${task.startDate || ""} - ${task.endDate || ""}`}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-[var(--input-bg)]/40 border border-[var(--border)] rounded-lg p-3">
                    <span className="text-[10px] text-[var(--text-sub)] uppercase font-semibold tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Khung giờ
                    </span>
                    <div className="text-xs text-[var(--text-main)] font-medium">
                      {task.startTime} - {task.endTime}
                    </div>
                  </div>
                </div>

                {/* Employee Feedback Note */}
                <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                  <span className="text-[11px] text-[var(--text-sub)] uppercase font-bold tracking-wider">
                    {t("dashboard:tasks.reviewModal.employeeNote") || "Ghi chú của nhân viên"}
                  </span>
                  <p className="text-sm text-[var(--text-main)] italic leading-relaxed bg-[var(--input-bg)] border border-[var(--border)] p-4 rounded-xl">
                    "{task.employeeFeedback?.note || t("dashboard:tasks.reviewModal.noNote") || "(Nhân viên không để lại ghi chú)"}"
                  </p>
                </div>
              </div>

              {/* RIGHT Column (40% equivalent: 4/10) */}
              <div className="md:col-span-4 flex flex-col border-t md:border-t-0 md:border-l border-[var(--border)] pt-6 md:pt-0 md:pl-6 justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub)]">
                    Xét duyệt kết quả
                  </h3>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-[var(--text-sub)]">
                      {t("dashboard:tasks.reviewModal.rejectReason") || "Ý kiến phản hồi / Lý do từ chối (bắt buộc khi Từ chối)"}
                    </label>
                    <motion.textarea
                      value={managerNote}
                      onChange={(e) => setManagerNote(e.target.value)}
                      animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                      className={`w-full h-32 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none resize-none focus:border-[var(--primary)] transition-all duration-300 ${
                        isShaking ? "border-[var(--error)] shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" : "border-[var(--border)]"
                      }`}
                      placeholder={t("dashboard:tasks.reviewModal.rejectPlaceholder") || "Nhập ý kiến phản hồi hoặc lý do từ chối..."}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleReview("approved")}
                    disabled={loading}
                    className="w-full bg-[var(--success)] hover:brightness-110 text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_4px_14px_rgba(16,185,129,0.25)]"
                  >
                    <Check className="w-4 h-4" />
                    {t("dashboard:tasks.reviewModal.btnApprove") || "Phê duyệt"}
                  </button>

                  <button
                    onClick={() => handleReview("rejected")}
                    disabled={loading}
                    className="w-full bg-[var(--error)] hover:brightness-110 text-white font-semibold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_4px_14px_rgba(239,68,68,0.25)]"
                  >
                    <X className="w-4 h-4" />
                    {t("dashboard:tasks.reviewModal.btnReject") || "Từ chối"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReviewTaskModal;
