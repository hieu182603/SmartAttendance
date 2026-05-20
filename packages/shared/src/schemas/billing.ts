import { z } from "zod";

export const PLAN_IDS = ["starter", "standard", "premium"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_CONFIG: Record<PlanId, { monthly: number; yearly: number; maxUsers: number }> = {
  starter:  { monthly: 1_000_000, yearly: 12_000_000, maxUsers: 100    },
  standard: { monthly: 2_900_000, yearly: 35_000_000, maxUsers: 200    },
  premium:  { monthly: 6_600_000, yearly: 80_000_000, maxUsers: 999999 },
};

export const createUpgradePaymentSchema = z.object({
  plan: z.enum(PLAN_IDS),
  billingCycle: z.enum(["monthly", "yearly"]),
});
export type CreateUpgradePaymentInput = z.infer<typeof createUpgradePaymentSchema>;
