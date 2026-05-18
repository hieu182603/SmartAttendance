import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Tên phòng ban không được để trống"),
  code: z.string().min(1, "Mã phòng ban không được để trống"),
  description: z.string().optional(),
  branchId: z.string().min(1, "Chi nhánh không được để trống"),
  managerId: z.string().min(1, "Trưởng phòng không được để trống"),
  budget: z.number().min(0, "Ngân sách phải >= 0").optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  branchId: z.string().optional(),
  managerId: z.string().optional(),
  budget: z.number().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
