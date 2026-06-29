import api from "@/services/api";
import type { ManagerTask, TaskPriority } from "@/types/schedule";

const taskService = {
  getMyTasks: async (startDate: string, endDate: string): Promise<ManagerTask[]> => {
    const response = await api.get("/tasks/my-tasks", { params: { startDate, endDate } });
    return response.data.data || [];
  },

  getDepartmentTasks: async (params?: {
    startDate?: string;
    endDate?: string;
    assignedTo?: string;
    status?: string;
  }): Promise<ManagerTask[]> => {
    const response = await api.get("/tasks/department", { params });
    return response.data.data || [];
  },

  createTask: async (payload: {
    title: string;
    description?: string;
    assignedTo: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    priority?: TaskPriority;
    projectId?: string;
    attachments?: Array<{
      name: string;
      url: string;
      type?: string;
      size?: number;
    }>;
  }): Promise<ManagerTask> => {
    const response = await api.post("/tasks", payload);
    return response.data.data;
  },

  startTask: async (taskId: string): Promise<ManagerTask> => {
    const response = await api.patch(`/tasks/${taskId}/start`);
    return response.data.data;
  },

  submitTask: async (taskId: string, note: string): Promise<ManagerTask> => {
    const response = await api.patch(`/tasks/${taskId}/submit`, { note });
    return response.data.data;
  },

  reviewTask: async (
    taskId: string,
    decision: "approved" | "rejected",
    note?: string
  ): Promise<ManagerTask> => {
    const response = await api.patch(`/tasks/${taskId}/review`, { decision, note });
    return response.data.data;
  },

  updateTask: async (
    taskId: string,
    payload: Partial<{
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      priority: TaskPriority;
    }>
  ): Promise<ManagerTask> => {
    const response = await api.put(`/tasks/${taskId}`, payload);
    return response.data.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },
};

export default taskService;
