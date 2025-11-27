import api from "./api";

export interface PerformanceReview {
  _id: string;
  employeeId: {
    _id: string;
    name?: string; // Backend field
    fullName: string; // Virtual field or mapped
    position?: string;
    avatar?: string;
    avatarUrl?: string;
  };
  period: string;
  reviewDate: string;
  reviewerId: {
    _id: string;
    name?: string; // Backend field
    fullName: string; // Virtual field or mapped
  };
  status: "completed" | "pending" | "draft" | "rejected";
  rejectionReason?: string;
  categories: {
    technical: number;
    communication: number;
    teamwork: number;
    leadership: number;
    problemSolving: number;
  };
  overallScore: number;
  achievements: string[];
  improvements: string[];
  comments: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  total: number;
  completed: number;
  pending: number;
  avgScore: number;
}

export interface CreateReviewData {
  employeeId: string;
  period: string;
  reviewDate?: string;
  status?: "completed" | "pending" | "draft" | "rejected";
  categories?: {
    technical?: number;
    communication?: number;
    teamwork?: number;
    leadership?: number;
    problemSolving?: number;
  };
  achievements?: string[];
  improvements?: string[];
  comments?: string;
}

export const performanceService = {
  // Lấy danh sách đánh giá
  getReviews: async (params?: {
    period?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/performance/reviews", { params });
    return response.data;
  },

  // Lấy thống kê
  getStats: async (): Promise<ReviewStats> => {
    const response = await api.get("/performance/stats");
    return response.data;
  },

  // Lấy chi tiết đánh giá
  getReviewById: async (id: string): Promise<PerformanceReview> => {
    const response = await api.get(`/performance/reviews/${id}`);
    return response.data;
  },

  // Tạo đánh giá mới
  createReview: async (data: CreateReviewData) => {
    const response = await api.post("/performance/reviews", data);
    return response.data;
  },

  // Cập nhật đánh giá
  updateReview: async (id: string, data: Partial<CreateReviewData>) => {
    const response = await api.put(`/performance/reviews/${id}`, data);
    return response.data;
  },

  // Xóa đánh giá
  deleteReview: async (id: string) => {
    const response = await api.delete(`/performance/reviews/${id}`);
    return response.data;
  },

  // Lấy đánh giá của 1 nhân viên
  getReviewsByEmployee: async (
    employeeId: string
  ): Promise<PerformanceReview[]> => {
    const response = await api.get(`/performance/employee/${employeeId}`);
    return response.data;
  },

  // Lấy đánh giá của chính mình (EMPLOYEE)
  getMyReviews: async (): Promise<PerformanceReview[]> => {
    const response = await api.get("/performance/my-reviews");
    return response.data;
  },

  // Reject đánh giá (HR+)
  rejectReview: async (id: string, rejectionReason: string) => {
    const response = await api.put(`/performance/reviews/${id}/reject`, {
      rejectionReason,
    });
    return response.data;
  },

  // Export đánh giá
  exportReviews: async (params?: { period?: string; status?: string }) => {
    const response = await api.get("/performance/export", { params });
    return response.data;
  },
};
