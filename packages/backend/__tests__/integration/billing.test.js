/**
 * Billing integration tests — TC-BILLING-001 → TC-BILLING-009
 * Tests: upgrade RBAC, expired-trial bypass, POST /payments removed,
 *        order status poll, webhook signature, idempotency, amount mismatch.
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import crypto from "crypto";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";
process.env.PAYOS_CHECKSUM_KEY = "test_checksum_key_32chars_xxxxxxxx";
process.env.PAYOS_CLIENT_ID = "test_client_id";
process.env.PAYOS_API_KEY = "test_api_key";
process.env.FRONTEND_URL = "http://localhost:5173";

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

// ── Email mock ────────────────────────────────────────────────────────────────
jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiServiceInvoiceEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
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

// ── PayOS billing service mock ────────────────────────────────────────────────
jest.unstable_mockModule("../../src/modules/billing/billing.service.js", () => ({
  createPaymentLink: jest.fn().mockResolvedValue({
    checkoutUrl: "https://pay.payos.vn/web/test123",
    qrCode: "data:image/png;base64,test",
    paymentLinkId: "test_link_id",
  }),
  getPaymentInfo: jest.fn(),
  cancelPaymentLink: jest.fn().mockResolvedValue({ status: "CANCELLED" }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildWebhookSignature(data) {
  const key = process.env.PAYOS_CHECKSUM_KEY;
  const queryString = Object.keys(data)
    .sort()
    .map((k) => {
      const v = data[k];
      return `${k}=${v === null || v === undefined ? "" : String(v)}`;
    })
    .join("&");
  return crypto.createHmac("sha256", key).update(queryString).digest("hex");
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

let request, app;
let UserModel, CompanyModel, OrderModel;
let tokenFor, createUser;
let connectTestDB, disconnectTestDB, clearAllCollections;

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
  ({ CompanyModel } = await import("../../src/modules/company/company.model.js"));
  ({ OrderModel } = await import("../../src/modules/billing/order.model.js"));
  ({ tokenFor, createUser } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
});

const upgradeBody = (overrides = {}) => ({
  plan: "standard",
  billingCycle: "monthly",
  companyName: "Cong ty Test",
  employeeCount: 50,
  customerName: "Nguyen Van A",
  customerEmail: "billing@test.com",
  customerPhone: "0901234567",
  billingMonths: 1,
  ...overrides,
});

// ── POST /api/billing/upgrade ─────────────────────────────────────────────────

describe("POST /api/billing/upgrade", () => {
  test("TC-BILLING-001: EMPLOYEE token → 403", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const employee = await createUser(UserModel, "EMPLOYEE", { companyId: company._id });
    const token = await tokenFor(employee);

    const res = await request(app)
      .post("/api/billing/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send(upgradeBody());

    expect(res.status).toBe(403);
  });

  test("TC-BILLING-002: ADMIN with companyId → 201 with checkoutUrl", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const admin = await createUser(UserModel, "ADMIN", { companyId: company._id });
    const token = await tokenFor(admin);

    const res = await request(app)
      .post("/api/billing/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send(upgradeBody());

    expect(res.status).toBe(201);
    expect(res.body.data.checkoutUrl).toBeDefined();
    expect(res.body.data.orderCode).toBeDefined();

    // Order created in DB
    const order = await OrderModel.findOne({ orderCode: res.body.data.orderCode });
    expect(order).not.toBeNull();
    expect(order.status).toBe("pending");
    expect(order.plan).toBe("standard");
  });

  test("TC-BILLING-003: expired trial user NOT blocked by auth middleware → 400 (no companyId)", async () => {
    // Expired trial user has no companyId — reaches controller but fails companyId check
    const trialUser = await createUser(UserModel, "TRIAL", {
      email: "trialexpired@test.com",
      isTrial: true,
      trialExpiresAt: new Date(Date.now() - 1000),
    });
    const token = await tokenFor(trialUser);

    const res = await request(app)
      .post("/api/billing/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send(upgradeBody({ plan: "starter" }));

    // Must NOT be 403 from trial-expiry middleware block
    expect(res.status).not.toBe(403);
    // Fails at companyId check instead
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/công ty/);
  });

  test("TC-BILLING-004: invalid body → 400 with message", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const admin = await createUser(UserModel, "ADMIN", { companyId: company._id });
    const token = await tokenFor(admin);

    const res = await request(app)
      .post("/api/billing/upgrade")
      .set("Authorization", `Bearer ${token}`)
      .send(upgradeBody({ plan: "enterprise" })); // "enterprise" not valid

    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });
});

// ── POST /api/billing/payments (removed) ─────────────────────────────────────

describe("POST /api/billing/payments", () => {
  test("TC-BILLING-005: endpoint removed → 404", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const admin = await createUser(UserModel, "ADMIN", { companyId: company._id });
    const token = await tokenFor(admin);

    const res = await request(app)
      .post("/api/billing/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderCode: 1, amount: 100, description: "test", returnUrl: "http://a.b", cancelUrl: "http://a.b" });

    expect(res.status).toBe(404);
  });
});

// ── GET /api/billing/payments/:orderCode ─────────────────────────────────────

describe("GET /api/billing/payments/:orderCode", () => {
  test("TC-BILLING-006: returns DB order status", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const admin = await createUser(UserModel, "ADMIN", { companyId: company._id });
    const token = await tokenFor(admin);

    const order = await OrderModel.create({
      orderCode: 12345,
      companyId: company._id,
      plan: "standard",
      billingCycle: "monthly",
      amount: 2_900_000,
      status: "pending",
    });

    const res = await request(app)
      .get(`/api/billing/payments/${order.orderCode}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.orderCode).toBe(12345);
  });

  test("TC-BILLING-007: wrong company → 403", async () => {
    const companyA = await CompanyModel.create({ name: "A", plan: "starter", maxUsers: 100 });
    const companyB = await CompanyModel.create({ name: "B", plan: "starter", maxUsers: 100 });
    const adminB = await createUser(UserModel, "ADMIN", { email: "adminb@test.com", companyId: companyB._id });
    const tokenB = await tokenFor(adminB);

    await OrderModel.create({
      orderCode: 99999,
      companyId: companyA._id,
      plan: "standard",
      billingCycle: "monthly",
      amount: 2_900_000,
    });

    const res = await request(app)
      .get("/api/billing/payments/99999")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/billing/webhook/payos ──────────────────────────────────────────

describe("POST /api/billing/webhook/payos", () => {
  test("TC-BILLING-008: invalid signature → 400", async () => {
    const data = { orderCode: 111, amount: 1_000_000 };
    const res = await request(app)
      .post("/api/billing/webhook/payos")
      .send({ code: "00", success: true, data, signature: "badsig" });

    expect(res.status).toBe(400);
  });

  test("TC-BILLING-009: valid PAID webhook → order paid, company updated, isTrial cleared", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    const trialUser = await createUser(UserModel, "TRIAL", {
      email: "trial@test.com",
      companyId: company._id,
      isTrial: true,
      trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await OrderModel.create({
      orderCode: 5555,
      companyId: company._id,
      plan: "standard",
      billingCycle: "monthly",
      amount: 2_900_000,
    });

    const data = { orderCode: 5555, amount: 2_900_000 };
    const signature = buildWebhookSignature(data);

    const res = await request(app)
      .post("/api/billing/webhook/payos")
      .send({ code: "00", success: true, data, signature });

    expect(res.status).toBe(200);

    const order = await OrderModel.findOne({ orderCode: 5555 });
    expect(order.status).toBe("paid");

    const updatedCompany = await CompanyModel.findById(company._id);
    expect(updatedCompany.plan).toBe("standard");

    const updatedUser = await UserModel.findById(trialUser._id);
    expect(updatedUser.isTrial).toBe(false);
    expect(updatedUser.trialConvertedAt).toBeDefined();
  });

  test("TC-BILLING-010: amount mismatch → order failed, company NOT updated", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    await OrderModel.create({
      orderCode: 7777,
      companyId: company._id,
      plan: "premium",
      billingCycle: "yearly",
      amount: 80_000_000,
    });

    const data = { orderCode: 7777, amount: 1 }; // tampered amount
    const signature = buildWebhookSignature(data);

    const res = await request(app)
      .post("/api/billing/webhook/payos")
      .send({ code: "00", success: true, data, signature });

    expect(res.status).toBe(200); // 200 so PayOS doesn't retry a security rejection

    const order = await OrderModel.findOne({ orderCode: 7777 });
    expect(order.status).toBe("failed");

    const unchangedCompany = await CompanyModel.findById(company._id);
    expect(unchangedCompany.plan).toBe("starter"); // not updated
  });

  test("TC-BILLING-011: idempotency — already-paid order re-runs company update", async () => {
    const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
    // Order already marked "paid" but company still on old plan (partial failure scenario)
    await OrderModel.create({
      orderCode: 8888,
      companyId: company._id,
      plan: "premium",
      billingCycle: "monthly",
      amount: 6_600_000,
      status: "paid",
      paidAt: new Date(),
    });

    const data = { orderCode: 8888, amount: 6_600_000 };
    const signature = buildWebhookSignature(data);

    const res = await request(app)
      .post("/api/billing/webhook/payos")
      .send({ code: "00", success: true, data, signature });

    expect(res.status).toBe(200);

    // Company should now be on premium
    const updatedCompany = await CompanyModel.findById(company._id);
    expect(updatedCompany.plan).toBe("premium");
  });
});
