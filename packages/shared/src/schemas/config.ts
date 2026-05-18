import { z } from "zod";

export const CONFIG_CATEGORIES = [
  "attendance",
  "payroll",
  "general",
  "security",
  "notification",
] as const;
export type ConfigCategory = (typeof CONFIG_CATEGORIES)[number];

export const CONFIG_EDITOR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER"] as const;
export type ConfigEditorRole = (typeof CONFIG_EDITOR_ROLES)[number];

export const upsertConfigSchema = z.object({
  key: z.string().min(1).max(100),
  category: z.enum(CONFIG_CATEGORIES),
  value: z.any(),
  description: z.string().optional(),
  editableBy: z.array(z.enum(CONFIG_EDITOR_ROLES)).optional(),
});
export type UpsertConfigInput = z.infer<typeof upsertConfigSchema>;

export const updateConfigSchema = z.object({
  value: z.any(),
  category: z.enum(CONFIG_CATEGORIES).optional(),
  description: z.string().optional(),
  editableBy: z.array(z.enum(CONFIG_EDITOR_ROLES)).optional(),
});
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
