import api from "./api";

export interface CompanyOverride {
  companyId: string;
  enabled: boolean;
}

export interface FeatureToggle {
  _id: string;
  featureKey: string;
  name: string;
  description?: string;
  enabled: boolean;
  disabledForRoles: string[];
  companyOverrides: CompanyOverride[];
  category: "core" | "advanced" | "ai";
  updatedBy?: string;
  updatedAt: string;
}

export const featureToggleService = {
  getAll: async (): Promise<FeatureToggle[]> => {
    const { data } = await api.get("/feature-toggles");
    return data.data as FeatureToggle[];
  },

  update: async (featureKey: string, payload: Partial<Pick<FeatureToggle, "enabled" | "disabledForRoles" | "companyOverrides">>): Promise<FeatureToggle> => {
    const { data } = await api.put(`/feature-toggles/${featureKey}`, payload);
    return data.data as FeatureToggle;
  },

  create: async (payload: { featureKey: string; name: string; description?: string; category?: string; enabled?: boolean }): Promise<FeatureToggle> => {
    const { data } = await api.post("/feature-toggles", payload);
    return data.data as FeatureToggle;
  },

  remove: async (featureKey: string): Promise<void> => {
    await api.delete(`/feature-toggles/${featureKey}`);
  },

  checkFeature: async (featureKey: string): Promise<{ enabled: boolean }> => {
    const { data } = await api.get(`/feature-toggles/check/${featureKey}`);
    return data.data as { enabled: boolean };
  },

  /**
   * Returns a map of { featureKey: effectiveEnabled } resolved for the
   * currently authenticated user (role + company overrides applied server-side).
   */
  getEffective: async (): Promise<Record<string, boolean>> => {
    const { data } = await api.get("/feature-toggles/effective");
    return data.data as Record<string, boolean>;
  },
};
