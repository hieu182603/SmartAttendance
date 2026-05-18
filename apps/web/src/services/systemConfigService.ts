import api from "@/services/api";

export type SystemConfigCategory =
  | "attendance"
  | "payroll"
  | "general"
  | "security"
  | "notification";

export interface SystemConfig {
  _id: string;
  key: string;
  category: SystemConfigCategory;
  value: unknown;
  description?: string;
  editableBy?: string[];
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemConfigPayload {
  key: string;
  category: SystemConfigCategory;
  value: unknown;
  description?: string;
  editableBy?: string[];
}

export interface UpdateSystemConfigPayload {
  value: unknown;
  category?: SystemConfigCategory;
  description?: string;
  editableBy?: string[];
}

export const listSystemConfigs = async (
  category?: SystemConfigCategory
): Promise<SystemConfig[]> => {
  const { data } = await api.get("/config", {
    params: category ? { category } : undefined,
  });
  return data.data || [];
};

export const getSystemConfigByKey = async (key: string): Promise<SystemConfig> => {
  const { data } = await api.get(`/config/${encodeURIComponent(key)}`);
  return data.data;
};

export const createSystemConfig = async (
  payload: CreateSystemConfigPayload
): Promise<SystemConfig> => {
  const { data } = await api.post("/config", payload);
  return data.data;
};

export const updateSystemConfig = async (
  key: string,
  payload: UpdateSystemConfigPayload
): Promise<SystemConfig> => {
  const { data } = await api.put(`/config/${encodeURIComponent(key)}`, payload);
  return data.data;
};

export const deleteSystemConfig = async (key: string): Promise<void> => {
  await api.delete(`/config/${encodeURIComponent(key)}`);
};
