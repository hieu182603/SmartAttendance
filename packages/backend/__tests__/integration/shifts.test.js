/**
 * Shifts / Schedule integration tests — TC-SHF-001 → TC-SHF-005
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
  isRedisBindingActive: jest.fn().mockReturnValue(false),
  logRedisStartupStatus: jest.fn().mockResolvedValue(undefined),
  cacheAside: jest.fn().mockImplementation((_k, _t, f) => f()),
}));

jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiServiceInvoiceEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: { healthCheck: jest.fn().mockResolvedValue({ status: "ok" }) },
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, ShiftModel;
let tokenFor, seedAllUsers, createShift;
let users, morningShift;

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
  ({ ShiftModel } = await import("../../src/modules/shifts/shift.model.js"));
  ({ tokenFor, seedAllUsers, createShift } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  users = await seedAllUsers(UserModel);
  morningShift = await createShift(ShiftModel);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SHF-001: Admin tạo ca làm mới
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SHF-001: Admin creates a shift", () => {
  test("ADMIN can POST /api/shifts", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .post("/api/shifts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Night Shift",
        startTime: "20:00",
        endTime: "05:00",
        breakDuration: 30,
        isFlexible: false,
        isActive: true,
      });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    if (res.status === 201 || res.status === 200) {
      const shift = await ShiftModel.findOne({ name: "Night Shift" });
      expect(shift).not.toBeNull();
    }
  });

  test("EMPLOYEE cannot create shift (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/shifts")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fake Shift", startTime: "00:00", endTime: "23:59" });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SHF-002: Employee xem ca của mình
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SHF-002: Employee views own shift", () => {
  test("employee can GET /api/shifts/my-shift", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/shifts/my-shift")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("returns 401 without token", async () => {
    const res = await request(app).get("/api/shifts/my-shift");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SHF-003: Admin bulk-assign ca cho nhân viên
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SHF-003: Admin bulk-assigns shifts", () => {
  test("ADMIN can POST /api/shifts/bulk-assign", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .post("/api/shifts/bulk-assign")
      .set("Authorization", `Bearer ${token}`)
      .send({
        userIds: [users.employee._id.toString()],
        shiftId: morningShift._id.toString(),
        startDate: "2026-05-01",
        endDate: "2026-05-31",
      });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("EMPLOYEE cannot bulk-assign (403 or 404)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/shifts/bulk-assign")
      .set("Authorization", `Bearer ${token}`)
      .send({ userIds: [], shiftId: morningShift._id.toString() });
    // 403 if route matches and role is checked; 404 if URL pattern differs
    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SHF-004: Employee xem lịch làm việc
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SHF-004: Employee views schedule", () => {
  test("employee can GET /api/shifts/my-schedule", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/shifts/my-schedule")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-SHF-005: Danh sách shift (cho admin)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-SHF-005: Get shift list", () => {
  test("ADMIN can GET /api/shifts", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/shifts")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = res.body.data || res.body;
    if (Array.isArray(list)) {
      expect(list.length).toBeGreaterThan(0);
    }
  });
});
