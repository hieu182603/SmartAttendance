import { z } from "zod";

export const createSalaryMatrixSchema = z.object({
  departmentCode: z.string().min(1, "Mã phòng ban không được để trống"),
  position: z.string().min(1, "Chức vụ không được để trống"),
  baseSalary: z.number().min(0, "Lương phải >= 0"),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type CreateSalaryMatrixInput = z.infer<typeof createSalaryMatrixSchema>;

export const updateSalaryMatrixSchema = z.object({
  baseSalary: z.number().min(0, "Lương phải >= 0").optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSalaryMatrixInput = z.infer<typeof updateSalaryMatrixSchema>;

export const updateUserBaseSalarySchema = z.object({
  baseSalary: z.union([z.number().min(0, "Lương phải >= 0"), z.null()]).optional(),
});
export type UpdateUserBaseSalaryInput = z.infer<typeof updateUserBaseSalarySchema>;

export const updateUserDependentsSchema = z.object({
  dependentCount: z.number().int().min(0, "Số người phụ thuộc phải >= 0"),
});
export type UpdateUserDependentsInput = z.infer<typeof updateUserDependentsSchema>;
