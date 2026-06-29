import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, User, Calendar, Clock, Paperclip, Trash2, File } from "lucide-react";
import taskService from "@/services/taskService";
import { toast } from "sonner";
import type { TaskPriority } from "@/types/schedule";

interface Employee {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string;
  employees: Employee[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  employees,
}) => {
  const { t } = useTranslation(["dashboard", "common"]);

  // Form fields
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: string; size: number }>>([]);

  // Search employee select UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [requiresReview, setRequiresReview] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Click outside listener for searchable dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmpId(emp._id);
    setSearchTerm(emp.name);
    setShowDropdown(false);
  };

  const handlePrioritySelect = (p: TaskPriority) => {
    setPriority(p);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`File ${file.name} vượt quá giới hạn 2MB!`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: reader.result as string, // Base64 URL
            type: file.type,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsShaking(false);

    if (!selectedEmpId) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error(t("dashboard:tasks.createModal.selectEmployeeError") || "Vui lòng chọn nhân viên!");
      return;
    }

    if (!title.trim()) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error(t("dashboard:tasks.createModal.titleRequired") || "Vui lòng nhập tên công việc!");
      return;
    }

    if (!startDate) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error("Vui lòng chọn ngày bắt đầu!");
      return;
    }

    if (!endDate) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error("Vui lòng chọn ngày kết thúc!");
      return;
    }

    if (startDate > endDate) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu!");
      return;
    }

    if (startDate === endDate && startTime >= endTime) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error(t("dashboard:tasks.createModal.timeError") || "Giờ kết thúc phải sau giờ bắt đầu!");
      return;
    }

    // Tổng dung lượng đính kèm (base64 phình ~33%, giữ tổng gốc ≤ 7MB để không vượt limit 10mb backend)
    const totalAttachmentBytes = attachments.reduce((sum, f) => sum + f.size, 0);
    if (totalAttachmentBytes > 7 * 1024 * 1024) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast.error("Tổng dung lượng đính kèm vượt quá 7MB. Vui lòng bớt bớt file!");
      return;
    }

    setSubmitting(true);
    try {
      await taskService.createTask({
        title,
        description,
        assignedTo: selectedEmpId,
        startDate,
        endDate,
        startTime,
        endTime,
        priority,
        projectId,
        requiresReview,
        attachments,
      });

      toast.success(t("dashboard:tasks.createModal.successMsg") || "Đã giao việc thành công");
      // Reset form
      setTitle("");
      setDescription("");
      setSelectedEmpId("");
      setSearchTerm("");
      const todayStr = () => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };
      setStartDate(todayStr());
      setEndDate(todayStr());
      setStartTime("08:00");
      setEndTime("17:00");
      setPriority("medium");
      setRequiresReview(true);
      setAttachments([]);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("common:messages.error") || "Giao việc thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="relative w-full max-w-[800px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl z-10 text-[var(--text-main)]"
          >
            {/* Accent top bar */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--primary)]" />
            {/* Viền lề trái xem trước theo độ ưu tiên đang chọn */}
            <div
              className={`absolute top-0 left-0 h-full w-1.5 transition-colors duration-300 ${
                priority === "high"
                  ? "bg-[var(--error)]"
                  : priority === "low"
                  ? "bg-[var(--success)]"
                  : "bg-[var(--warning)]"
              }`}
            />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/5 hover:bg-[var(--error)]/20 border border-[var(--border)] hover:border-[var(--error)]/40 text-[var(--text-sub)] hover:text-[var(--error)] w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold tracking-tight">
                  {t("dashboard:tasks.createModal.title") || "Giao Việc Mới"}
                </h2>
              </div>

              {/* Shaking Wrapper */}
              <motion.div
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Left Column */}
                <div className="flex flex-col gap-4">
                  {/* Task Title */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      {t("dashboard:tasks.createModal.taskTitle") || "Tên công việc"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 px-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                      placeholder={t("dashboard:tasks.createModal.taskTitlePlaceholder") || "VD: Kiểm tra báo cáo Q2, Cập nhật tài liệu..."}
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      {t("dashboard:tasks.createModal.taskDesc") || "Mô tả chi tiết (không bắt buộc)"}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full h-24 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-main)] outline-none resize-none focus:border-[var(--primary)] transition-all duration-300"
                      placeholder="Mô tả các yêu cầu, kết quả cần đạt..."
                    />
                  </div>

                  {/* Attachments Section */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      Tài liệu đính kèm (Ảnh hoặc File)
                    </label>
                    <div className="relative border border-dashed border-[var(--border)] rounded-lg p-4 bg-[var(--input-bg)]/40 hover:bg-[var(--input-bg)]/80 transition-colors duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer group min-h-[90px]">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        title=""
                      />
                      <Paperclip className="w-5 h-5 text-[var(--text-sub)] group-hover:text-[var(--primary)] transition-colors" />
                      <span className="text-xs text-[var(--text-sub)] group-hover:text-[var(--text-main)] transition-colors">
                        Bấm hoặc Kéo thả ảnh/tài liệu vào đây (Tối đa 2MB/file)
                      </span>
                    </div>

                    {/* Attachments List */}
                    {attachments.length > 0 && (
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto mt-2 scrollbar-thin">
                        {attachments.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs gap-3 group animate-fade-in"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <File className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
                              <span className="font-medium truncate text-[var(--text-main)]" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-sub)] flex-shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-[var(--text-sub)] hover:text-red-500 p-1 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4">
                  {/* Select Employee with search */}
                  <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      {t("dashboard:tasks.createModal.selectEmployee") || "Chọn nhân viên"} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                        placeholder="Nhập tên hoặc email nhân viên..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setSelectedEmpId(""); // Clear selection
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-sub)]" />
                    </div>

                    {/* Dropdown suggestions */}
                    <AnimatePresence>
                      {showDropdown && filteredEmployees.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute top-[100%] left-0 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-20 max-h-56 overflow-y-auto scrollbar-thin"
                        >
                          {filteredEmployees.map((emp) => (
                            <div
                              key={emp._id}
                              onClick={() => handleSelectEmployee(emp)}
                              className="flex items-center gap-3 p-3 hover:bg-[var(--shell)] cursor-pointer transition-all duration-200 border-b border-[var(--border)] last:border-b-0"
                            >
                              {emp.avatarUrl ? (
                                <img
                                  src={emp.avatarUrl}
                                  alt={emp.name}
                                  className="w-8 h-8 rounded-full border border-[var(--border)] object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-[var(--text-sub)]" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[var(--text-main)]">
                                  {emp.name}
                                </span>
                                <span className="text-xs text-[var(--text-sub)]">
                                  {emp.email}
                                </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Scheduled Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                        Ngày bắt đầu <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                        />
                        <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-sub)]" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                        Ngày kết thúc <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                        />
                        <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-sub)]" />
                      </div>
                    </div>
                  </div>

                  {/* Start & End Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                        {t("dashboard:tasks.createModal.timeStart") || "Giờ bắt đầu"} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                        />
                        <Clock className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-sub)]" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                        {t("dashboard:tasks.createModal.timeEnd") || "Giờ kết thúc"} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all duration-300"
                        />
                        <Clock className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-sub)]" />
                      </div>
                    </div>
                  </div>

                  {/* Priority Selection */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-sub)]">
                      {t("dashboard:tasks.createModal.priorityLabel") || "Độ ưu tiên"}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["low", "medium", "high"] as TaskPriority[]).map((p) => {
                        const getPriorityStyle = (pr: TaskPriority) => {
                          const isSelected = priority === pr;
                          switch (pr) {
                            case "high":
                              return isSelected
                                ? "bg-[var(--error)] text-white border-[var(--error)] shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                : "bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-sub)] hover:border-[var(--error)]/40";
                            case "low":
                              return isSelected
                                ? "bg-[var(--success)] text-white border-[var(--success)] shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                : "bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-sub)] hover:border-[var(--success)]/40";
                            default:
                              return isSelected
                                ? "bg-[var(--warning)] text-white border-[var(--warning)] shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                : "bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-sub)] hover:border-[var(--warning)]/40";
                          }
                        };

                        const getLabel = (pr: TaskPriority) => {
                          if (pr === "high") return t("dashboard:schedule.taskModal.priorityHigh") || "Cao";
                          if (pr === "low") return t("dashboard:schedule.taskModal.priorityLow") || "Thấp";
                          return t("dashboard:schedule.taskModal.priorityMedium") || "Trung bình";
                        };

                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePrioritySelect(p)}
                            className={`py-2 px-3 text-xs font-semibold border rounded-lg transition-all duration-300 cursor-pointer ${getPriorityStyle(p)}`}
                          >
                            {getLabel(p)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Requires Review Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-lg border border-[var(--border)] bg-[var(--input-bg)]/40 hover:bg-[var(--input-bg)] transition-colors duration-200">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={requiresReview}
                    onChange={(e) => setRequiresReview(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors duration-300 ${requiresReview ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${requiresReview ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    Cần kiểm duyệt
                  </span>
                  <span className="text-xs text-[var(--text-sub)]">
                    {requiresReview
                      ? "Nhân viên phải nộp kết quả, manager phê duyệt mới hoàn thành"
                      : "Nhân viên tự đánh dấu hoàn thành mà không cần manager duyệt"}
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:brightness-110 text-white font-semibold text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
              >
                {submitting ? "Đang giao việc..." : (t("dashboard:tasks.createModal.btnAssign") || "Giao việc")}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTaskModal;
