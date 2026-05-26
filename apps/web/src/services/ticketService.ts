import api from "./api";

export interface AdminOrder {
  _id: string;
  orderCode: number;
  companyId: { _id: string; name: string; email?: string } | string;
  plan: "starter" | "standard" | "premium";
  billingCycle: "monthly" | "yearly";
  amount: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  paymentMethod?: "payos" | "bank_transfer" | "manual";
  payosPaymentLinkId?: string;
  bankTransferProof?: string;
  notes?: string;
  processedBy?: { _id: string; name: string; email: string } | null;
  processedAt?: string;
  paidAt?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalRevenue: number;
  pendingCount: number;
  monthCount: number;
  monthlyStats: { _id: { year: number; month: number }; revenue: number; count: number }[];
  planStats: { _id: string; revenue: number; count: number }[];
}

export interface GetAdminOrdersParams {
  status?: string;
  plan?: string;
  page?: number;
  limit?: number;
}

export const ticketService = {
  getAdminOrders: async (params: GetAdminOrdersParams = {}): Promise<{ orders: AdminOrder[]; total: number; page: number; limit: number }> => {
    const { data } = await api.get("/billing/admin/orders", { params });
    const payload = data?.data ?? data;
    return {
      orders: Array.isArray(payload?.orders) ? payload.orders : [],
      total: typeof payload?.total === "number" ? payload.total : 0,
      page: typeof payload?.page === "number" ? payload.page : 1,
      limit: typeof payload?.limit === "number" ? payload.limit : 20,
    };
  },

  getAdminOrderById: async (id: string): Promise<AdminOrder> => {
    const { data } = await api.get(`/billing/admin/orders/${id}`);
    return data.data as AdminOrder;
  },

  confirmPayment: async (id: string): Promise<AdminOrder> => {
    const { data } = await api.put(`/billing/admin/orders/${id}/confirm`);
    return data.data as AdminOrder;
  },

  rejectOrder: async (id: string, reason?: string): Promise<AdminOrder> => {
    const { data } = await api.put(`/billing/admin/orders/${id}/reject`, { reason });
    return data.data as AdminOrder;
  },

  createManualOrder: async (payload: {
    companyName: string;
    plan: string;
    billingCycle: string;
    notes?: string;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<AdminOrder> => {
    const { data } = await api.post("/billing/admin/orders", payload);
    return data.data as AdminOrder;
  },

  getAdminStats: async (): Promise<AdminStats> => {
    const { data } = await api.get("/billing/admin/stats");
    return (data?.data ?? data) as AdminStats;
  },
};
