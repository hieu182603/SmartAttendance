/**
 * RBAC integration tests — TC-RBAC-001 → TC-RBAC-006
 * Kiểm tra phân quyền: đúng role cho phép, sai role / thiếu token bị chặn.
 */

import { jest, describe, test, expect, beforeAll, afterAll } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";

// ── Redis mock ────────────────────────────────────────────────────────────────
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
  aiServiceClient: {
    healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
    registerFace: jest.fn(),
    verifyFace: jest.fn(),
    livenessDetection: jest.fn(),
  },
}));

let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, tokenFor, seedAllUsers;
let users; // seeded users keyed by role

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

  users = await seedAllUsers(UserModel);
});

afterAll(async () => {
  await disconnectTestDB();
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-001: Employee không được truy cập GET /api/users (admin only)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-001: Employee blocked from admin user list", () => {
  test("returns 403 for EMPLOYEE role", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("returns 200 for ADMIN role", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-002: Employee không được xem attendance của toàn công ty
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-002: Employee cannot view all attendance", () => {
  test("returns 403 for EMPLOYEE on GET /api/attendance/all", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/attendance/all")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("returns 200 for ADMIN on GET /api/attendance/all", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/attendance/all")
      .set("Authorization", `Bearer ${token}`);
    expect([200, 400]).toContain(res.status); // 200 or empty result — not 403
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-003: Manager chỉ xem attendance theo phòng ban
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-003: Manager accesses department attendance", () => {
  test("MANAGER can access GET /api/attendance/department", async () => {
    const token = await tokenFor(users.manager);
    const res = await request(app)
      .get("/api/attendance/department")
      .set("Authorization", `Bearer ${token}`);
    // The RBAC check (role middleware) must pass for MANAGER.
    // A 403 due to missing department assignment is business logic, not RBAC.
    expect(res.status).not.toBe(401);
    if (res.status === 403) {
      // Must be the business-logic check, not the role middleware
      expect(res.body.message).not.toMatch(/insufficient permissions/i);
    }
  });

  test("EMPLOYEE cannot access GET /api/attendance/department", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/attendance/department")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-004: HR_MANAGER có thể generate payroll
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-004: HR_MANAGER can generate payroll", () => {
  test("EMPLOYEE cannot POST /api/payroll/generate", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: "2026-04" });
    expect(res.status).toBe(403);
  });

  test("HR_MANAGER can POST /api/payroll/generate (may return 400 on missing data — not 403)", async () => {
    const token = await tokenFor(users.hr_manager);
    const res = await request(app)
      .post("/api/payroll/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: "2026-04" });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-005: Không có token → 401
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-005: Missing token returns 401", () => {
  test("GET /api/auth/me without token → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("GET /api/users without token → 401", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  test("POST /api/attendance/checkin without token → 401", async () => {
    const res = await request(app).post("/api/attendance/checkin").send({});
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-006: Token đúng nhưng role không đủ cho DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-006: Insufficient role on DELETE user", () => {
  test("EMPLOYEE cannot delete another user", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .delete(`/api/users/${users.admin._id}`)
      .set("Authorization", `Bearer ${token}`);
    // 403 if route exists with role guard, 404 if no DELETE route registered
    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });

  test("MANAGER cannot delete users", async () => {
    const token = await tokenFor(users.manager);
    const res = await request(app)
      .delete(`/api/users/${users.employee._id}`)
      .set("Authorization", `Bearer ${token}`);
    // 403 if route exists with role guard, 404 if no DELETE route registered
    expect([403, 404]).toContain(res.status);
    expect(res.status).not.toBe(200);
  });

  test("ADMIN can attempt DELETE (may 200 or 400, not 403/401)", async () => {
    const token = await tokenFor(users.admin);
    const targetId = users.employee._id;
    const res = await request(app)
      .delete(`/api/users/${targetId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-007: Admin sessions endpoint — only SUPER_ADMIN / ADMIN
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-007: Admin sessions access control", () => {
  test("EMPLOYEE cannot GET /api/auth/admin/sessions", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/auth/admin/sessions")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test("ADMIN can GET /api/auth/admin/sessions", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/auth/admin/sessions")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sessions");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-RBAC-008: Cập nhật role permissions ở backend có hiệu lực tức thì
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-RBAC-008: Backend role-permission override enforcement", () => {
  test("Revoke HR_MANAGER USERS_VIEW => cannot GET /api/users", async () => {
    const adminToken = await tokenFor(users.admin);
    const hrToken = await tokenFor(users.hr_manager);

    const currentRes = await request(app)
      .get("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(currentRes.status).toBe(200);
    const originalRolePerms = currentRes.body.rolePerms;
    expect(originalRolePerms).toBeDefined();

    const nextRolePerms = structuredClone(originalRolePerms);
    nextRolePerms.HR_MANAGER = (nextRolePerms.HR_MANAGER || []).filter(
      (p) => p !== "USERS_VIEW"
    );

    const updateRes = await request(app)
      .put("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rolePerms: nextRolePerms });
    expect(updateRes.status).toBe(200);

    const blockedRes = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${hrToken}`);
    expect(blockedRes.status).toBe(403);

    // Restore original to avoid side effects on other tests
    const restoreRes = await request(app)
      .put("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rolePerms: originalRolePerms });
    expect(restoreRes.status).toBe(200);
  });

  test("Revoke MANAGER REQUESTS_APPROVE_DEPARTMENT => cannot approve requests", async () => {
    const adminToken = await tokenFor(users.admin);
    const managerToken = await tokenFor(users.manager);

    const currentRes = await request(app)
      .get("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(currentRes.status).toBe(200);
    const originalRolePerms = currentRes.body.rolePerms;

    const nextRolePerms = structuredClone(originalRolePerms);
    nextRolePerms.MANAGER = (nextRolePerms.MANAGER || []).filter(
      (p) => p !== "REQUESTS_APPROVE_DEPARTMENT" && p !== "REQUESTS_APPROVE_ALL"
    );

    const updateRes = await request(app)
      .put("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rolePerms: nextRolePerms });
    expect(updateRes.status).toBe(200);

    const blockedRes = await request(app)
      .post("/api/requests/bulk-approve")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ requestIds: [] });
    expect(blockedRes.status).toBe(403);

    // Restore original to avoid side effects on other tests
    const restoreRes = await request(app)
      .put("/api/users/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ rolePerms: originalRolePerms });
    expect(restoreRes.status).toBe(200);
  });
});
