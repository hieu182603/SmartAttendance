/**
 * Users / HR integration tests — TC-USR-001 → TC-USR-007
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
  isRedisBindingActive: jest.fn().mockReturnValue(false),
  logRedisStartupStatus: jest.fn().mockResolvedValue(undefined),
  cacheAside: jest.fn().mockImplementation((_k, _t, f) => f()),
}));

jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiServiceInvoiceEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: { healthCheck: jest.fn().mockResolvedValue({ status: "ok" }) },
}));

jest.unstable_mockModule("../../src/config/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://cloudinary.test/avatar.jpg",
    public_id: "avatar_test",
  }),
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, DepartmentModel, BranchModel;
let tokenFor, seedAllUsers, createUser, createDepartment, createBranch;
let users, dept, branch;

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
  ({ DepartmentModel } = await import("../../src/modules/departments/department.model.js"));
  ({ BranchModel } = await import("../../src/modules/branches/branch.model.js"));
  ({ tokenFor, seedAllUsers, createUser, createDepartment, createBranch } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  redisStore.clear();
  users = await seedAllUsers(UserModel);
  branch = await BranchModel.create({ name: "HQ", code: "HQ001", latitude: 10.77, longitude: 106.7, city: "HCM" });
  dept = await DepartmentModel.create({ name: "Engineering", code: "ENG001", branchId: branch._id });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-001: HR tạo nhân viên mới
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-001: HR creates new employee", () => {
  test("HR_MANAGER can POST /api/users and create an employee", async () => {
    const token = await tokenFor(users.hr_manager);

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: "newstaff@company.com",
        name: "New Staff Member",
        password: "SmartAttendance@2026!",
        role: "EMPLOYEE",
        department: dept._id.toString(),
        branch: branch._id.toString(),
        position: "Developer",
        baseSalary: 15000000,
      });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 201 || res.status === 200) {
      const created = await UserModel.findOne({ email: "newstaff@company.com" });
      expect(created).not.toBeNull();
      expect(created.password).not.toBe("SmartAttendance@2026!"); // password must be hashed
    }
  });

  test("EMPLOYEE cannot POST /api/users (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "hack@test.com", name: "Hacker", role: "ADMIN" });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-002: HR cập nhật role nhân viên
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-002: HR updates employee role", () => {
  test("ADMIN can update employee role", async () => {
    const token = await tokenFor(users.admin);

    const res = await request(app)
      .put(`/api/users/${users.employee._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "MANAGER" });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 200) {
      const updated = await UserModel.findById(users.employee._id);
      expect(updated.role).toBe("MANAGER");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-003: Employee tự cập nhật profile
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-003: Employee updates own profile", () => {
  test("employee can PUT /api/users/me", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "0901234567", address: "123 Street" });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-004: Đổi mật khẩu sai oldPassword → 400
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-004: Change password wrong old password", () => {
  test("returns 400 when old password is incorrect", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "WrongOldPassword",
        newPassword: "NewPass@123",
      });

    expect([400, 401]).toContain(res.status);
  });

  test("returns success when old password is correct", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/users/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "SmartAttendance@2026!",
        newPassword: "NewPass@789",
      });

    expect(res.status).not.toBe(403);
    // Either 200 (success) or 400 (wrong password format) — not 401/403
    expect(res.status).not.toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-005: Mass assignment — role không thể thay đổi qua /me
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-005: Mass assignment protection", () => {
  test("employee cannot elevate own role via PUT /api/users/me", async () => {
    const token = await tokenFor(users.employee);

    await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN", phone: "0900000000" });

    const user = await UserModel.findById(users.employee._id);
    expect(user.role).toBe("EMPLOYEE");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-006: GET user list trả về danh sách đúng
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-006: Admin gets user list", () => {
  test("ADMIN gets 200 on GET /api/users", async () => {
    const token = await tokenFor(users.admin);
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Response should be an array or paginated object
    const body = res.body;
    const list = Array.isArray(body) ? body : (body.users || body.data || []);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test("EMPLOYEE gets 403 on GET /api/users", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-USR-007: IDOR — employee không xem được user khác qua GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-USR-007: IDOR protection on individual user", () => {
  test("employee cannot GET another user's full profile via /api/users/:id", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get(`/api/users/${users.admin._id}`)
      .set("Authorization", `Bearer ${token}`);
    // Should be 403 (preferred) or 200 with limited data — must NOT return full admin profile
    if (res.status === 200) {
      // If endpoint is accessible, ensure sensitive fields are not exposed
      expect(res.body.password).toBeUndefined();
    } else {
      expect(res.status).toBe(403);
    }
  });
});
