import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";

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
    ingestRegulation: jest.fn().mockResolvedValue({
      status: 200,
      data: { chunks_ingested: 1 },
    }),
    deleteRegulationVectors: jest.fn().mockResolvedValue({ status: 200 }),
  },
}));

let request;
let app;
let connectTestDB;
let disconnectTestDB;
let clearAllCollections;
let CompanyModel;
let RegulationModel;
let UserModel;
let createUser;
let tokenFor;
let uploadToGridFS;
let canAccessRegulation;

let companyA;
let companyB;
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
  ({ CompanyModel } = await import("../../src/modules/company/company.model.js"));
  ({ RegulationModel } = await import("../../src/modules/company/regulation.model.js"));
  ({ UserModel } = await import("../../src/modules/users/user.model.js"));
  ({ createUser, tokenFor } = await import("../fixtures/seed.js"));
  ({ uploadToGridFS } = await import("../../src/utils/gridfs.js"));
  ({ canAccessRegulation } = await import("../../src/modules/company/regulation.controller.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();

  companyA = await CompanyModel.create({ name: "Company A", slug: "reg-company-a" });
  companyB = await CompanyModel.create({ name: "Company B", slug: "reg-company-b" });

  users = {
    employee: await createUser(UserModel, "EMPLOYEE", {
      email: "reg-employee@test.com",
      companyId: companyA._id,
    }),
    hr: await createUser(UserModel, "HR_MANAGER", {
      email: "reg-hr@test.com",
      companyId: companyA._id,
    }),
    employeeOtherCompany: await createUser(UserModel, "EMPLOYEE", {
      email: "reg-employee-other@test.com",
      companyId: companyB._id,
    }),
  };
});

async function createRegulation(overrides = {}) {
  const fileContent = overrides.fileContent || "Policy file content";
  const gridFsFileId =
    "gridFsFileId" in overrides
      ? overrides.gridFsFileId
      : await uploadToGridFS(Buffer.from(fileContent), "policy.txt", {
          companyId: (overrides.companyId || companyA._id).toString(),
          mimeType: "text/plain",
        });

  return RegulationModel.create({
    companyId: companyA._id,
    title: "Policy Document",
    fileName: "policy.txt",
    fileSize: Buffer.byteLength(fileContent),
    mimeType: "text/plain",
    docType: "hr_policy",
    status: "active",
    chunksIngested: 1,
    gridFsFileId,
    accessLevel: "public",
    allowedRoles: [],
    allowedDepartmentIds: [],
    ...overrides,
  });
}

async function getDownload(regulation, user) {
  const token = await tokenFor(user);
  return request(app)
    .get(`/api/companies/regulations/${regulation._id}/download`)
    .set("Authorization", `Bearer ${token}`);
}

describe("Regulation download access control", () => {
  test("ACL helper allows explicit role and department allow-lists", () => {
    const departmentId = new mongoose.Types.ObjectId();

    expect(canAccessRegulation(
      {
        accessLevel: "restricted",
        allowedRoles: ["MANAGER"],
        allowedDepartmentIds: [],
      },
      { role: "MANAGER" }
    )).toBe(true);

    expect(canAccessRegulation(
      {
        accessLevel: "restricted",
        allowedRoles: [],
        allowedDepartmentIds: [departmentId],
      },
      { role: "EMPLOYEE", departmentId }
    )).toBe(true);

    expect(canAccessRegulation(
      {
        accessLevel: "restricted",
        allowedRoles: [],
        allowedDepartmentIds: [],
      },
      { role: "EMPLOYEE", departmentId }
    )).toBe(false);
  });

  test("employee can download a public regulation from the same company", async () => {
    const regulation = await createRegulation({ fileContent: "Public policy" });

    const res = await getDownload(regulation, users.employee);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toBe("Public policy");
  });

  test("employee cannot download restricted regulation with empty allow-list", async () => {
    const regulation = await createRegulation({ accessLevel: "restricted" });

    const res = await getDownload(regulation, users.employee);

    expect(res.status).toBe(403);
  });

  test("HR manager can download restricted regulation", async () => {
    const regulation = await createRegulation({
      accessLevel: "restricted",
      fileContent: "Restricted policy",
    });

    const res = await getDownload(regulation, users.hr);

    expect(res.status).toBe(200);
    expect(res.text).toBe("Restricted policy");
  });

  test("user from another company cannot download regulation", async () => {
    const regulation = await createRegulation();

    const res = await getDownload(regulation, users.employeeOtherCompany);

    expect(res.status).toBe(404);
  });

  test("deleted regulation cannot be downloaded", async () => {
    const regulation = await createRegulation({ status: "deleted" });

    const res = await getDownload(regulation, users.hr);

    expect(res.status).toBe(404);
  });

  test("missing GridFS file returns not found", async () => {
    const regulation = await createRegulation({
      gridFsFileId: new mongoose.Types.ObjectId(),
    });

    const res = await getDownload(regulation, users.hr);

    expect(res.status).toBe(404);
  });
});

describe("Regulation delete – vector cleanup failure", () => {
  let aiServiceClient;

  beforeAll(async () => {
    ({ aiServiceClient } = await import("../../src/utils/aiServiceClient.js"));
  });

  test("regulation is NOT soft-deleted when AI vector deletion fails", async () => {
    // Arrange: create an active regulation
    const regulation = await createRegulation();
    expect(regulation.status).toBe("active");

    // Force the AI vector delete call to reject
    aiServiceClient.deleteRegulationVectors.mockRejectedValueOnce(
      new Error("Vector store unavailable")
    );

    const token = await tokenFor(users.hr);

    // Act: attempt to delete the regulation
    const res = await request(app)
      .delete(`/api/companies/regulations/${regulation._id}`)
      .set("Authorization", `Bearer ${token}`);

    // Assert: API reports failure (502), NOT success
    expect(res.status).toBe(502);
    expect(res.body.success).toBeUndefined();

    // Assert: the regulation record is still active in the database
    const afterDelete = await RegulationModel.findById(regulation._id);
    expect(afterDelete).not.toBeNull();
    expect(afterDelete.status).toBe("active");
  });

  test("regulation IS soft-deleted when AI vector deletion succeeds", async () => {
    // Arrange: ensure the mock resolves normally (default behavior)
    aiServiceClient.deleteRegulationVectors.mockResolvedValueOnce({ status: 200 });

    const regulation = await createRegulation();
    const token = await tokenFor(users.hr);

    // Act
    const res = await request(app)
      .delete(`/api/companies/regulations/${regulation._id}`)
      .set("Authorization", `Bearer ${token}`);

    // Assert: success
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Assert: the regulation is now soft-deleted
    const afterDelete = await RegulationModel.findById(regulation._id);
    expect(afterDelete.status).toBe("deleted");
  });
});
