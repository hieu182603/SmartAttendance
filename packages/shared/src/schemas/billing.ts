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
  companyName: z.string().trim().min(2, "Tên công ty là bắt buộc").max(100),
  employeeCount: z.coerce.number().int("Số nhân viên phải là số nguyên").min(1, "Số nhân viên tối thiểu là 1").max(999999),
  customerName: z.string().trim().min(1, "Họ tên liên hệ là bắt buộc").max(100),
  customerEmail: z.string().trim().email("Email không hợp lệ"),
  customerPhone: z.string().trim().min(9, "Số điện thoại không hợp lệ").max(20),
  billingMonths: z.coerce
    .number()
    .int("Số tháng phải là số nguyên")
    .min(1, "Số tháng tối thiểu là 1")
    .max(24, "Số tháng tối đa là 24"),
  notes: z.string().trim().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.billingCycle === "yearly" && data.billingMonths !== 12) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["billingMonths"],
      message: "Gói hàng năm cố định 12 tháng",
    });
  }
});
export type CreateUpgradePaymentInput = z.infer<typeof createUpgradePaymentSchema>;

export const createManualOrderSchema = z.object({
  companyName: z.string().trim().min(1, "Tên công ty là bắt buộc"),
  plan: z.enum(PLAN_IDS),
  billingCycle: z.enum(["monthly", "yearly"]),
  notes: z.string().trim().optional(),
  customerEmail: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
});
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
