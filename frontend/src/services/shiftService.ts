// src/services/shiftService.ts
import api from "@/services/api";

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  isFlexible?: boolean;
  description?: string;
  isActive?: boolean;
}

const shiftService = {
  // Lấy tất cả các loại ca làm việc (Ca sáng, Ca chiều, Ca đêm...)
  getAllShifts: async (): Promise<Shift[]> => {
    const response = await api.get("/shifts");
    // Backend trả: { success: true, data: [...] }
    return response.data.data || [];
  },

  // Lấy ca theo ID
  getShiftById: async (id: string): Promise<Shift | null> => {
    try {
      const response = await api.get(`/shifts/${id}`);
      return response.data.data || null;
    } catch (error) {
      console.error('[shiftService] getShiftById error:', error);
      return null;
    }
  },

  // Assign shift cho nhân viên
  assignShiftToEmployee: async (userId: string, shiftId: string) => {
    const response = await api.post(`/shifts/${shiftId}/assign`, { userId });
    return response.data;
  },

  // Bulk assign shift cho nhiều nhân viên
  bulkAssignShift: async (userIds: string[], shiftId: string) => {
    const response = await api.post(`/shifts/${shiftId}/assign/bulk`, { userIds });
    return response.data;
  },

  // Lấy danh sách nhân viên trong một ca
  getEmployeesByShift: async (shiftId: string, params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get(`/shifts/${shiftId}/employees`, { params });
    return response.data;
  },

  // Remove shift assignment từ nhân viên
  removeShiftFromEmployee: async (userId: string, shiftId: string) => {
    const response = await api.delete(`/shifts/${shiftId}/assign/${userId}`);
    return response.data;
  },

  // Lấy số lượng nhân viên trong mỗi ca
  getShiftEmployeeCounts: async () => {
    const response = await api.get("/shifts/employee-counts");
    return response.data.data || [];
  },

  // Lấy shift của nhân viên hiện tại cho một ngày
  getMyShift: async (date?: string): Promise<Shift | null> => {
    try {
      const params = date ? { date } : {};
      const response = await api.get("/shifts/my-shift", { params });
      return response.data.data || null;
    } catch (error) {
      console.error('[shiftService] getMyShift error:', error);
      return null;
    }
  },

  // Lấy schedule của nhân viên hiện tại trong khoảng thời gian
  getMySchedule: async (startDate?: string, endDate?: string): Promise<any[]> => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await api.get("/shifts/my-schedule", { params });
      return response.data.data || [];
    } catch (error) {
      console.error('[shiftService] getMySchedule error:', error);
      return [];
    }
  },
};

export default shiftService;
