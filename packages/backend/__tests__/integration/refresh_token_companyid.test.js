/**
 * Regression tests: refreshed access tokens must carry `companyId` so that
 * tenant-aware AI endpoints (regulation ingest, delete, RAG chat) work
 * correctly after the initial 15-minute access token expires.
 *
 * Before the fix, `AuthService.refreshToken()` omitted `companyId` from the
 * generated access token, causing every regulation upload/delete and RAG chat
 * request made after the first refresh to fail with 400 "Không xác định được
 * công ty".
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";

// ── Mocks (must be declared before any dynamic imports) ─────────────────────

jest.unstable_mockModule("../../src/config/redis.js", () => ({
  redisSet: jest.fn().mockResolvedValue("OK"),
  redisGet: jest.fn().mockResolvedValue(null), // no stored refresh token → Redis binding skipped
  redisDel: jest.fn().mockResolvedValue(1),
  redisSAdd: jest.fn().mockResolvedValue(1),
  redisSRem: jest.fn().mockResolvedValue(1),
  redisSMembers: jest.fn().mockResolvedValue([]),
  isRedisEnabled: jest.fn().mockReturnValue(false),
  isRedisDegraded: jest.fn().mockReturnValue(false),
  isRedisBindingActive: jest.fn().mockReturnValue(false), // skip token-binding check
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

// Mock AI service client so no real HTTP calls are made to the Python service.
jest.unstable_mockModule("../../src/utils/aiServiceClient.js", () => ({
  aiServiceClient: {
    healthCheck: jest.fn().mockResolvedValue({ status: "ok" }),
    ingestRegulation: jest.fn().mockResolvedValue({
      status: 200,
      data: { chunks_ingested: 3 },
    }),
    deleteRegulationVectors: jest.fn().mockResolvedValue({ status: 200 }),
    chat: jest.fn().mockResolvedValue({
      status: 200,
      data: { answer: "mock answer", sources: [] },
    }),
  },
}));

// ── Test state ───────────────────────────────────────────────────────────────

let request;
let app;
let connectTestDB, disconnectTestDB, clearAllCollections;
let CompanyModel, UserModel, RegulationModel;
let createUser, uploadToGridFS;
let generateRefreshToken;

let company;
let hrUser;

beforeAll(async () => {
  const supertest = await import("supertest");
  request = supertest.default;

  const dbHelper = await import("../helpers/db.js");
  connectTestDB = dbHelper.connectTestDB;
  disconnectTestDB = dbHelper.disconnectTestDB;
  clearAllCollections = dbHelper.clearAllCollections;

  await connectTestDB();

  ({ default: app } = await import("../../src/app.js"));
  ({ CompanyModel } = await import("../../src/modules/company/company.model.js"));
  ({ UserModel } = await import("../../src/modules/users/user.model.js"));
  ({ RegulationModel } = await import("../../src/modules/company/regulation.model.js"));
  ({ createUser } = await import("../fixtures/seed.js"));
  ({ uploadToGridFS } = await import("../../src/utils/gridfs.js"));
  ({ generateRefreshToken } = await import("../../src/utils/jwt.util.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();

  company = await CompanyModel.create({ name: "Acme Corp", slug: "refresh-token-acme" });

  hrUser = await createUser(UserModel, "HR_MANAGER", {
    email: "hr-refresh@test.com",
    companyId: company._id,
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Call POST /api/auth/refresh with a refresh token issued for `user`.
 * Returns the response so callers can inspect token + status.
 */
async function doRefresh(user) {
  const refreshToken = generateRefreshToken({ userId: user._id });
  return request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken });
}

/**
 * Decode a JWT access token without verifying the signature.
 * Used to inspect the payload fields in tests without importing jwt directly.
 */
function decodePayload(token) {
  const [, payloadB64] = token.split(".");
  return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
}

async function createTestRegulation(overrides = {}) {
  const fileContent = "Company regulation content for testing.";
  const gridFsFileId = await uploadToGridFS(
    Buffer.from(fileContent),
    "regulation.txt",
    { companyId: company._id.toString(), mimeType: "text/plain" }
  );
  return RegulationModel.create({
    companyId: company._id,
    title: "Test Regulation",
    fileName: "regulation.txt",
    fileSize: Buffer.byteLength(fileContent),
    mimeType: "text/plain",
    docType: "hr_policy",
    status: "active",
    chunksIngested: 3,
    gridFsFileId,
    accessLevel: "public",
    allowedRoles: [],
    allowedDepartmentIds: [],
    ...overrides,
  });
}

// ── Core regression: companyId survives the refresh cycle ───────────────────

describe("refreshToken companyId regression", () => {
  test("refreshed access token payload contains companyId matching user's company", async () => {
    const res = await doRefresh(hrUser);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const payload = decodePayload(res.body.token);
    expect(payload.userId).toBe(hrUser._id.toString());
    expect(payload.role).toBe("HR_MANAGER");
    // This is the key assertion — before the fix, companyId was absent (null) here.
    expect(payload.companyId).toBe(company._id.toString());
  });

  test("initial login token and refreshed token carry identical companyId", async () => {
    // Simulate initial login token shape (as generateTokenFromUser produces it)
    const { generateAccessToken } = await import("../../src/utils/jwt.util.js");
    const loginToken = generateAccessToken({
      userId: hrUser._id,
      email: hrUser.email,
      role: hrUser.role,
      department_id: hrUser.department,
      companyId: hrUser.companyId,
    });

    const refreshRes = await doRefresh(hrUser);
    expect(refreshRes.status).toBe(200);

    const loginPayload = decodePayload(loginToken);
    const refreshPayload = decodePayload(refreshRes.body.token);

    expect(refreshPayload.companyId).toBe(loginPayload.companyId);
  });

  test("inactive user cannot refresh token", async () => {
    const inactiveUser = await createUser(UserModel, "EMPLOYEE", {
      email: "inactive-refresh@test.com",
      companyId: company._id,
      isActive: false,
    });

    const res = await doRefresh(inactiveUser);
    expect(res.status).toBe(401);
  });
});

// ── Tenant-aware AI paths with a refreshed token ────────────────────────────

describe("tenant-aware AI endpoints accept refreshed token", () => {
  test("regulation ingest succeeds when using a refreshed token (companyId present)", async () => {
    const refreshRes = await doRefresh(hrUser);
    expect(refreshRes.status).toBe(200);
    const accessToken = refreshRes.body.token;

    // Verify companyId is in the refreshed token before hitting the endpoint
    const payload = decodePayload(accessToken);
    expect(payload.companyId).toBeDefined();
    expect(payload.companyId).not.toBeNull();

    const fileBuffer = Buffer.from("HR policy text content for ingestion test.");
    const res = await request(app)
      .post("/api/companies/regulations")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", fileBuffer, { filename: "policy.txt", contentType: "text/plain" })
      .field("title", "HR Policy 2026")
      .field("accessLevel", "public");

    // 201 = ingest succeeded; 400 = companyId missing (the bug we're guarding against)
    expect(res.status).toBe(201);
    expect(res.body.data?.status).toBe("active");
  });

  test("regulation list returns 200 when using a refreshed token", async () => {
    const refreshRes = await doRefresh(hrUser);
    expect(refreshRes.status).toBe(200);

    await createTestRegulation();

    const res = await request(app)
      .get("/api/companies/regulations")
      .set("Authorization", `Bearer ${refreshRes.body.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test("regulation delete succeeds when using a refreshed token", async () => {
    const regulation = await createTestRegulation();

    const refreshRes = await doRefresh(hrUser);
    expect(refreshRes.status).toBe(200);

    const res = await request(app)
      .delete(`/api/companies/regulations/${regulation._id}`)
      .set("Authorization", `Bearer ${refreshRes.body.token}`);

    // 200 = deleted; 400 = companyId missing; 404 = ownership check failed
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("refreshed token encodes companyId in JWT payload so AI service receives it without DB lookup", async () => {
    // The AI service (Python/FastAPI) decodes the JWT directly and reads
    // companyId from the payload — it has no DB access to fall back on.
    // This test confirms the fix: the payload-level claim is present.
    const refreshRes = await doRefresh(hrUser);
    expect(refreshRes.status).toBe(200);

    const payload = decodePayload(refreshRes.body.token);

    // companyId must be in the token payload itself, not just injected by middleware.
    expect(Object.prototype.hasOwnProperty.call(payload, "companyId")).toBe(true);
    expect(payload.companyId).not.toBeNull();
    expect(payload.companyId).toBe(company._id.toString());
  });
});
