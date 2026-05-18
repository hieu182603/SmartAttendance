/**
 * Security integration tests — TC-SEC-001 → TC-SEC-008
 * IDOR, mass assignment, upload MIME, HPP, NoSQL injection, CORS.
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const redisStore = new Map();
jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redisSet: jest.fn().mockImplementation((k, v) => { redisStore.set(k, v); return Promise.resolve("OK"); }),
  redisGet: jest.fn().mockImplementation((k) => Promise.resolve(redisStore.get(k) ?? null)),
  redisDel: jest.fn().mockImplementation((...keys) => { keys.forEach((k) => redisStore.delete(k)); return Promise.resolve(keys.length); }),
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

jest.unstable_mockModule("../../src/config/socket.js", () => ({
  initializeSocket: jest.fn(),
  getIO: jest.fn(),
  emitNotification: jest.fn(),
  emitNotificationToUsers: jest.fn(),
  emitAttendanceUpdate: jest.fn(),
  emitAttendanceUpdateToAdmins: jest.fn(),
  emitPayrollUpdate: jest.fn(),
  emitDataUpdate: jest.fn(),
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, PayrollModel;
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
  ({ tokenFor, seedAllUsers } = await import("../fixtures/seed.js"));

  // Try to import PayrollRecord model
  try {
    const payrollModule = await import("../../src/modules/payroll/payroll.model.js");
    PayrollModel = payrollModule.PayrollRecord || payrollModule.PayrollModel;
  } catch { /* optional */ }
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  redisStore.clear();
  users = await seedAllUsers(UserModel);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-001: IDOR — employee không xem được payslip người khác
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-001: IDOR on payslip", () => {
  test("employee cannot access payroll reports of other users", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/payroll/reports")
      .query({ userId: users.admin._id.toString(), month: "2026-04" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-002: Mass assignment — gửi role=ADMIN trong body update bị bỏ qua
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-002: Mass assignment protection", () => {
  test("employee cannot change own role via PUT /api/users/me", async () => {
    const token = await tokenFor(users.employee);
    await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "SUPER_ADMIN", baseSalary: 999999999 });

    const user = await UserModel.findById(users.employee._id);
    expect(user.role).toBe("EMPLOYEE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-003: Upload file không phải ảnh bị từ chối ở face route
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-003: Non-image upload rejected", () => {
  test("uploading a .txt file to face/register returns non-2xx", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/face/register")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("malicious content"), {
        filename: "evil.txt",
        contentType: "text/plain",
      });
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-004: HTTP Parameter Pollution — query string với param trùng
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-004: HTTP Parameter Pollution blocked", () => {
  test("duplicate query params return 400", async () => {
    const token = await tokenFor(users.admin);
    // Send duplicate 'month' params
    const res = await request(app)
      .get("/api/payroll/reports?month=2026-04&month=2026-03")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/duplicate/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-005: NoSQL injection — $ operator trong request body bị sanitize
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-005: NoSQL injection sanitization", () => {
  test("$where operator in request body is stripped", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ "email": { "$where": "sleep(1000)" }, "password": "anypass" });
    // Must NOT crash; must return 400 (invalid email) not 500
    expect([400, 401]).toContain(res.status);
  });

  test("$gt operator in login email is sanitized", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { "$gt": "" }, password: "anypass" });
    expect([400, 401]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-006: Audit log — chỉ ADMIN/SUPER_ADMIN xem được
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-006: Audit logs access control", () => {
  test("EMPLOYEE cannot GET /api/logs (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("MANAGER cannot GET /api/logs (403)", async () => {
    const token = await tokenFor(users.manager);
    const res = await request(app)
      .get("/api/logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("ADMIN can GET /api/logs (200)", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-007: IDOR — employee không xem được user khác qua phân trang
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-007: IDOR on user list endpoint", () => {
  test("EMPLOYEE cannot access GET /api/users (admin endpoint)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SEC-008: Sensitive fields not exposed in login response
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SEC-008: No sensitive data in responses", () => {
  test("login response does not contain password hash", async () => {
    // Create and verify a test user
    const { OtpModel } = await import("../../src/modules/otp/otp.model.js");
    await request(app).post("/api/auth/register").send({
      email: "sensitive@test.com",
      password: "SmartAttendance@2026!",
      name: "Sensitive User",
    });
    const otp = await OtpModel.findOne({ email: "sensitive@test.com" });
    await request(app).post("/api/auth/verify-otp").send({ email: "sensitive@test.com", otp: otp.code });

    const res = await request(app).post("/api/auth/login").send({
      email: "sensitive@test.com",
      password: "SmartAttendance@2026!",
    });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[ab]\$\d{2}\$/); // bcrypt hash pattern
    expect(res.body.user?.password).toBeUndefined();
  });

  test("GET /api/auth/me does not expose password", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
  });
});
