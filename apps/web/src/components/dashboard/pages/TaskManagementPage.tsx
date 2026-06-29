import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronLeft, ChevronRight, User, Clock, Calendar,
  CheckCircle, AlertCircle, FileText, CheckSquare, RefreshCw,
  Folder, X, Trash2, XCircle, Flag, Filter
} from "lucide-react";
import { getAllUsers, getMyTeamMembers } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { resolveUserId } from "@/utils/userId";
import { formatDateLocal } from "@/utils/date";
import taskService from "@/services/taskService";
import projectService from "@/services/projectService";
import CreateTaskModal from "@/components/dashboard/schedule/CreateTaskModal";
import ReviewTaskModal from "@/components/dashboard/schedule/ReviewTaskModal";
import type { ManagerTask, TaskStatus } from "@/types/schedule";
import { toast } from "sonner";

interface Employee {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  icon: React.ReactNode;
  placeholder: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  icon,
  placeholder,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0b0f19] hover:bg-[#0b0f19]/80 border border-[var(--border)] rounded-lg py-2.5 px-3 flex items-center justify-between gap-2.5 transition-all duration-300 shadow-sm cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-[var(--text-sub)] flex-shrink-0">{icon}</div>
          <span className="text-xs text-[var(--text-main)] font-medium truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-[var(--text-sub)] transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "transform rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Options List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-1.5 w-full bg-[#0f172a] border border-[var(--border)] rounded-lg shadow-xl overflow-y-auto max-h-60 scrollbar-thin"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors duration-150 cursor-pointer flex items-center justify-between ${
                  option.value === value
                    ? "bg-[var(--primary)] text-white font-semibold"
                    : "text-[var(--text-main)] hover:bg-[#1e293b]/70"
                }`}
              >
                <span>{option.value === "all" ? placeholder : option.label}</span>
                {option.value === value && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface Project {
  id: string;
  name: string;
  code: string;
  status: "active" | "paused";
  desc: string;
  members: string[]; // List of employee names
}

export const TaskManagementPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]);
  const { user } = useAuth();
  const currentUserId = resolveUserId(user);

  // Chỉ người tạo task (assignedBy) mới được duyệt (khớp ràng buộc backend reviewTask)
  const canReviewTask = (task: ManagerTask) =>
    String(task.assignedBy?._id || "") === String(currentUserId || "");

  // State
  const [tasks, setTasks] = useState<ManagerTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Projects State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // Load projects from the backend (replaces the previous localStorage mock)
  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectService.getProjects();
      setProjectsList(
        data.map((p) => ({
          id: p._id,
          name: p.name,
          code: p.code,
          status: p.status,
          desc: p.description,
          members: p.members || [],
        }))
      );
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Toàn bộ task của công ty/phòng ban (KHÔNG giới hạn theo tuần) — chỉ dùng để tính
  // tiến độ dự án ở màn danh sách, tránh sai số do bộ lọc tuần của Kanban.
  const [projectStatsTasks, setProjectStatsTasks] = useState<ManagerTask[]>([]);
  const fetchProjectStats = useCallback(async () => {
    try {
      const data = await taskService.getDepartmentTasks();
      setProjectStatsTasks(data);
    } catch (err) {
      console.error("Error fetching project stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchProjectStats();
  }, [fetchProjectStats]);

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!window.confirm("Xóa dự án này? Các công việc thuộc dự án sẽ không còn được nhóm vào dự án.")) {
      return;
    }
    try {
      await projectService.deleteProject(projectId);
      setProjectsList((prev) => prev.filter((p) => p.id !== projectId));
      toast.success("Đã xóa dự án");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xóa dự án thất bại");
    }
  };

  // Create Project Form State
  const [newProjName, setNewProjName] = useState("");
  const [newProjCode, setNewProjCode] = useState("");
  const [newProjStatus, setNewProjStatus] = useState<"active" | "paused">("active");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjMembers, setNewProjMembers] = useState<string[]>([]);
  const [projMemberSearchTerm, setProjMemberSearchTerm] = useState("");
  const [showProjMemberDropdown, setShowProjMemberDropdown] = useState(false);

  // Filters
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<ManagerTask | null>(null);

  // Drag and Drop state
  const [draggedTask, setDraggedTask] = useState<ManagerTask | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Calculate start and end date of the selected week (Monday - Sunday)
  const getWeekRange = useCallback((offset: number) => {
    const today = new Date();
    const day = today.getDay();
    // Monday is 1, Sunday is 0 (change to 7)
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(diffToMonday + offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  }, []);

  const { startOfWeek, endOfWeek } = useMemo(() => getWeekRange(weekOffset), [weekOffset, getWeekRange]);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user) return;
      try {
        let res: any;
        const isAdminOrHr = ["ADMIN", "HR_MANAGER", "SUPER_ADMIN"].includes(user.role);
        if (isAdminOrHr) {
          res = await getAllUsers({ limit: 1000 });
        } else if (user.role === "MANAGER") {
          res = await getMyTeamMembers();
        } else {
          setEmployees([]);
          return;
        }

        const formatted = (res?.users || []).map((u: any) => ({
          _id: u._id || u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl || u.avatar,
        }));
        setEmployees(formatted);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, [user]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const startDateStr = formatDateLocal(startOfWeek);
      const endDateStr = formatDateLocal(endOfWeek);
      
      const params: any = {
        startDate: startDateStr,
        endDate: endDateStr,
      };

      if (selectedEmployeeId !== "all") params.assignedTo = selectedEmployeeId;
      if (selectedStatus !== "all") params.status = selectedStatus;

      const data = await taskService.getDepartmentTasks(params);
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      toast.error(t("dashboard:employeeManagement.errors.loadFailed") || "Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  }, [startOfWeek, endOfWeek, selectedEmployeeId, selectedStatus, t]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Navigate weeks
  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);

  // Click card handler
  const handleCardClick = (task: ManagerTask) => {
    setSelectedTaskForReview(task);
    setIsReviewOpen(true);
  };

  // Drag and Drop Handlers
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
    if (!draggedTask) return;
    // Chỉ người tạo mới được duyệt; bỏ qua nếu không phải task mình giao
    if (!canReviewTask(draggedTask)) return;
    // Chỉ cho phép thả công việc "Chờ duyệt" sang "Hoàn thành" (duyệt) hoặc "Đang làm" (từ chối)
    if (draggedTask.status === "pending_review" && (status === "completed" || status === "in_progress")) {
      setDragOverCol(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    
    if (!draggedTask) return;
    const oldStatus = draggedTask.status;

    if (oldStatus === targetStatus) return;

    // Chỉ người tạo task mới được duyệt (backend reviewTask chỉ cho assignedBy)
    if (!canReviewTask(draggedTask)) {
      toast.error("Chỉ người giao việc mới có thể duyệt công việc này.");
      return;
    }

    // Manager chỉ thao tác được trên công việc đang "Chờ duyệt".
    // (Bắt đầu/nộp việc là của nhân viên — backend chỉ cho assignee.)
    if (oldStatus !== "pending_review") {
      toast.error("Chỉ có thể duyệt công việc đang ở trạng thái 'Chờ duyệt'.");
      return;
    }

    // Kéo "Chờ duyệt" -> "Hoàn thành": mở modal để phê duyệt
    if (targetStatus === "completed") {
      setSelectedTaskForReview(draggedTask);
      setIsReviewOpen(true);
      toast.info("Vui lòng phê duyệt công việc qua modal.");
      return;
    }

    // Kéo "Chờ duyệt" -> "Đang làm": mở modal để nhập lý do từ chối
    if (targetStatus === "in_progress") {
      setSelectedTaskForReview(draggedTask);
      setIsReviewOpen(true);
      toast.info("Vui lòng nhập lý do từ chối công việc trong modal.");
      return;
    }

    toast.error("Chỉ có thể kéo công việc sang 'Hoàn thành' hoặc 'Đang làm'.");
  };

  const handleReviewSuccess = (updatedTask: ManagerTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  // Group tasks by status (4 cột; "Bị từ chối" hiển thị chung trong cột "Đang làm" với màu đỏ)
  const columns: { status: TaskStatus; title: string; color: string; dotColor: string }[] = [
    { status: "assigned", title: "Chờ thực hiện", color: "text-[var(--text-sub)]", dotColor: "bg-[var(--early)]" },
    { status: "in_progress", title: "Đang làm", color: "text-[var(--primary)]", dotColor: "bg-[var(--primary)]" },
    { status: "pending_review", title: "Chờ duyệt", color: "text-[var(--warning)]", dotColor: "bg-[var(--warning)]" },
    { status: "completed", title: "Hoàn thành", color: "text-[var(--success)]", dotColor: "bg-[var(--success)]" },
  ];

  const employeeOptions = useMemo(() => [
    { value: "all", label: "Tất cả nhân viên" },
    ...employees.map(emp => ({ value: emp._id, label: emp.name }))
  ], [employees]);

  const statusOptions = useMemo(() => [
    { value: "all", label: "Tất cả trạng thái" },
    ...columns.map(col => ({ value: col.status, label: col.title }))
  ], [columns]);

  const priorityOptions = useMemo(() => [
    { value: "all", label: "Tất cả độ ưu tiên" },
    { value: "low", label: "Độ ưu tiên: Thấp" },
    { value: "medium", label: "Độ ưu tiên: Vừa" },
    { value: "high", label: "Độ ưu tiên: Cao" }
  ], []);

  // Filtered tasks on client side
  const filteredTasks = tasks.filter((task) => {
    // If viewing a project, filter tasks by projectId
    if (activeProjectId !== null) {
      if (task.projectId !== activeProjectId) return false;
    }

    if (selectedEmployeeId !== "all" && task.assignedTo?._id !== selectedEmployeeId) {
      return false;
    }
    if (selectedStatus !== "all") {
      if (selectedStatus === "in_progress") {
        // Cột "Đang làm" gồm cả công việc bị từ chối
        if (task.status !== "in_progress" && task.status !== "rejected") return false;
      } else if (task.status !== selectedStatus) {
        return false;
      }
    }
    if (selectedPriority !== "all" && task.priority !== selectedPriority) {
      return false;
    }
    return true;
  });

  // Calculate KPIs based on filtered tasks (matches demo behavior)
  const totalTasks = filteredTasks.length;
  const inProgressCount = filteredTasks.filter((t) => t.status === "in_progress").length;
  const pendingCount = filteredTasks.filter((t) => t.status === "pending_review").length;
  const completedCount = filteredTasks.filter((t) => t.status === "completed").length;
  const rejectedCount = filteredTasks.filter((t) => t.status === "rejected").length;

  if (activeProjectId === null) {
    return (
      <div className="w-full max-w-[1200px] mx-auto min-w-0 overflow-hidden flex flex-col gap-8 p-6 text-[var(--text-main)] animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-5 flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Folder className="w-8 h-8 text-[var(--primary)]" />
              <span>Quản lý dự án (Project Management)</span>
            </h1>
            <p className="text-sm text-[var(--text-sub)]">Chọn một dự án dưới đây để xem chi tiết bảng công việc Kanban.</p>
          </div>
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:brightness-110 text-white font-semibold text-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all duration-300 cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
          >
            <span>+ Tạo dự án mới</span>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((proj) => {
            const projTasks = projectStatsTasks.filter(t => t.projectId === proj.id);
            const completedCount = projTasks.filter(t => t.status === 'completed').length;
            const totalCount = projTasks.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const statusLabel = proj.status === 'active' ? 'Đang chạy' : 'Tạm dừng';

            return (
              <div
                key={proj.id}
                onClick={() => setActiveProjectId(proj.id)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 cursor-pointer flex flex-col gap-4 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:border-blue-500/80 hover:shadow-2xl group"
              >
                {/* Accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base border ${
                    proj.code === 'SA'
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      : proj.code === 'EC'
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {proj.code}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      proj.status === 'active'
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : 'bg-[var(--warning)]/15 text-[var(--warning)]'
                    }`}>
                      {statusLabel}
                    </span>
                    <button
                      onClick={(e) => handleDeleteProject(e, proj.id)}
                      title="Xóa dự án"
                      className="text-[var(--text-sub)] hover:text-[var(--error)] p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-[var(--text-main)]">{proj.name}</h3>
                  <p className="text-xs text-[var(--text-sub)] leading-relaxed h-10 line-clamp-2">{proj.desc}</p>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between text-xs text-[var(--text-sub)]">
                    <span>Tiến độ</span>
                    <span>{completedCount}/{totalCount} Việc ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[var(--input-bg)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                  <div className="flex items-center">
                    {proj.members.slice(0, 4).map((m, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border-[1.5px] border-[var(--surface)] -ml-1.5 first:ml-0 bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--text-sub)] uppercase"
                        title={m}
                      >
                        {m.substring(0, 1)}
                      </div>
                    ))}
                    {proj.members.length > 4 && (
                      <div className="w-6 h-6 rounded-full border-[1.5px] border-[var(--surface)] -ml-1.5 bg-[var(--input-bg)] flex items-center justify-center text-[9px] font-bold text-[var(--text-sub)]">
                        +{proj.members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-sub)] flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{totalCount} Công việc</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Project Modal */}
        <AnimatePresence>
          {isCreateProjectOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateProjectOpen(false)}
                className="fixed inset-0 bg-[#050812]/75 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-[550px] overflow-hidden shadow-2xl z-10 relative"
              >
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)]" />
                <button
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="absolute top-4 right-4 text-[var(--text-sub)] hover:text-[var(--text-main)] p-1 rounded transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newProjName.trim() || !newProjCode.trim() || !newProjDesc.trim()) {
                      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
                      return;
                    }
                    try {
                      const created = await projectService.createProject({
                        name: newProjName.trim(),
                        code: newProjCode.toUpperCase().trim(),
                        status: newProjStatus,
                        description: newProjDesc.trim(),
                        members: newProjMembers,
                      });
                      setProjectsList((prev) => [
                        {
                          id: created._id,
                          name: created.name,
                          code: created.code,
                          status: created.status,
                          desc: created.description,
                          members: created.members || [],
                        },
                        ...prev,
                      ]);
                      toast.success("Tạo dự án thành công!");
                      // Reset
                      setNewProjName("");
                      setNewProjCode("");
                      setNewProjStatus("active");
                      setNewProjDesc("");
                      setNewProjMembers([]);
                      setIsCreateProjectOpen(false);
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || "Tạo dự án thất bại");
                    }
                  }}
                  className="p-6 flex flex-col gap-5 text-[var(--text-main)]"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2 border-b border-[var(--border)] pb-3">
                    <Plus className="w-5 h-5 text-[var(--text-sub)]" />
                    <span>Tạo dự án mới</span>
                  </h2>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-sub)]">Tên dự án *</label>
                      <input
                        type="text"
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        placeholder="VD: Smart Attendance, Mobile App..."
                        required
                        className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-[#0f172a]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-sub)]">Mã viết tắt (2-3 ký tự) *</label>
                        <input
                          type="text"
                          value={newProjCode}
                          onChange={(e) => setNewProjCode(e.target.value)}
                          placeholder="VD: SA, EC, HR..."
                          maxLength={3}
                          required
                          className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-[#0f172a]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--text-sub)]">Trạng thái *</label>
                        <select
                          value={newProjStatus}
                          onChange={(e) => setNewProjStatus(e.target.value as any)}
                          required
                          className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-[#0f172a]"
                        >
                          <option value="active">Đang chạy</option>
                          <option value="paused">Tạm dừng</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[var(--text-sub)]">Mô tả dự án *</label>
                      <textarea
                        value={newProjDesc}
                        onChange={(e) => setNewProjDesc(e.target.value)}
                        placeholder="Mô tả tóm tắt mục tiêu và phạm vi của dự án..."
                        required
                        className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm h-20 resize-none focus:outline-none focus:border-[var(--primary)] transition-colors bg-[#0f172a]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-xs font-semibold text-[var(--text-sub)]">Thành viên tham gia dự án</label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[34px] border border-dashed border-[var(--border)] p-2 rounded-lg bg-[var(--input-bg)]/30">
                        {newProjMembers.length === 0 ? (
                          <span className="text-[11px] text-[var(--text-sub)] italic">Chưa có thành viên nào được chọn</span>
                        ) : (
                          newProjMembers.map((m) => (
                            <span key={m} className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium bg-[#1d234a]">
                              {m}
                              <button
                                type="button"
                                onClick={() => setNewProjMembers(prev => prev.filter(x => x !== m))}
                                className="hover:text-red-500 font-bold ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={projMemberSearchTerm}
                          onChange={(e) => {
                            setProjMemberSearchTerm(e.target.value);
                            setShowProjMemberDropdown(true);
                          }}
                          onFocus={() => setShowProjMemberDropdown(true)}
                          placeholder="Tìm thành viên theo tên..."
                          className="bg-[var(--input-bg)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm w-full focus:outline-none focus:border-[var(--primary)] transition-colors bg-[#0f172a]"
                        />
                        {showProjMemberDropdown && projMemberSearchTerm && (
                          <div className="absolute top-full left-0 w-full max-h-40 overflow-y-auto bg-[#1a273f] border border-[var(--border)] rounded-lg z-20 mt-1 shadow-xl">
                            {employees
                              .filter(emp => emp.name.toLowerCase().includes(projMemberSearchTerm.toLowerCase()) && !newProjMembers.includes(emp.name))
                              .map(emp => (
                                <div
                                  key={emp._id}
                                  onClick={() => {
                                    setNewProjMembers(prev => [...prev, emp.name]);
                                    setProjMemberSearchTerm("");
                                    setShowProjMemberDropdown(false);
                                  }}
                                  className="py-2 px-3 text-xs hover:bg-[var(--primary)]/25 cursor-pointer flex items-center justify-between"
                                >
                                  <span>{emp.name}</span>
                                  <span className="text-[10px] text-[var(--text-sub)]">{emp.email}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateProjectOpen(false)}
                      className="border border-[var(--border)] text-xs font-semibold py-2.5 px-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] text-white text-xs font-bold py-2.5 px-5 rounded-lg hover:brightness-110 transition-all cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.25)]"
                    >
                      Tạo dự án
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto min-w-0 overflow-hidden flex flex-col gap-6 p-6 text-[var(--text-main)]">
      {/* Breadcrumb Header */}
      <header className="flex flex-col gap-3 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-4 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveProjectId(null)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg py-1.5 px-3 flex items-center gap-2 hover:bg-[var(--input-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all duration-200 cursor-pointer text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Dự án</span>
            </button>
            <span className="text-[var(--text-sub)] text-lg">/</span>
            <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <Folder className="w-5.5 h-5.5 text-[var(--primary)]" />
              <span>{projectsList.find(p => p.id === activeProjectId)?.name || "Smart Attendance System"}</span>
            </h1>
          </div>
          <div className="text-xs text-[var(--text-sub)]" id="current-day-label">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between hover:border-[var(--primary)] transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-sub)]">Tổng việc</span>
            <span className="text-2xl font-bold text-[var(--primary)]">{totalTasks}</span>
          </div>
          <FileText className="w-8 h-8 text-[var(--primary)] opacity-80" />
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between hover:border-[var(--primary)] transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-sub)]">Đang làm</span>
            <span className="text-2xl font-bold text-[var(--primary)]">{inProgressCount}</span>
          </div>
          <RefreshCw className="w-8 h-8 text-[var(--primary)] opacity-80 animate-spin-slow" />
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between hover:border-[var(--primary)] transition-all duration-300 relative">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-sub)]">Chờ duyệt</span>
            <span className="text-2xl font-bold text-[var(--warning)]">{pendingCount}</span>
          </div>
          <div className="relative">
            <AlertCircle className="w-8 h-8 text-[var(--warning)] opacity-80" />
            {pendingCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[var(--warning)] rounded-full animate-ping" />
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between hover:border-[var(--primary)] transition-all duration-300">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-sub)]">Hoàn thành</span>
            <span className="text-2xl font-bold text-[var(--success)]">{completedCount}</span>
          </div>
          <CheckCircle className="w-8 h-8 text-[var(--success)] opacity-80" />
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between hover:border-[var(--primary)] transition-all duration-300 relative">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-sub)]">Bị từ chối</span>
            <span className="text-2xl font-bold text-[var(--error)]">{rejectedCount}</span>
          </div>
          <div className="relative">
            <XCircle className="w-8 h-8 text-[var(--error)] opacity-80" />
            {rejectedCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[var(--error)] rounded-full animate-ping" />
            )}
          </div>
        </div>
      </section>

      {/* Toolbar / Filters */}
      <section className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl flex flex-wrap items-center gap-3">
        {/* Left Nav (Week picker) */}
        <div className="flex items-center bg-[#0b0f19] border border-[var(--border)] rounded-lg p-1 w-full sm:w-auto justify-between sm:justify-start shadow-inner">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 hover:bg-white/5 text-[var(--text-sub)] hover:text-[var(--text-main)] rounded transition-all duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[var(--text-main)] px-2 min-w-[120px] sm:min-w-[130px] text-center select-none tracking-wide">
            {daysOfWeek[0].getDate()}/{daysOfWeek[0].getMonth() + 1} - {daysOfWeek[6].getDate()}/{daysOfWeek[6].getMonth() + 1}/{daysOfWeek[6].getFullYear()}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-1.5 hover:bg-white/5 text-[var(--text-sub)] hover:text-[var(--text-main)] rounded transition-all duration-200 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Employee filter */}
        <CustomSelect
          value={selectedEmployeeId}
          onChange={setSelectedEmployeeId}
          options={employeeOptions}
          icon={<User className="w-4 h-4" />}
          placeholder="Tất cả nhân viên"
          className="w-full sm:w-auto sm:min-w-[150px] md:min-w-[170px]"
        />

        {/* Status filter */}
        <CustomSelect
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={statusOptions}
          icon={<Filter className="w-4 h-4" />}
          placeholder="Tất cả trạng thái"
          className="w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
        />

        {/* Priority filter */}
        <CustomSelect
          value={selectedPriority}
          onChange={setSelectedPriority}
          options={priorityOptions}
          icon={<Flag className="w-4 h-4" />}
          placeholder="Tất cả độ ưu tiên"
          className="w-full sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
        />

        {/* Add button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent-cyan)] hover:brightness-110 text-white font-semibold text-xs py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.3)] w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t("dashboard:tasks.assignNew") || "Giao việc mới"}</span>
        </button>
      </section>

      {/* Kanban Board Container */}
      <div className="w-full pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) =>
              col.status === "in_progress"
                ? t.status === "in_progress" || t.status === "rejected"
                : t.status === col.status
            );
            const isDragOver = dragOverCol === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`bg-[var(--surface)] border rounded-2xl p-3 flex flex-col gap-3 min-h-[500px] transition-all duration-300 ${
                  isDragOver ? "bg-[var(--primary)]/5 border-dashed border-[var(--primary)]" : "border-[var(--border)]"
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

                {/* Column Cards Container */}
                <div className="flex flex-col gap-2.5 flex-grow overflow-y-auto max-h-[500px] p-0.5 scrollbar-thin">
                  {loading ? (
                    // Skeletons
                    Array.from({ length: 2 }).map((_, idx) => (
                      <div key={idx} className="bg-[var(--input-bg)] border border-[var(--border)] p-4 rounded-xl flex flex-col gap-3 animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/10 rounded w-5/6" />
                        <div className="h-6 bg-white/10 rounded w-1/3 mt-2" />
                      </div>
                    ))
                  ) : colTasks.length === 0 ? (
                    <div className="text-center text-xs text-[var(--text-sub)] italic py-10 select-none">
                      Chưa có công việc
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const isPendingReview = task.status === "pending_review";
                      
                      return (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleCardClick(task)}
                          className={`border rounded-xl p-3 cursor-pointer flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 relative group ${
                            task.status === "rejected"
                              ? "bg-[var(--error)]/10 border-[var(--error)]/40 hover:border-[var(--error)]/70"
                              : "bg-[var(--input-bg)] border-[var(--border)] hover:border-[var(--primary)]/50"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm font-semibold text-[var(--text-main)] transition-colors duration-200 line-clamp-2 ${
                              task.status === "rejected" ? "group-hover:text-[var(--error)]" : "group-hover:text-[var(--primary)]"
                            }`}>
                              {task.title}
                            </h4>
                            {isPendingReview && (
                              <span className="w-2 h-2 bg-[var(--warning)] rounded-full shrink-0 mt-1 shadow-[0_0_8px_rgba(245,158,11,0.7)] animate-ping" />
                            )}
                            {task.status === "rejected" && (
                              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--error)]/20 text-[var(--error)] whitespace-nowrap">
                                Bị từ chối
                              </span>
                            )}
                            {isPendingReview && !canReviewTask(task) && (
                              <span
                                className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-sub)] whitespace-nowrap"
                                title="Task do người khác giao — chỉ người giao mới duyệt được"
                              >
                                Khác giao
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--text-sub)] line-clamp-2 leading-relaxed">
                            {task.description || "Không có mô tả chi tiết."}
                          </p>

                          {/* Rejected Manager Note block */}
                          {task.status === "rejected" && task.managerReview?.note && (
                            <div className="bg-[var(--error)]/15 border border-[var(--error)]/20 rounded-lg p-2.5 text-[11px] text-[var(--error)] leading-relaxed">
                              <span className="font-bold uppercase text-[9px] tracking-wider block mb-0.5">Lý do từ chối:</span>
                              "{task.managerReview.note}"
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-1">
                            <div className="flex justify-between items-center text-[11px] text-[var(--text-sub)]">
                              <div className="flex items-center gap-1.5 font-medium truncate max-w-[70%]">
                                {task.assignedTo?.avatarUrl ? (
                                  <img
                                    src={task.assignedTo.avatarUrl}
                                    alt="emp"
                                    className="w-5.5 h-5.5 rounded-full border border-[var(--border)] object-cover"
                                  />
                                ) : (
                                  <div className="w-5.5 h-5.5 rounded-full border border-[var(--border)] bg-white/10 flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                                  </div>
                                )}
                                <span className="truncate">{task.assignedTo?.name}</span>
                              </div>
                              <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                task.priority === "high"
                                  ? "bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/20"
                                  : task.priority === "low"
                                  ? "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/20"
                                  : "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/20"
                              }`}>
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

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchTasks}
        projectId={activeProjectId || undefined}
        employees={employees}
      />

      <ReviewTaskModal
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedTaskForReview(null);
        }}
        task={selectedTaskForReview}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
};

export default TaskManagementPage;
