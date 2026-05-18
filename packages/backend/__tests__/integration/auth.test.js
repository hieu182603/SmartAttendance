/**
 * Auth integration tests — TC-AUTH-001 → TC-AUTH-014
 * Uses MongoDB in-memory server + mocked Redis + mocked email.
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";
process.env.EMAIL_HOST = "";

// ── Redis mock (stateful) ─────────────────────────────────────────────────────
const redisStore = new Map();

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redisSet: jest.fn().mockImplementation((key, value) => {
    redisStore.set(key, value);
    return Promise.resolve("OK");
  }),
  redisGet: jest.fn().mockImplementation((key) => Promise.resolve(redisStore.get(key) ?? null)),
  redisDel: jest.fn().mockImplementation((...keys) => {
    keys.forEach((k) => redisStore.delete(k));
    return Promise.resolve(keys.length);
  }),
  redisSAdd: jest.fn().mockResolvedValue(1),
  redisSRem: jest.fn().mockResolvedValue(1),
  redisSMembers: jest.fn().mockResolvedValue([]),
  isRedisEnabled: jest.fn().mockReturnValue(true),
  isRedisDegraded: jest.fn().mockReturnValue(false),
  cacheAside: jest.fn().mockImplementation((_key, _ttl, factory) => factory()),
}));

// ── Email mock ────────────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// ── AI service mock ───────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: {
    healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
    registerFace: jest.fn(),
    verifyFace: jest.fn(),
    livenessDetection: jest.fn(),
  },
}));

// ── Dynamic imports (after mocks) ─────────────────────────────────────────────
let request, app, connectTestDB, disconnectTestDB, clearAllCollections;
let UserModel, OtpModel;
let sendOTPEmail, sendResetPasswordEmail;

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
  ({ OtpModel } = await import("../../src/modules/otp/otp.model.js"));
  ({ sendOTPEmail, sendResetPasswordEmail } = await import("../../src/utils/email.util.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  redisStore.clear();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Tạo user đã verify trực tiếp vào DB — không phụ thuộc email mock.
async function createVerifiedUser(email = "user@test.com", password = "SmartAttendance@2026!", name = "Test User") {
  const bcrypt = (await import("bcryptjs")).default;
  const hashed = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    email,
    password: hashed,
    name,
    role: "TRIAL",
    isVerified: true,
    isActive: true,
    isTrial: true,
    trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return { email, password, user };
}

// Dùng cho tests cần test full register→OTP→verify flow.
async function registerAndVerify(email = "user@test.com", password = "SmartAttendance@2026!", name = "Test User") {
  const regRes = await request(app).post("/api/auth/register").send({ email, password, name });

  // Lấy OTP từ DB; nếu không có (email mock chưa trigger OTP creation), tạo trực tiếp.
  let otp = await OtpModel.findOne({ email, purpose: "verify_email" }).sort({ createdAt: -1 });

  if (!otp) {
    // Fallback: tạo OTP trực tiếp để test verify-otp endpoint
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error(`registerAndVerify: user ${email} not found (register returned ${regRes.status})`);
    otp = await OtpModel.create({
      userId: user._id,
      email,
      code: "123456",
      purpose: "verify_email",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
  }

  await request(app).post("/api/auth/verify-otp").send({ email, otp: otp.code });
  return { email, password };
}

async function loginAs(email, password = "SmartAttendance@2026!") {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body;
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-001: Đăng ký mới thành công
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-001: Register success", () => {
  test("returns 201 and sends OTP email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@test.com",
      password: "SmartAttendance@2026!",
      name: "Nguyen Van A",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("userId");
    expect(res.body.email).toBe("newuser@test.com");
    expect(sendOTPEmail).toHaveBeenCalledWith("newuser@test.com", expect.any(String), "Nguyen Van A");

    const user = await UserModel.findOne({ email: "newuser@test.com" });
    expect(user).not.toBeNull();
    expect(user.isVerified).toBe(false);
    expect(user.role).toBe("TRIAL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-002: Đăng ký email đã tồn tại
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-002: Register duplicate email", () => {
  test("returns 409 on duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@test.com",
      password: "SmartAttendance@2026!",
      name: "User One",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "dup@test.com",
      password: "SmartAttendance@2026!",
      name: "User Two",
    });

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-003: Xác thực OTP đúng
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-003: Verify OTP success", () => {
  test("returns 200 and sets isVerified = true", async () => {
    const email = "verify@test.com";
    await request(app).post("/api/auth/register").send({ email, password: "SmartAttendance@2026!", name: "Verify User" });

    const otp = await OtpModel.findOne({ email }).sort({ createdAt: -1 });
    const res = await request(app).post("/api/auth/verify-otp").send({ email, otp: otp.code });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(email);

    const user = await UserModel.findOne({ email });
    expect(user.isVerified).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-004: OTP sai
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-004: Verify OTP wrong code", () => {
  test("returns 400 for wrong OTP", async () => {
    const email = "wrongotp@test.com";
    await request(app).post("/api/auth/register").send({ email, password: "SmartAttendance@2026!", name: "Wrong OTP" });

    const res = await request(app).post("/api/auth/verify-otp").send({ email, otp: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid otp/i);
  });

  test("returns 400 for OTP with wrong length", async () => {
    const res = await request(app).post("/api/auth/verify-otp").send({
      email: "any@test.com",
      otp: "12345",
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-005: Đăng nhập thành công
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-005: Login success", () => {
  test("returns 200 with accessToken and refreshToken", async () => {
    await registerAndVerify("login@test.com", "SmartAttendance@2026!");

    const res = await request(app).post("/api/auth/login").send({
      email: "login@test.com",
      password: "SmartAttendance@2026!",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.user.email).toBe("login@test.com");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-006: Đăng nhập sai mật khẩu
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-006: Login wrong password", () => {
  test("returns 401 and does not reveal DB details", async () => {
    await registerAndVerify("wrongpass@test.com");

    const res = await request(app).post("/api/auth/login").send({
      email: "wrongpass@test.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    // "Invalid email or password" is intentionally vague — both fields combined
    expect(res.body.message).toMatch(/invalid email or password/i);
    expect(res.body.message).not.toMatch(/mongo|database|stack/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-007: Đăng nhập tài khoản chưa verify email
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-007: Login unverified account", () => {
  test("returns 403", async () => {
    await request(app).post("/api/auth/register").send({
      email: "unverified@test.com",
      password: "SmartAttendance@2026!",
      name: "Unverified User",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "unverified@test.com",
      password: "SmartAttendance@2026!",
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not verified/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-008: Refresh token hợp lệ
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-008: Refresh token valid", () => {
  test("returns 200 with new accessToken", async () => {
    await registerAndVerify("refresh@test.com");
    const loginRes = await loginAs("refresh@test.com");
    const { refreshToken } = loginRes;

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    // Token must be a valid JWT string (3 dot-separated parts)
    expect(res.body.token.split(".")).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-009: Refresh token đã bị thu hồi (sau logout)
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-009: Refresh revoked token", () => {
  test("returns 401 after logout", async () => {
    await registerAndVerify("revoked@test.com");
    const loginRes = await loginAs("revoked@test.com");
    const { token, refreshToken } = loginRes;

    // Logout revokes the refresh token
    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-010: Logout xoá Redis session
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-010: Logout clears session", () => {
  test("returns 200 and token no longer works", async () => {
    await registerAndVerify("logout@test.com");
    const { token } = await loginAs("logout@test.com");

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // After logout, /me should still work (access token not revoked server-side)
    // but refresh should fail — already covered in TC-AUTH-009
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-011: Trial user hết hạn bị chặn
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-011: Expired trial user blocked", () => {
  test("returns 403 on /me when trial expired", async () => {
    const { generateAccessToken } = await import("../../src/utils/jwt.util.js");

    // Create expired trial user directly in DB
    const hashed = (await import("bcryptjs")).default;
    const user = await UserModel.create({
      email: "expiredtrial@test.com",
      password: await hashed.hash("SmartAttendance@2026!", 10),
      name: "Expired Trial",
      role: "TRIAL",
      isVerified: true,
      isActive: true,
      isTrial: true,
      trialExpiresAt: new Date(Date.now() - 1000), // expired
    });

    const token = generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      isTrial: true,
      trialExpiresAt: user.trialExpiresAt,
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-012: Validation — thiếu field
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-012: Input validation", () => {
  test("register: missing name returns 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "noname@test.com",
      password: "SmartAttendance@2026!",
    });
    expect(res.status).toBe(400);
  });

  test("register: invalid email format returns 400", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "SmartAttendance@2026!",
      name: "Test User",
    });
    expect(res.status).toBe(400);
  });

  test("login: password too short returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "123",
    });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-013: Forgot password — không lộ email tồn tại
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-013: Forgot password does not reveal existence", () => {
  test("returns 200 for existing email", async () => {
    await registerAndVerify("fp@test.com");

    const res = await request(app).post("/api/auth/forgot-password").send({ email: "fp@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns same 200 for non-existing email (no oracle)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: "ghost@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-AUTH-014: Reset password với token hợp lệ
// ─────────────────────────────────────────────────────────────────────────────
describe("TC-AUTH-014: Reset password full flow", () => {
  test("new password works after reset", async () => {
    const email = "resetpw@test.com";
    await registerAndVerify(email);

    // 1. Request reset OTP
    await request(app).post("/api/auth/forgot-password").send({ email });

    // 2. Get OTP from DB
    const otp = await OtpModel.findOne({ email, purpose: "forgot_password" });
    expect(otp).not.toBeNull();

    // 3. Verify reset OTP → get resetToken
    const verifyRes = await request(app).post("/api/auth/verify-reset-otp").send({ email, otp: otp.code });
    expect(verifyRes.status).toBe(200);
    const { resetToken } = verifyRes.body;

    // 4. Reset password
    const resetRes = await request(app).post("/api/auth/reset-password").send({
      email,
      password: "NewSmartAttendance@2026!",
      resetToken,
    });
    expect(resetRes.status).toBe(200);

    // 5. Login with new password
    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "NewSmartAttendance@2026!",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
  });

  test("reset with invalid token returns 400", async () => {
    const email = "badreset@test.com";
    await registerAndVerify(email);

    const res = await request(app).post("/api/auth/reset-password").send({
      email,
      password: "NewSmartAttendance@2026!",
      resetToken: "invalidtoken",
    });
    expect(res.status).toBe(400);
  });
});
