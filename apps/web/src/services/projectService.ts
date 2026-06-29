import api from "@/services/api";
import type { ProjectDTO } from "@/types/schedule";

const projectService = {
  getProjects: async (): Promise<ProjectDTO[]> => {
    const response = await api.get("/projects");
    return response.data.data || [];
  },

  createProject: async (payload: {
    name: string;
    code: string;
    description?: string;
    status?: "active" | "paused";
    members?: string[];
  }): Promise<ProjectDTO> => {
    const response = await api.post("/projects", payload);
    return response.data.data;
  },

  updateProject: async (
    projectId: string,
    payload: Partial<{
      name: string;
      code: string;
      description: string;
      status: "active" | "paused";
      members: string[];
    }>
  ): Promise<ProjectDTO> => {
    const response = await api.put(`/projects/${projectId}`, payload);
    return response.data.data;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },
};

export default projectService;
