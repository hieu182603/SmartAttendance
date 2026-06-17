import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test_jwt_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
process.env.NODE_ENV = "test";
process.env.GA_PROPERTY_ID = "123456789";
process.env.GA_SERVICE_ACCOUNT_KEY_PATH = "./test-key.json";

// Mock redis
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

// Mock fs to intercept reading the service account key
jest.unstable_mockModule("fs", () => {
  const actualFs = jest.requireActual("fs");
  return {
    ...actualFs,
    readFileSync: jest.fn().mockImplementation((filepath, options) => {
      if (filepath.includes("test-key.json")) {
        return JSON.stringify({
          type: "service_account",
          project_id: "test-project",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDh...==\n-----END PRIVATE KEY-----\n",
          client_email: "test@test-project.iam.gserviceaccount.com",
        });
      }
      return actualFs.readFileSync(filepath, options);
    }),
  };
});

// Mock googleapis
const runReportMock = jest.fn().mockResolvedValue({
  data: {
    rows: [
      {
        dimensionValues: [{ value: "Direct" }],
        metricValues: [{ value: "100" }, { value: "50" }, { value: "10" }, { value: "0.2" }, { value: "20" }]
      }
    ]
  }
});
const runRealtimeReportMock = jest.fn().mockResolvedValue({
  data: {
    rows: [
      {
        metricValues: [{ value: "5" }]
      }
    ]
  }
});

jest.unstable_mockModule("googleapis", () => {
  return {
    google: {
      auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({
          getClient: jest.fn(),
        }))
      },
      analyticsdata: jest.fn().mockReturnValue({
        properties: {
          runReport: runReportMock,
          runRealtimeReport: runRealtimeReportMock,
        }
      })
    }
  };
});

let request, app;
let UserModel, CompanyModel;
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
  ({ tokenFor, createUser } = await import("../fixtures/seed.js"));
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearAllCollections();
  runReportMock.mockClear();
  runRealtimeReportMock.mockClear();
});

async function seedUserWithRole(role) {
  const company = await CompanyModel.create({ name: "Test Co", plan: "starter", maxUsers: 100 });
  const user = await createUser(UserModel, role, {
    companyId: company._id,
    email: `${role.toLowerCase()}@test.com`,
  });
  const token = await tokenFor(user);
  return { company, user, token };
}

describe("Analytics Module Integration Tests", () => {
  test("SUPER_ADMIN can fetch analytics report (200 OK)", async () => {
    const { token } = await seedUserWithRole("SUPER_ADMIN");

    const res = await request(app)
      .get("/api/analytics/report")
      .query({ range: "7days" })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.configured).toBe(true);
    expect(res.body).toHaveProperty("overview");
    expect(res.body).toHaveProperty("trafficTrend");
    expect(res.body).toHaveProperty("topPages");
    expect(res.body).toHaveProperty("channels");
    expect(res.body).toHaveProperty("devices");
    expect(res.body).toHaveProperty("locations");
    expect(res.body).toHaveProperty("activeUsers");
    
    expect(runReportMock).toHaveBeenCalled();
  });

  test("SUPER_ADMIN can fetch realtime users count (200 OK)", async () => {
    const { token } = await seedUserWithRole("SUPER_ADMIN");

    const res = await request(app)
      .get("/api/analytics/realtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.configured).toBe(true);
    expect(res.body.activeUsers).toBe(5);
    
    expect(runRealtimeReportMock).toHaveBeenCalled();
  });

  test("ADMIN is forbidden from report & realtime (403 Forbidden)", async () => {
    const { token } = await seedUserWithRole("ADMIN");

    await request(app)
      .get("/api/analytics/report")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    await request(app)
      .get("/api/analytics/realtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  test("EMPLOYEE is forbidden from report & realtime (403 Forbidden)", async () => {
    const { token } = await seedUserWithRole("EMPLOYEE");

    await request(app)
      .get("/api/analytics/report")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);

    await request(app)
      .get("/api/analytics/realtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  test("Request returns 400 for invalid date range", async () => {
    const { token } = await seedUserWithRole("SUPER_ADMIN");

    await request(app)
      .get("/api/analytics/report")
      .query({ range: "invalid-range" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  test("Request returns 503 if GA not configured", async () => {
    const { token } = await seedUserWithRole("SUPER_ADMIN");
    
    const { AnalyticsService } = await import("../../src/modules/analytics/analytics.service.js");
    const spy = jest.spyOn(AnalyticsService, "isConfigured").mockReturnValue(false);

    await request(app)
      .get("/api/analytics/report")
      .set("Authorization", `Bearer ${token}`)
      .expect(503);

    await request(app)
      .get("/api/analytics/realtime")
      .set("Authorization", `Bearer ${token}`)
      .expect(503);

    spy.mockRestore();
  });
});
