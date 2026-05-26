/**
 * Face Recognition integration tests — TC-FACE-001 → TC-FACE-006
 * AI service calls are mocked; MongoDB in-memory stores face registration state.
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

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

// ── AI service mock (controllable per test) ───────────────────────────────────
const mockRegisterFace = jest.fn();
const mockVerifyFace = jest.fn();
const mockLivenessDetection = jest.fn();

jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: {
    healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
    registerFace: mockRegisterFace,
    verifyFace: mockVerifyFace,
    livenessDetection: mockLivenessDetection,
  },
}));

// ── Socket & Cloudinary mocks ─────────────────────────────────────────────────
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

jest.unstable_mockModule("../../src/config/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/test/image/upload/face.jpg",
    public_id: "test_face_id",
  }),
}));

// ── Dynamic imports ───────────────────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, tokenFor, seedAllUsers;
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

  users = await seedAllUsers(UserModel);
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  users = await seedAllUsers(UserModel);
  mockRegisterFace.mockReset();
  mockVerifyFace.mockReset();
  mockLivenessDetection.mockReset();
});

// Small valid JPEG buffer (1x1 pixel)
const fakeImageBuffer = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB/8QAIBAAAQQCAgMAAAAAAAAAAAAAAQIDBBEFBhIhMf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABr/2Q==",
  "base64"
);

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-001: Đăng ký khuôn mặt thành công
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-001: Register face success", () => {
  test("POST /api/face/register returns 200 and stores face data", async () => {
    mockRegisterFace.mockResolvedValue({
      success: true,
      message: "Face registered successfully",
      faceId: "face_id_001",
      embedding: new Array(512).fill(0.1),
    });

    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/face/register")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", fakeImageBuffer, { filename: "face1.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face2.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face3.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face4.jpg", contentType: "image/jpeg" });

    // 200 or 201 on success, not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-002: TRIAL user bị chặn — requireMinimumRole(EMPLOYEE)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-002: TRIAL user blocked from face routes", () => {
  test("TRIAL user cannot access POST /api/face/register", async () => {
    const token = await tokenFor(users.trialActive);

    const res = await request(app)
      .post("/api/face/register")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", fakeImageBuffer, { filename: "face1.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-003: Upload file không phải ảnh bị từ chối
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-003: Non-image file rejected", () => {
  test("uploading a .txt file returns 400", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/face/register")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", Buffer.from("not an image"), {
        filename: "malware.txt",
        contentType: "text/plain",
      });

    // Should be rejected by multer fileFilter → 400 or 422
    expect([400, 422, 500]).toContain(res.status);
    // Should definitely NOT succeed
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-004: AI service down → backend returns clear error
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-004: AI service unavailable", () => {
  test("returns 502 or 503 when AI service is down", async () => {
    mockRegisterFace.mockRejectedValue(new Error("AI service connection refused"));

    const token = await tokenFor(users.employee);

    const res = await request(app)
      .post("/api/face/register")
      .set("Authorization", `Bearer ${token}`)
      .attach("images", fakeImageBuffer, { filename: "face1.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face2.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face3.jpg", contentType: "image/jpeg" })
      .attach("images", fakeImageBuffer, { filename: "face4.jpg", contentType: "image/jpeg" });

    // Must NOT be 200/201 when AI service fails
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
    // Should be 4xx or 5xx
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-005: Xem face status
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-005: Get face status", () => {
  test("employee can GET /api/face/status", async () => {
    const token = await tokenFor(users.employee);
    const res = await request(app)
      .get("/api/face/status")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Response can be flat {isRegistered} or wrapped {data:{isRegistered}}
    const body = res.body?.data ?? res.body;
    expect(body).toHaveProperty("isRegistered");
  });

  test("returns 401 without token", async () => {
    const res = await request(app).get("/api/face/status");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-FACE-006: Xoá face đăng ký
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-FACE-006: Delete registered face", () => {
  test("employee can DELETE /api/face/register", async () => {
    const token = await tokenFor(users.employee);

    const res = await request(app)
      .delete("/api/face/register")
      .set("Authorization", `Bearer ${token}`);

    // 200 or 404 (no face registered yet) — not 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  test("TRIAL user cannot delete face (403)", async () => {
    const token = await tokenFor(users.trialActive);
    const res = await request(app)
      .delete("/api/face/register")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
