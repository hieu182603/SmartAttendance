import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultQuotaDays: z.number().min(0).max(365).optional(),
  isPaid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().omit({ code: true });
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
