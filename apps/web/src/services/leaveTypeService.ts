import api from "@/services/api";

export interface LeaveType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  defaultQuotaDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypePayload {
  code: string;
  name: string;
  description?: string;
  defaultQuotaDays?: number;
  isPaid?: boolean;
  requiresApproval?: boolean;
  isActive?: boolean;
}

export type UpdateLeaveTypePayload = Partial<Omit<CreateLeaveTypePayload, "code">>;

export const listLeaveTypes = async (activeOnly = false): Promise<LeaveType[]> => {
  const { data } = await api.get("/leave/types", {
    params: activeOnly ? { activeOnly: "true" } : undefined,
  });
  const payload = data?.data ?? data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const getLeaveType = async (id: string): Promise<LeaveType> => {
  const { data } = await api.get(`/leave/types/${id}`);
  return data.data;
};

export const createLeaveType = async (payload: CreateLeaveTypePayload): Promise<LeaveType> => {
  const { data } = await api.post("/leave/types", payload);
  return data.data;
};

export const updateLeaveType = async (
  id: string,
  payload: UpdateLeaveTypePayload
): Promise<LeaveType> => {
  const { data } = await api.put(`/leave/types/${id}`, payload);
  return data.data;
};

export const deleteLeaveType = async (id: string): Promise<void> => {
  await api.delete(`/leave/types/${id}`);
};

export interface AdjustLeaveBalancePayload {
  leaveType: "annual" | "sick" | "unpaid" | "compensatory" | "maternity";
  total: number;
}

export const adjustLeaveBalance = async (
  userId: string,
  payload: AdjustLeaveBalancePayload
): Promise<{ leaveType: string; total: number; used: number; remaining: number }> => {
  const { data } = await api.patch(`/leave/balance/${userId}`, payload);
  return data.data;
};
