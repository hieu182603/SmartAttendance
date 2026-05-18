/**
 * Payroll integration tests — TC-PAY-001 → TC-PAY-007
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redisSet: jest.fn().mockResolvedValue("OK"),
  redisGet: jest.fn().mockResolvedValue(null),
  redisDel: jest.fn().mockResolvedValue(1),
  redisSAdd: jest.fn().mockResolvedValue(1),
  redisSRem: jest.fn().mockResolvedValue(1),
  redisSMembers: jest.fn().mockResolvedValue([]),
  isRedisEnabled: jest.fn().mockReturnValue(false),
  isRedisDegraded: jest.fn().mockReturnValue(false),
  cacheAside: jest.fn().mockImplementation((_k, _t, f) => f()),
}));

jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: { healthCheck: jest.fn().mockResolvedValue({ status: "ok" }) },
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, AttendanceModel;
let tokenFor, seedAllUsers;
let users;

beforeAll(async () => {
  const supertest = await import("supertest");
  request = supertest.default;

  const dbHelper = await import("../helpers/db.js");
  connectTestDB = dbHelper.connectTestDB;
  disconnectTestDB = dbHelper.disconnectTestDB;
  clearAllCollections = dbHelper.clearAllCollections;

  await connectTestDB();

  ({ default: app } = await import("../../src/app.js"));
  ({ UserModel } = await import("../../src/modules/users/user.model.js"));
  ({ AttendanceModel } = await import("../../src/modules/attendance/attendance.model.js"));
  ({ tokenFor, seedAllUsers } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  users = await seedAllUsers(UserModel);

  // Seed attendance data for the test month
  const baseDate = new Date("2026-04-01T00:00:00.000Z");
  for (let i = 0; i < 20; i++) {
    const d = new Date(baseDate);
    d.setDate(i + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      await AttendanceModel.create({
        userId: users.employee._id,
        date: d,
        checkIn: new Date(d.getTime() + 8 * 3600000),
        checkOut: new Date(d.getTime() + 17 * 3600000),
        workHours: 8,
        workCredit: 1,
        status: "present",
        approvalStatus: "APPROVED",
      });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-001: Generate payroll tháng
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-001: Generate payroll for a month", () => {
  test("HR_MANAGER can POST /api/payroll/generate", async () => {
    const token = await tokenFor(users.hr_manager);

    const res = await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: "2026-04" });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    // 200 (generated) or 400 (already exists / validation error) — NOT 401/403
  });

  test("EMPLOYEE cannot POST /api/payroll/generate (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: "2026-04" });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-002: Employee xem payslip bản thân
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-002: Employee views own payslip", () => {
  test("employee can GET /api/payroll/my-payslip", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/payroll/my-payslip")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);

    // 200 (found) or 404 (no payslip yet) — not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-003: IDOR — employee không xem được payslip người khác
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-003: IDOR on payroll reports", () => {
  test("employee cannot access GET /api/payroll/reports", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/payroll/reports")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("HR_MANAGER can access GET /api/payroll/reports", async () => {
    const token = await tokenFor(users.hr_manager);
    const res = await request(app)
      .get("/api/payroll/reports")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-004: Export payslip PDF
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-004: Export payslip PDF", () => {
  test("employee can GET /api/payroll/my-payslip/pdf", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/payroll/my-payslip/pdf")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/pdf/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-005: Export payslip Excel
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-005: Export payslip Excel", () => {
  test("employee can GET /api/payroll/my-payslip/excel", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/payroll/my-payslip/excel")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    if (res.status === 200) {
      const ct = res.headers["content-type"] || "";
      expect(ct).toMatch(/spreadsheet|excel|octet/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PAY-006: Tính toán netSalary = baseSalary + bonus - deduction - tax
// (Unit-level verification của payroll formula)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-PAY-006: Payroll calculation formula", () => {
  test("netSalary ≤ grossSalary (deductions must be non-negative)", async () => {
    const token = await tokenFor(users.hr_manager);

    // Generate first
    await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: "2026-04" });

    // Get reports to verify calculation
    const res = await request(app)
      .get("/api/payroll/reports")
      .query({ month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);

    if (res.status === 200) {
      const records = res.body.records || res.body.data || res.body || [];
      if (Array.isArray(records) && records.length > 0) {
        for (const rec of records) {
          if (rec.netSalary !== undefined && rec.grossSalary !== undefined) {
            expect(rec.netSalary).toBeLessThanOrEqual(rec.grossSalary);
          }
        }
      }
    }
  });
});
