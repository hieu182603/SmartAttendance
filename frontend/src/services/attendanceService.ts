import api from "@/services/api";
import type { AxiosRequestConfig } from "axios";

interface AttendanceParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  date?: string;
  search?: string;
  status?: string;
  [key: string]: unknown;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  employeeId?: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: "ontime" | "late" | "absent" | "overtime" | "weekend";
  location: string;
  notes?: string;
}

interface UpdateAttendancePayload {
  checkIn?: string | null;
  checkOut?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  notes?: string | null;
  date?: string;
}

interface AnalyticsSummary {
  attendanceRate: number;
  avgPresent: number;
  avgLate: number;
  avgAbsent: number;
  trend: number;
  totalEmployees?: number;
  total?: number;
  ontime?: number;
  late?: number;
  absent?: number;
}

interface AttendanceAnalytics {
  dailyData: unknown[];
  departmentStats: unknown[];
  topPerformers: unknown[];
  summary: AnalyticsSummary;
}

interface AllAttendanceResponse {
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AttendanceHistoryResponse {
  records: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getAttendanceHistory = async (
  params: AttendanceParams = {}
): Promise<AttendanceHistoryResponse> => {
  try {
    const { data } = await api.get("/attendance/history", { params });
    // Backend trả về { records: [...], pagination: {...} }
    // Hoặc có thể trả về array trực tiếp (backward compatibility)
    if (Array.isArray(data)) {
      return {
        records: data,
        pagination: {
          page: 1,
          limit: data.length,
          total: data.length,
          totalPages: 1,
        },
      };
    }
    return data as AttendanceHistoryResponse;
  } catch (error) {
    console.error("[attendance] getAttendanceHistory failed:", error);
    // Throw error để component có thể handle và hiển thị cho user
    throw new Error(
      error instanceof Error
        ? error.message
        : "Không thể tải lịch sử điểm danh. Vui lòng thử lại."
    );
  }
};

export const getAttendanceAnalytics = async (
  params: AttendanceParams = {}
): Promise<AttendanceAnalytics> => {
  try {
    const { data } = await api.get("/attendance/analytics", { params });
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response format from server");
    }
    return data as AttendanceAnalytics;
  } catch (error) {
    console.error(
      "[attendance] analytics error:",
      error
    );
    // Re-throw error so components can handle it properly
    throw error;
  }
};

export const getAllAttendance = async (
  params: AttendanceParams = {}
): Promise<AllAttendanceResponse> => {
  try {
    const { data } = await api.get("/attendance/all", { params });
    return data as AllAttendanceResponse;
  } catch (error) {
    console.error("[attendance] getAllAttendance failed:", error);
    // Throw error để component có thể handle
    throw new Error(
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách điểm danh. Vui lòng thử lại."
    );
  }
};

export const exportAttendanceAnalytics = async (
  params: AttendanceParams = {}
): Promise<{ success: boolean; fileName: string }> => {
  try {
    const response = await api.get("/attendance/analytics/export", {
      params,
      responseType: "blob",
    } as AxiosRequestConfig);

    const blob = new Blob([response.data as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const contentDisposition = response.headers["content-disposition"];
    let fileName = `BaoCaoPhanTichChamCong_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ""));
      }
    }

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, fileName };
  } catch (error) {
    console.error("[attendance] export error", error);
    throw error;
  }
};

export const getDepartmentAttendance = async (
  params: AttendanceParams = {}
): Promise<AllAttendanceResponse> => {
  try {
    const { data } = await api.get("/attendance/department", { params });
    return data as AllAttendanceResponse;
  } catch (error) {
    console.warn(
      "[attendance] getDepartmentAttendance unavailable",
      (error as Error).message
    );
    return {
      records: [],
      summary: { total: 0, present: 0, late: 0, absent: 0 },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }
};

export const updateAttendanceRecord = async (
  id: string,
  payload: UpdateAttendancePayload
) => {
  const { data } = await api.patch(`/attendance/${id}`, payload);
  return data as { message: string; record: AttendanceRecord };
};

export const deleteAttendanceRecord = async (id: string) => {
  const { data } = await api.delete(`/attendance/${id}`);
  return data as { message: string };
};
