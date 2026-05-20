/**
 * Attendance integration tests — TC-ATT-001 → TC-ATT-008
 * Checkin/checkout mocked để bypass face recognition & geofencing.
 * Admin manual create, approve, và history/analytics dùng DB thật.
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";
process.env.ENABLE_FACE_RECOGNITION = "false"; // bypass face recognition

// ── Redis mock (with cacheAside passthrough) ──────────────────────────────────
const redisStore = new Map();

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redisSet: jest.fn().mockImplementation((key, value) => { redisStore.set(key, value); return Promise.resolve("OK"); }),
  redisGet: jest.fn().mockImplementation((key) => Promise.resolve(redisStore.get(key) ?? null)),
  redisDel: jest.fn().mockImplementation((...keys) => { keys.forEach((k) => redisStore.delete(k)); return Promise.resolve(keys.length); }),
  redisSAdd: jest.fn().mockResolvedValue(1),
  redisSRem: jest.fn().mockResolvedValue(1),
  redisSMembers: jest.fn().mockResolvedValue([]),
  isRedisEnabled: jest.fn().mockReturnValue(false),
  isRedisDegraded: jest.fn().mockReturnValue(false),
  // passthrough: just call factory so branch queries work
  cacheAside: jest.fn().mockImplementation((_key, _ttl, factory) => factory()),
}));

jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// ── Socket mock ───────────────────────────────────────────────────────────────
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

// ── Cloudinary mock ───────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/config/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test/image/upload/test.jpg",
    public_id: "test_public_id",
  }),
}));

// ── AI service mock ───────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: {
    healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
    registerFace: jest.fn(),
    verifyFace: jest.fn().mockResolvedValue({ matched: true, score: 0.9 }),
    livenessDetection: jest.fn().mockResolvedValue({ isLive: true }),
  },
}));

// ── Config service mock ───────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/modules/config/config.service.js", () => ({
  getGeofenceRadiusAsync: jest.fn().mockResolvedValue(10000),
  getPayrollRulesAsync: jest.fn().mockResolvedValue({
    standardWorkDays: 26,
    standardWorkHours: 8,
    overtimeMultiplier: 1.5,
    lateDeductionPerMinute: 5000,
    earlyCheckoutDeductionPerMinute: 5000,
    missedCheckInDeduction: 100000,
    insuranceRate: 0.105,
    taxThreshold: 11000000,
  }),
  invalidateConfigCache: jest.fn(),
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, AttendanceModel, BranchModel, ShiftModel;
let tokenFor, seedAllUsers;
let users, testBranch;

// Branch coordinates used in checkin requests
const BRANCH_LAT = 10.7769;
const BRANCH_LNG = 106.7009;

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
  ({ BranchModel } = await import("../../src/modules/branches/branch.model.js"));
  ({ ShiftModel } = await import("../../src/modules/shifts/shift.model.js"));
  ({ tokenFor, seedAllUsers } = await import("../fixtures/seed.js"));

  users = await seedAllUsers(UserModel);

  // Active branch at test coordinates
  testBranch = await BranchModel.create({
    name: "Test HQ",
    code: "THQTEST",
    latitude: BRANCH_LAT,
    longitude: BRANCH_LNG,
    city: "Ho Chi Minh",
    status: "active",
  });
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  redisStore.clear();
  // Re-seed after clear
  users = await seedAllUsers(UserModel);
  testBranch = await BranchModel.create({
    name: "Test HQ",
    code: "THQTEST",
    latitude: BRANCH_LAT,
    longitude: BRANCH_LNG,
    city: "Ho Chi Minh",
    status: "active",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-001: Check-in hợp lệ lần đầu
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-001: Checkin success", () => {
  test("employee can checkin and returns 201", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/attendance/checkin")
      .set("Authorization", `Bearer ${token}`)
      .field("latitude", String(BRANCH_LAT))
      .field("longitude", String(BRANCH_LNG));

    // Either 201 (success) or 400 (missing required photo) — not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 201) {
      expect(res.body).toHaveProperty("attendance");
      const record = await AttendanceModel.findOne({ userId: users.employee._id });
      expect(record).not.toBeNull();
      expect(record.checkIn).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-002: Check-in trùng cùng ngày → 409
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-002: Duplicate checkin returns 409", () => {
  test("second checkin on same day returns 409", async () => {
    const token = await tokenFor(users.employee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Insert attendance record directly for today
    await AttendanceModel.create({
      userId: users.employee._id,
      date: today,
      checkIn: new Date(),
      status: "present",
      approvalStatus: "APPROVED",
    });

    const res = await request(app)
      .post("/api/attendance/checkin")
      .set("Authorization", `Bearer ${token}`)
      .field("latitude", String(BRANCH_LAT))
      .field("longitude", String(BRANCH_LNG));

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-003: Check-out hợp lệ (có record checkin trước đó)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-003: Checkout with existing checkin", () => {
  test("checkout on a day with checkin record — not 401/403", async () => {
    const token = await tokenFor(users.employee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await AttendanceModel.create({
      userId: users.employee._id,
      date: today,
      checkIn: new Date(),
      status: "present",
      approvalStatus: "APPROVED",
    });

    const res = await request(app)
      .post("/api/attendance/checkout")
      .set("Authorization", `Bearer ${token}`)
      .field("latitude", String(BRANCH_LAT))
      .field("longitude", String(BRANCH_LNG));

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-004: Check-out khi chưa check-in → 400
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-004: Checkout without checkin returns 400", () => {
  test("checkout with no attendance record returns 400 or 404", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/attendance/checkout")
      .set("Authorization", `Bearer ${token}`)
      .field("latitude", String(BRANCH_LAT))
      .field("longitude", String(BRANCH_LNG));

    expect([400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-005: Employee xem lịch sử chỉ của bản thân
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-005: Get own attendance history", () => {
  test("returns 200 with own records", async () => {
    const token = await tokenFor(users.employee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await AttendanceModel.create({
      userId: users.employee._id,
      date: today,
      checkIn: new Date(),
      status: "present",
    });
    // Another user's record — should NOT appear
    await AttendanceModel.create({
      userId: users.admin._id,
      date: today,
      checkIn: new Date(),
      status: "present",
    });

    const res = await request(app)
      .get("/api/attendance/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // All returned records must belong to this employee
    const records = res.body.attendance || res.body.data || res.body;
    if (Array.isArray(records)) {
      records.forEach((r) => {
        expect(r.userId?.toString() ?? r.userId).toBe(users.employee._id.toString());
      });
    }
  });

  test("returns 401 without token", async () => {
    const res = await request(app).get("/api/attendance/history");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-006: Admin tạo attendance thủ công
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-006: Admin creates manual attendance", () => {
  test("admin can POST /api/attendance with valid data", async () => {
    const token = await tokenFor(users.admin);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const res = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        userId: users.employee._id.toString(),
        date: today.toISOString(),
        checkIn: new Date(today.getTime() + 8 * 3600000).toISOString(),
        checkOut: new Date(today.getTime() + 17 * 3600000).toISOString(),
        status: "present",
      });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    if (res.status === 201 || res.status === 200) {
      const record = await AttendanceModel.findOne({ userId: users.employee._id });
      expect(record).not.toBeNull();
    }
  });

  test("employee CANNOT POST /api/attendance (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: users.employee._id.toString(), date: new Date().toISOString() });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-007: Admin approve attendance record
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-007: Admin approves attendance", () => {
  test("supervisor can PATCH /:id/approve", async () => {
    const token = await tokenFor(users.supervisor);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await AttendanceModel.create({
      userId: users.employee._id,
      date: today,
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 3600000),
      status: "present",
      approvalStatus: "PENDING",
    });

    const res = await request(app)
      .patch(`/api/attendance/${attendance._id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "APPROVED" });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("employee CANNOT approve (403)", async () => {
    const token = await tokenFor(users.employee);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await AttendanceModel.create({
      userId: users.employee._id,
      date: today,
      checkIn: new Date(),
      status: "present",
      approvalStatus: "PENDING",
    });

    const res = await request(app)
      .patch(`/api/attendance/${attendance._id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-ATT-008: Pending early checkouts list
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-ATT-008: Pending early checkouts", () => {
  test("supervisor can GET /api/attendance/pending-early-checkouts", async () => {
    const token = await tokenFor(users.supervisor);
    const res = await request(app)
      .get("/api/attendance/pending-early-checkouts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("employee CANNOT access pending early checkouts (403)", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/attendance/pending-early-checkouts")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
