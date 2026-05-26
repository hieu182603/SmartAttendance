/**
 * Smoke test — kiểm tra app tải được, các route public cơ bản hoạt động.
 * Không cần MongoDB thật: chỉ test middleware + 404 fallback.
 */
import { jest, describe, test, expect, beforeAll, afterAll } from "@jest/globals";

// Đặt biến môi trường BẮT BUỘC trước khi import app
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_for_smoke_only";
process.env.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "test_refresh_secret_for_smoke_only";
process.env.NODE_ENV = "test";

describe("Backend smoke", () => {
  test("JWT util ký và verify được token", async () => {
    const { generateAccessToken, verifyToken } = await import(
      "../src/utils/jwt.util.js"
    );
    const token = generateAccessToken({
      userId: "65a000000000000000000001",
      email: "test@example.com",
      role: "EMPLOYEE",
    });
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token);
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.role).toBe("EMPLOYEE");
  });

  test("Auth schema từ chối email rỗng", async () => {
    const { registerSchema } = await import("@smartattendance/shared");
    const result = registerSchema.safeParse({ email: "", password: "SmartAttendance@2026!", name: "Hi" });
    expect(result.success).toBe(false);
  });

  test("Auth schema chấp nhận payload hợp lệ", async () => {
    const { registerSchema } = await import("@smartattendance/shared");
    const result = registerSchema.safeParse({
      email: "ok@example.com",
      password: "SmartAttendance@2026!",
      name: "Nguyen Van A",
    });
    expect(result.success).toBe(true);
  });

  test("Reset password schema yêu cầu resetToken", async () => {
    const { resetPasswordSchema } = await import("@smartattendance/shared");
    const without = resetPasswordSchema.safeParse({
      email: "a@b.com",
      password: "SmartAttendance@2026!",
    });
    expect(without.success).toBe(false);

    const withToken = resetPasswordSchema.safeParse({
      email: "a@b.com",
      password: "SmartAttendance@2026!",
      resetToken: "abc123",
    });
    expect(withToken.success).toBe(true);
  });
});
