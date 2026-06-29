import React, { useState } from "react";
import { User, Clock, Calendar, Filter } from "lucide-react";
import type { ManagerTask, TaskStatus } from "@/types/schedule";
import taskService from "@/services/taskService";
import { toast } from "sonner";

interface EmployeeTaskBoardProps {
  tasks: ManagerTask[];
  onItemClick: (task: ManagerTask) => void;
  onTaskUpdated: (task: ManagerTask) => void;
}

// 4 cột; "Bị từ chối" hiển thị chung trong cột "Đang làm" với thẻ màu đỏ (đồng bộ bảng Manager)
const columns: { status: TaskStatus; title: string; dotColor: string }[] = [
  { status: "assigned", title: "Chờ thực hiện", dotColor: "bg-[var(--early)]" },
  { status: "in_progress", title: "Đang làm", dotColor: "bg-[var(--primary)]" },
  { status: "pending_review", title: "Chờ duyệt", dotColor: "bg-[var(--warning)]" },
  { status: "completed", title: "Hoàn thành", dotColor: "bg-[var(--success)]" },
];

export const EmployeeTaskBoard: React.FC<EmployeeTaskBoardProps> = ({ tasks, onItemClick, onTaskUpdated }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Drag & drop state
  const [draggedTask, setDraggedTask] = useState<ManagerTask | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Chuyển hợp lệ với vai trò nhân viên (assignee):
  //  - assigned       -> in_progress   (Bắt đầu — gọi API trực tiếp)
  //  - in_progress/rejected -> pending_review (Nộp kết quả — cần ghi chú, mở modal)
  const isValidDrop = (src: ManagerTask, target: TaskStatus) =>
    (target === "in_progress" && src.status === "assigned") ||
    (target === "pending_review" && (src.status === "in_progress" || src.status === "rejected"));

  const handleDragStart = (e: React.DragEvent, task: ManagerTask) => {
    setDraggedTask(task);
    e.dataTransfer.setData("text/plain", task._id);
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
    setDraggedTask(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && isValidDrop(draggedTask, status)) setDragOverCol(status);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: React.DragEvent, target: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const src = draggedTask;
    if (!src) return;

    // "Bị từ chối" nằm chung cột "Đang làm" -> coi như cùng cột in_progress
    const srcCol: TaskStatus = src.status === "rejected" ? "in_progress" : src.status;
    if (srcCol === target) return;

    // Bắt đầu: assigned -> in_progress (không cần ghi chú)
    if (target === "in_progress" && src.status === "assigned") {
      try {
        const updated = await taskService.startTask(src._id);
        onTaskUpdated(updated);
        toast.success("Đã bắt đầu thực hiện công việc");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Không thể bắt đầu công việc");
      }
      return;
    }

    // Nộp kết quả: in_progress/rejected -> pending_review (cần ghi chú -> mở modal)
    if (target === "pending_review" && (src.status === "in_progress" || src.status === "rejected")) {
      onItemClick(src);
      toast.info("Nhập ghi chú rồi bấm 'Nộp kết quả' trong cửa sổ chi tiết.");
      return;
    }

    toast.error("Thao tác kéo-thả không hợp lệ.");
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all") {
      if (statusFilter === "in_progress") {
        // Cột "Đang làm" gồm cả công việc bị từ chối
        if (task.status !== "in_progress" && task.status !== "rejected") return false;
      } else if (task.status !== statusFilter) {
        return false;
      }
    }
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    return true;
  });

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <span>📋</span>
            <span>Công việc của tôi</span>
          </h2>
          <p className="text-xs text-[var(--text-sub)]">
            Nhấp vào từng công việc để xem chi tiết, bắt đầu hoặc nộp kết quả.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-sub)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-[var(--text-main)] outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-[var(--surface)]">Tất cả trạng thái</option>
              {columns.map((c) => (
                <option key={c.status} value={c.status} className="bg-[var(--surface)]">
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-sub)] uppercase font-semibold whitespace-nowrap">Ưu tiên</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-[var(--text-main)] outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-[var(--surface)]">Tất cả</option>
              <option value="low" className="bg-[var(--surface)]">Thấp</option>
              <option value="medium" className="bg-[var(--surface)]">Trung bình</option>
              <option value="high" className="bg-[var(--surface)]">Cao</option>
            </select>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) =>
            col.status === "in_progress"
              ? t.status === "in_progress" || t.status === "rejected"
              : t.status === col.status
          );

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`border rounded-2xl p-3 flex flex-col gap-3 min-h-[300px] transition-all duration-300 ${
                dragOverCol === col.status
                  ? "bg-[var(--primary)]/5 border-dashed border-[var(--primary)]"
                  : "bg-[var(--input-bg)] border-[var(--border)]"
              }`}
            >
              {/* Column Header */}
              <header className="flex justify-between items-center border-b border-[var(--border)] pb-2 select-none">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{col.title}</h3>
                </div>
                <span className="bg-white/5 border border-[var(--border)] text-[var(--text-sub)] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </header>

              {/* Cards */}
              <div className="flex flex-col gap-2.5 flex-grow">
                {colTasks.length === 0 ? (
                  <div className="text-center text-xs text-[var(--text-sub)] italic py-8 select-none">
                    Chưa có công việc
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isRejected = task.status === "rejected";

                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onItemClick(task)}
                        className={`border rounded-xl p-3 cursor-pointer flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 group ${
                          isRejected
                            ? "bg-[var(--error)]/10 border-[var(--error)]/40 hover:border-[var(--error)]/70"
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4
                            className={`text-sm font-semibold text-[var(--text-main)] line-clamp-2 transition-colors duration-200 ${
                              isRejected ? "group-hover:text-[var(--error)]" : "group-hover:text-[var(--primary)]"
                            }`}
                          >
                            {task.title}
                          </h4>
                          {isRejected && (
                            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--error)]/20 text-[var(--error)] whitespace-nowrap">
                              Bị từ chối
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-sub)] line-clamp-2 leading-relaxed">
                          {task.description || "Không có mô tả chi tiết."}
                        </p>

                        {isRejected && task.managerReview?.note && (
                          <div className="bg-[var(--error)]/15 border border-[var(--error)]/20 rounded-lg p-2.5 text-[11px] text-[var(--error)] leading-relaxed">
                            <span className="font-bold uppercase text-[9px] tracking-wider block mb-0.5">Lý do từ chối:</span>
                            "{task.managerReview.note}"
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-1">
                          <div className="flex justify-between items-center text-[11px] text-[var(--text-sub)]">
                            <div className="flex items-center gap-1.5 font-medium truncate max-w-[70%]">
                              {task.assignedBy?.avatarUrl ? (
                                <img
                                  src={task.assignedBy.avatarUrl}
                                  alt="manager"
                                  className="w-5 h-5 rounded-full border border-[var(--border)] object-cover"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-[var(--text-sub)]" />
                                </div>
                              )}
                              <span className="truncate">{task.assignedBy?.name || "Quản lý"}</span>
                            </div>
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                task.priority === "high"
                                  ? "bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/20"
                                  : task.priority === "low"
                                  ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20"
                                  : "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/20"
                              }`}
                            >
                              {task.priority === "high" ? "Cao" : task.priority === "low" ? "Thấp" : "Vừa"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-[var(--text-sub)]">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{task.startTime} - {task.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1 max-w-[50%] shrink-0">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {task.startDate === task.endDate
                                  ? (task.startDate || "").substring(5)
                                  : `${(task.startDate || "").substring(5)} - ${(task.endDate || "").substring(5)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeTaskBoard;
