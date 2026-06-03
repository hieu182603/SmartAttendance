import api from "./api";

export interface UpgradePaymentResult {
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
}

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 10;

export interface CreateUpgradePaymentPayload {
  plan: "starter" | "standard" | "premium" | "addon";
  billingCycle: "monthly" | "yearly";
  companyName: string;
  employeeCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingMonths: number;
  notes?: string;
}

export const billingService = {
  createUpgradePayment: async (
    payload: CreateUpgradePaymentPayload
  ): Promise<UpgradePaymentResult> => {
    const { data } = await api.post("/billing/upgrade", payload);
    return data.data as UpgradePaymentResult;
  },

  /** Poll our DB order status (pending | paid | cancelled | failed). */
  getPaymentStatus: async (orderCode: number): Promise<{ status: string }> => {
    const { data } = await api.get(`/billing/payments/${orderCode}`);
    return { status: (data.data?.status ?? "unknown") as string };
  },

  /**
   * Wait for webhook to mark order paid (handles return-before-webhook race).
   */
  pollPaymentStatusUntilPaid: async (
    orderCode: number
  ): Promise<"paid" | "failed" | "timeout"> => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const { status } = await billingService.getPaymentStatus(orderCode);
      if (status === "paid") return "paid";
      if (status === "cancelled" || status === "failed") return "failed";
      if (attempt < POLL_MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
    return "timeout";
  },
};
