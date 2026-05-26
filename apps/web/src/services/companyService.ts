import api from "@/services/api";

export interface Company {
  _id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: "trial" | "starter" | "standard" | "premium";
  isActive: boolean;
  maxUsers: number;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
}

export type UpdateCompanyPayload = Partial<
  Pick<Company, "plan" | "isActive" | "maxUsers" | "name" | "email" | "phone">
>;

export const companyService = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
    isActive?: string;
  }): Promise<CompanyListResponse> => {
    const { data } = await api.get("/companies", { params });
    return data;
  },

  get: async (id: string): Promise<Company> => {
    const { data } = await api.get(`/companies/${id}`);
    return data.data;
  },

  update: async (id: string, payload: UpdateCompanyPayload): Promise<Company> => {
    const { data } = await api.patch(`/companies/${id}`, payload);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};
