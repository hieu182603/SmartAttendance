/**
 * AI Billing integration tests — TC-AI-BILLING-001 → TC-AI-BILLING-008
 * Tests: RBAC (usage, invoices), tenant isolation, invoice generate,
 *        PayOS webhook signature, idempotent email, manual confirm.
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
const sendAiServiceInvoiceEmailMock = jest.fn().mockResolvedValue({ success: true });
const sendAiPaymentConfirmationEmailMock = jest.fn().mockResolvedValue({ success: true });

jest.unstable_mockModule("../../src/utils/email.util.js", () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ success: true }),
  sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAiServiceInvoiceEmail: sendAiServiceInvoiceEmailMock,
  sendAiPaymentConfirmationEmail: sendAiPaymentConfirmationEmailMock,
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
    checkoutUrl: "https://pay.payos.vn/web/test_ai",
    qrCode: "data:image/png;base64,test",
    paymentLinkId: "ai_link_id",
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
let UserModel, CompanyModel, AiInvoiceModel, AiUsageEventModel;
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
  ({ AiInvoiceModel } = await import("../../src/modules/ai-billing/aiInvoice.model.js"));
  ({ AiUsageEventModel } = await import("../../src/modules/ai-billing/aiUsageEvent.model.js"));
  ({ tokenFor, createUser } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  sendAiServiceInvoiceEmailMock.mockClear();
  sendAiPaymentConfirmationEmailMock.mockClear();
});

// ── Helper: seed company + user ───────────────────────────────────────────────

let _companySeed = 0;
async function seedCompanyAndAdmin(role = "ADMIN") {
  _companySeed++;
  const n = _companySeed;
  const company = await CompanyModel.create({ name: `Test Co ${n}`, plan: "starter", maxUsers: 100 });
  const user = await createUser(UserModel, role, {
    companyId: company._id,
    email: `${role.toLowerCase()}_${n}@test.com`,
  });
  const token = await tokenFor(user);
  return { company, user, token };
}

// ── TC-AI-BILLING-001: ADMIN can GET /api/ai-billing/usage ────────────────────

describe("GET /api/ai-billing/usage", () => {
  test("TC-AI-001: ADMIN gets own company usage", async () => {
    const { token } = await seedCompanyAndAdmin("ADMIN");
    const res = await request(app)
      .get("/api/ai-billing/usage")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("totalTokens");
  });

  test("TC-AI-002: EMPLOYEE is forbidden", async () => {
    const { company } = await seedCompanyAndAdmin("ADMIN");
    const emp = await createUser(UserModel, "EMPLOYEE", { companyId: company._id, isActive: true });
    const token = await tokenFor(emp);
    await request(app)
      .get("/api/ai-billing/usage")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});

// ── TC-AI-BILLING-003: tenant isolation ──────────────────────────────────────

describe("Tenant isolation", () => {
  test("TC-AI-003: ADMIN cannot see another company invoice", async () => {
    const { company: c1 } = await seedCompanyAndAdmin("ADMIN");
    const { company: c2, token: t2 } = await seedCompanyAndAdmin("ADMIN");

    // Create invoice for company 1
    const inv = await AiInvoiceModel.create({
      invoiceCode: 9_000_000_001,
      companyId: c1._id,
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-01-31"),
      amountVnd: 50000,
      status: "issued",
    });

    // ADMIN of company 2 should get 404
    await request(app)
      .get(`/api/ai-billing/invoices/${inv.invoiceCode}`)
      .set("Authorization", `Bearer ${t2}`)
      .expect(404);
  });
});

// ── TC-AI-BILLING-003b: SUPER_ADMIN platform usage ───────────────────────────

describe("GET /api/ai-billing/admin/companies", () => {
  test("TC-AI-003b: SUPER_ADMIN gets company usage list (no 500)", async () => {
    const { company } = await seedCompanyAndAdmin("ADMIN");
    const sa = await createUser(UserModel, "SUPER_ADMIN", {});
    const saToken = await tokenFor(sa);

    await AiUsageEventModel.create({
      companyId: company._id,
      userId: "user_123",
      service: "rag",
      operation: "chat",
      model: "gemini-2.5-flash",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCostVnd: 1000,
      estimated: false,
      createdAt: new Date("2026-05-10"),
    });

    const res = await request(app)
      .get("/api/ai-billing/admin/companies")
      .query({ month: 5, year: 2026 })
      .set("Authorization", `Bearer ${saToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ── TC-AI-BILLING-004: SUPER_ADMIN generate invoices ─────────────────────────

describe("POST /api/ai-billing/admin/invoices/generate", () => {
  test("TC-AI-004: SUPER_ADMIN generates invoices for period", async () => {
    const { company } = await seedCompanyAndAdmin("ADMIN");
    const sa = await createUser(UserModel, "SUPER_ADMIN", {});
    const saToken = await tokenFor(sa);

    // Seed usage event
    await AiUsageEventModel.create({
      companyId: company._id,
      userId: "user_123",
      service: "rag",
      operation: "chat",
      model: "gemini-2.5-flash",
      promptTokens: 500,
      completionTokens: 200,
      totalTokens: 700,
      estimatedCostUsd: 0.001,
      estimatedCostVnd: 25,
      estimated: false,
      createdAt: new Date("2025-01-15"),
    });

    const res = await request(app)
      .post("/api/ai-billing/admin/invoices/generate")
      .set("Authorization", `Bearer ${saToken}`)
      .send({ periodMonth: 1, periodYear: 2025 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.created).toBeGreaterThanOrEqual(1);
  });

  test("TC-AI-005: ADMIN cannot generate invoices", async () => {
    const { token } = await seedCompanyAndAdmin("ADMIN");
    await request(app)
      .post("/api/ai-billing/admin/invoices/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ periodMonth: 1, periodYear: 2025 })
      .expect(403);
  });
});

// ── TC-AI-BILLING-006: PayOS webhook → invoice paid ──────────────────────────

describe("POST /api/ai-billing/webhook/payos", () => {
  test("TC-AI-006: valid signature marks invoice paid", async () => {
    const { company } = await seedCompanyAndAdmin("ADMIN");
    const invoice = await AiInvoiceModel.create({
      invoiceCode: 9_000_000_002,
      companyId: company._id,
      periodStart: new Date("2025-02-01"),
      periodEnd: new Date("2025-02-28"),
      amountVnd: 100000,
      status: "issued",
    });

    const data = {
      orderCode: invoice.invoiceCode,
      amount: 100000,
      description: "Chi phi AI T02/2025",
      accountNumber: "1234567890",
      reference: "REF001",
      transactionDateTime: "2025-03-01 10:00:00",
      paymentLinkId: "link_001",
      code: "00",
      desc: "success",
      counterAccountBankId: "",
      counterAccountBankName: "",
      counterAccountName: "",
      counterAccountNumber: "",
      virtualAccountName: "",
      virtualAccountNumber: "",
      currency: "VND",
    };
    const signature = buildWebhookSignature(data);

    await request(app)
      .post("/api/ai-billing/webhook/payos")
      .send({ code: "00", desc: "success", success: true, data, signature })
      .expect(200);

    const updated = await AiInvoiceModel.findById(invoice._id);
    expect(updated.status).toBe("paid");
    expect(updated.paidAt).toBeTruthy();
  });

  test("TC-AI-007: invalid signature is rejected", async () => {
    const data = { orderCode: 9_000_000_099, amount: 50000 };
    await request(app)
      .post("/api/ai-billing/webhook/payos")
      .send({ data, signature: "invalid_sig" })
      .expect(400);
  });
});

// ── TC-AI-BILLING-008: SUPER_ADMIN manual confirm ────────────────────────────

describe("PUT /api/ai-billing/admin/invoices/:id/confirm", () => {
  test("TC-AI-008: SUPER_ADMIN can manually confirm invoice", async () => {
    const { company } = await seedCompanyAndAdmin("ADMIN");
    const sa = await createUser(UserModel, "SUPER_ADMIN", {});
    const saToken = await tokenFor(sa);

    const invoice = await AiInvoiceModel.create({
      invoiceCode: 9_000_000_003,
      companyId: company._id,
      periodStart: new Date("2025-03-01"),
      periodEnd: new Date("2025-03-31"),
      amountVnd: 80000,
      status: "issued",
    });

    const res = await request(app)
      .put(`/api/ai-billing/admin/invoices/${invoice._id}/confirm`)
      .set("Authorization", `Bearer ${saToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("paid");
  });
});
