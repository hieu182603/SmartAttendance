import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Tên chi nhánh không được để trống"),
  code: z.string().min(1, "Mã chi nhánh không được để trống"),
  latitude: z.number().min(-90, "Vĩ độ phải từ -90 đến 90").max(90, "Vĩ độ phải từ -90 đến 90"),
  longitude: z
    .number()
    .min(-180, "Kinh độ phải từ -180 đến 180")
    .max(180, "Kinh độ phải từ -180 đến 180"),
  city: z.string().min(1, "Thành phố không được để trống"),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  managerId: z.string().min(1, "Giám đốc chi nhánh không được để trống"),
  timezone: z.string().optional(),
  establishedDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().min(1).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  managerId: z.string().optional(),
  timezone: z.string().optional(),
  establishedDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
