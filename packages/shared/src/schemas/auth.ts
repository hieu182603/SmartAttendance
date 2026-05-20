import { z } from "zod";
import { PASSWORD_REGEX, PASSWORD_MSG } from "../constants.js";

export const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email không được để trống"),
  password: z
    .string()
    .min(8, PASSWORD_MSG)
    .max(100, "Mật khẩu không được vượt quá 100 ký tự")
    .regex(PASSWORD_REGEX, PASSWORD_MSG),
  name: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  companyName: z
    .string()
    .min(2, "Tên công ty phải có ít nhất 2 ký tự")
    .max(100, "Tên công ty không được vượt quá 100 ký tự"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;

export const resendOTPSchema = z.object({
  email: z.string().email("Invalid email"),
});
export type ResendOTPInput = z.infer<typeof resendOTPSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const verifyResetOTPSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
export type VerifyResetOTPInput = z.infer<typeof verifyResetOTPSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, PASSWORD_MSG)
    .max(100)
    .regex(PASSWORD_REGEX, PASSWORD_MSG),
  resetToken: z.string().min(1, "Reset token is required"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshBodyInput = z.infer<typeof refreshBodySchema>;
