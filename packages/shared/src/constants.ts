export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
export const PASSWORD_MSG =
  "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt";

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_MANAGER",
  "MANAGER",
  "EMPLOYEE",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PHONE_REGEX = /^[0-9]{10,11}$/;
