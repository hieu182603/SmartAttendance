import { z } from "zod";

export const aiUsageQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2024).max(2100).optional(),
});

export const generateInvoiceSchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2024).max(2100),
  companyId: z.string().optional(),
});

export const payAiInvoiceSchema = z.object({
  customerEmail: z.string().email().optional(),
});

export type AiUsageQuery = z.infer<typeof aiUsageQuerySchema>;
export type GenerateInvoice = z.infer<typeof generateInvoiceSchema>;
export type PayAiInvoice = z.infer<typeof payAiInvoiceSchema>;
