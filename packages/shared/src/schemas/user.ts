import { z } from "zod";
import { USER_ROLES, PHONE_REGEX } from "../constants.js";

export const updateUserSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthday: z.string().optional(),
  avatar: z.string().url("URL không hợp lệ").optional(),
  avatarUrl: z.string().url("URL không hợp lệ").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mật khẩu hiện tại không được để trống"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateUserByAdminSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự").optional(),
  email: z.string().email("Email không hợp lệ").optional(),
  phone: z
    .union([
      z.string().regex(PHONE_REGEX, "Số điện thoại phải có 10-11 chữ số"),
      z.literal(""),
    ])
    .optional(),
  role: z.enum(USER_ROLES).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  branch: z.string().optional(),
  defaultShiftId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  avatar: z.union([z.string().url("URL không hợp lệ"), z.literal("")]).optional(),
  avatarUrl: z.union([z.string().url("URL không hợp lệ"), z.literal("")]).optional(),
  taxId: z.string().optional(),
});
export type UpdateUserByAdminInput = z.infer<typeof updateUserByAdminSchema>;

export const createUserByAdminSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email không được để trống"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu không được vượt quá 100 ký tự"),
  name: z
    .string()
    .min(2, "Tên phải có ít nhất 2 ký tự")
    .max(100, "Tên không được vượt quá 100 ký tự"),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: "Role không hợp lệ" }),
  }),
  department: z.string().optional(),
  position: z.string().optional(),
  branch: z.string().optional(),
  phone: z
    .union([
      z.string().regex(PHONE_REGEX, "Số điện thoại phải có 10-11 chữ số"),
      z.literal(""),
    ])
    .optional(),
  taxId: z.string().optional(),
  defaultShiftId: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type CreateUserByAdminInput = z.infer<typeof createUserByAdminSchema>;

export const rolePermissionPayloadSchema = z.object({
  rolePerms: z.record(z.array(z.string())),
});
export type RolePermissionPayloadInput = z.infer<typeof rolePermissionPayloadSchema>;
