import api from "./api";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 10;

export interface AiDailyUsage {
  date: string;
  tokens: number;
  costVnd: number;
}

export interface AiUsageData {
  period: { month: number; year: number };
  totalTokens: number;
  totalCostVnd: number;
  totalCostUsd: number;
  eventCount: number;
  daily: AiDailyUsage[];
}

export interface AiInvoice {
  _id: string;
  invoiceCode: number;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  totalTokens: number;
  amountVnd: number;
  breakdown: Array<{ operation: string; tokens: number; costVnd: number }>;
  checkoutUrl?: string;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  invoiceEmailSent: boolean;
  confirmationEmailSent: boolean;
  createdAt: string;
}

export interface CompanyUsageSummary {
  companyId: string;
  companyName: string;
  totalTokens: number;
  totalCostVnd: number;
  eventCount: number;
}

export const aiBillingService = {
  getUsage: async (params?: { month?: number; year?: number }): Promise<AiUsageData> => {
    const { data } = await api.get("/ai-billing/usage", { params });
    if (!data?.data) {
      throw new Error(data?.message ?? "Invalid usage response");
    }
    return data.data as AiUsageData;
  },

  getInvoices: async (params?: { page?: number; limit?: number }): Promise<{
    items: AiInvoice[];
    total: number;
    page: number;
  }> => {
    const { data } = await api.get("/ai-billing/invoices", { params });
    return data;
  },

  getInvoice: async (invoiceCode: number): Promise<AiInvoice> => {
    const { data } = await api.get(`/ai-billing/invoices/${invoiceCode}`);
    return data.data as AiInvoice;
  },

  payInvoice: async (invoiceCode: number): Promise<{ checkoutUrl: string; invoiceCode: number }> => {
    const { data } = await api.post(`/ai-billing/invoices/${invoiceCode}/pay`);
    return data;
  },

  pollInvoiceUntilPaid: async (invoiceCode: number): Promise<"paid" | "failed" | "timeout"> => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const invoice = await aiBillingService.getInvoice(invoiceCode);
      if (invoice.status === "paid") return "paid";
      if (invoice.status === "cancelled") return "failed";
      if (attempt < POLL_MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
    return "timeout";
  },

  // Super Admin
  getAdminCompaniesUsage: async (params?: {
    month?: number;
    year?: number;
  }): Promise<CompanyUsageSummary[]> => {
    const { data } = await api.get("/ai-billing/admin/companies", { params });
    const rows = data?.data;
    return Array.isArray(rows) ? rows : [];
  },

  generateInvoices: async (body: {
    periodMonth: number;
    periodYear: number;
    companyId?: string;
  }): Promise<{ created: number; total?: number }> => {
    const { data } = await api.post("/ai-billing/admin/invoices/generate", body);
    return data;
  },

  confirmInvoice: async (id: string): Promise<AiInvoice> => {
    const { data } = await api.put(`/ai-billing/admin/invoices/${id}/confirm`);
    return data.data as AiInvoice;
  },
};
