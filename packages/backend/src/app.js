// Exportable Express app — no DB connection, no server.listen, no cron.
// Import this in tests via Supertest; import index.js to actually run the server.
import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import slowDown from "express-slow-down";
import swaggerUi from "swagger-ui-express";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";

import { swaggerSpec } from "./config/swagger.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { leaveRouter } from "./modules/leave/leave.router.js";
import { attendanceRouter } from "./modules/attendance/attendance.router.js";
import { requestRouter } from "./modules/requests/request.router.js";
import { userRouter } from "./modules/users/user.router.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { branchRouter } from "./modules/branches/branch.router.js";
import { departmentRouter } from "./modules/departments/department.router.js";
import { shiftRouter } from "./modules/shifts/shift.router.js";
import { payrollRouter } from "./modules/payroll/payroll.router.js";
import { eventRouter } from "./modules/events/event.router.js";
import { performanceRouter } from "./modules/performance/performance.router.js";
import { notificationRouter } from "./modules/notifications/notification.router.js";
import { faceRouter } from "./modules/face/face.router.js";
import { configRouter } from "./modules/config/config.router.js";
import { logRouter } from "./modules/logs/log.router.js";
import { billingRouter } from "./modules/billing/billing.router.js";
import { aiBillingRouter } from "./modules/ai-billing/ai-billing.router.js";
import { scheduleRouter } from "./modules/schedule/schedule.router.js";
import { featureToggleRouter } from "./modules/feature-toggle/featureToggle.router.js";
import { companyRouter } from "./modules/company/company.router.js";
import { regulationRouter } from "./modules/company/regulation.router.js";
import { analyticsRouter } from "./modules/analytics/analytics.router.js";
import {
  globalRateLimiter,
  attendanceRateLimiter,
} from "./middleware/security.middleware.js";
import mongoose from "mongoose";
import { isRedisEnabled, isRedisDegraded } from "./config/redis.js";
import { aiServiceClient } from "./utils/aiServiceClient.js";
import { getClientIpAddress } from "./utils/client-ip.util.js";
import { isAllowedOrigin } from "./config/allowed-origins.js";

const app = express();

app.set("trust proxy", 1);

// HTTP request logging — skip health checks to reduce noise
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === "/api/health" },
}));

const BLOCKED_IPS = new Set(
  (process.env.BLOCKED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean)
);

app.use((req, res, next) => {
  if (BLOCKED_IPS.size === 0) return next();
  const clientIP = getClientIpAddress(req);
  if (clientIP && BLOCKED_IPS.has(clientIP)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
});

const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 30,
  delayMs: (hits) => (hits - 30) * 200,
  maxDelayMs: 5000,
});

// Không slow-down /api/auth — login đã có loginRateLimiter; tránh làm chậm refresh/login hợp lệ.
app.use("/api/attendance", speedLimiter);
app.use("/api/face", speedLimiter);

app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// NoSQL injection sanitizer
const sanitizeMongoKeysInPlace = (value) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) sanitizeMongoKeysInPlace(item);
    return;
  }
  for (const key of Object.keys(value)) {
    const nextValue = value[key];
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeMongoKeysInPlace(nextValue);
  }
};

app.use((req, _res, next) => {
  sanitizeMongoKeysInPlace(req.body);
  sanitizeMongoKeysInPlace(req.params);
  sanitizeMongoKeysInPlace(req.query);
  next();
});

// HTTP Parameter Pollution prevention
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return next();
  const queryString = url.slice(qIndex + 1);
  if (!queryString) return next();
  const seen = new Set();
  for (const part of queryString.split("&")) {
    if (!part) continue;
    const key = part.split("=", 1)[0];
    const decodedKey = decodeURIComponent(key.replace(/\+/g, " "));
    if (seen.has(decodedKey)) {
      return res
        .status(400)
        .json({ message: "Duplicate query parameters are not allowed." });
    }
    seen.add(decodedKey);
  }
  next();
});

// CORS must run before rate limiters so that 429/blocked responses
// still carry Access-Control-Allow-Origin headers the browser can read.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(globalRateLimiter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  const mem = process.memoryUsage();
  const mongoState = mongoose.connection.readyState;
  let mongoStatus = "disconnected";
  if (mongoState === 1) mongoStatus = "connected";
  else if (mongoState === 2) mongoStatus = "connecting";

  let redisStatus = "connected";
  if (!isRedisEnabled()) redisStatus = "disabled";
  else if (isRedisDegraded()) redisStatus = "degraded";

  let aiStatus = "unknown";
  try {
    await Promise.race([
      aiServiceClient.healthCheck(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]);
    aiStatus = "connected";
  } catch {
    aiStatus = "unavailable";
  }

  const allOk =
    mongoStatus === "connected" && redisStatus !== "disconnected";
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: { mongodb: mongoStatus, redis: redisStatus, ai: aiStatus },
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    node: process.version,
    env: process.env.NODE_ENV || "development",
  });
});

const swaggerEnabled =
  process.env.SWAGGER_ENABLED === "true" || process.env.NODE_ENV !== "production";

if (swaggerEnabled) {
  app.use(
    "/api/docs",
    (_req, res, next) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; object-src 'none';"
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "SmartAttendance API Documentation",
    })
  );
}

app.use("/api/attendance", attendanceRateLimiter);
app.use("/api/auth", authRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/requests", requestRouter);
app.use("/api/users", userRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/branches", branchRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/shifts", shiftRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/events", eventRouter);
app.use("/api/performance", performanceRouter);
app.use("/api/notifications", notificationRouter);
app.use(
  "/api/face",
  express.json({ limit: "10mb" }),
  express.urlencoded({ extended: true, limit: "10mb" }),
  faceRouter
);
app.use("/api/logs", logRouter);
app.use("/api/config", configRouter);
app.use("/api/billing", billingRouter);
app.use("/api/ai-billing", aiBillingRouter);
app.use("/api/schedules", scheduleRouter);
app.use("/api/feature-toggles", featureToggleRouter);
app.use("/api/analytics", analyticsRouter);
// IMPORTANT: mount the more specific prefix first so that
// `/api/companies/regulations/*` is not swallowed by `companyRouter`
// (which restricts to SUPER_ADMIN only and would 403 admins/HR managers).
app.use("/api/companies/regulations", regulationRouter);
app.use("/api/companies", companyRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Sentry must capture errors before the generic handler responds
Sentry.setupExpressErrorHandler(app);

app.use((err, _req, res, _next) => {
  if (res.headersSent) return _next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) logger.error({ err }, err.message || "Internal server error");
  res.status(status).json({ message: err.message || "Internal server error" });
});

export default app;
