/**
 * Leave management integration tests — TC-LVE-001 → TC-LVE-006
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
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
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
let UserModel, LeaveTypeModel;
let tokenFor, seedAllUsers, createLeaveTypes;
let users, leaveTypes;

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
  ({ LeaveTypeModel } = await import("../../src/modules/leave/leave-type.model.js"));
  ({ tokenFor, seedAllUsers, createLeaveTypes } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  users = await seedAllUsers(UserModel);
  leaveTypes = await createLeaveTypes(LeaveTypeModel);
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-001: Employee xem balance nghỉ phép
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-001: Employee views leave balance", () => {
  test("employee can GET /api/leave/balance", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/leave/balance")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test("returns 401 without token", async () => {
    const res = await request(app).get("/api/leave/balance");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-002: Xem leave types
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-002: View leave types", () => {
  test("any authenticated user can GET /api/leave/types", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/leave/types")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const types = res.body.data || res.body;
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-003: HR tạo leave type mới
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-003: HR creates leave type", () => {
  test("HR_MANAGER can POST /api/leave/types", async () => {
    const token = await tokenFor(users.hr_manager);
    const res = await request(app)
      .post("/api/leave/types")
      .set("Authorization", `Bearer ${token}`)
      .send({
        code: "COMP",
        name: "Compensatory Leave",
        defaultQuotaDays: 5,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
      });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("EMPLOYEE cannot POST /api/leave/types (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/leave/types")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: "HACK", name: "Hacked Leave", defaultQuotaDays: 999 });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-004: HR điều chỉnh leave balance
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-004: HR adjusts leave balance", () => {
  test("HR_MANAGER can PATCH /api/leave/balance/:userId", async () => {
    const token = await tokenFor(users.hr_manager);
    const res = await request(app)
      .patch(`/api/leave/balance/${users.employee._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ leaveType: "annual", adjustment: 2, reason: "Year-end bonus leave" });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("EMPLOYEE cannot adjust leave balance (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .patch(`/api/leave/balance/${users.employee._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ leaveType: "annual", adjustment: 99 });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-005: Employee xem lịch sử nghỉ phép của bản thân
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-005: Employee views own leave history", () => {
  test("employee can GET /api/leave/history", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/leave/history")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-006: Xoá leave type
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-LVE-006: HR deletes leave type", () => {
  test("ADMIN can DELETE /api/leave/types/:id (HR_MANAGER is blocked — only ADMIN+)", async () => {
    const token = await tokenFor(users.admin);
    const typeId = leaveTypes[0]._id;
    const res = await request(app)
      .delete(`/api/leave/types/${typeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("EMPLOYEE cannot delete leave type (403)", async () => {
    const token = await tokenFor(users.employee);
    const typeId = leaveTypes[0]._id;
    const res = await request(app)
      .delete(`/api/leave/types/${typeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
