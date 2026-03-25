// Load environment variables FIRST — must be the very first import.
// ES modules hoist all imports, so dotenv.config() in this file would run
// AFTER all other imports resolve. Isolating it in env.js ensures .env
// is loaded before any module reads process.env.
import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import slowDown from "express-slow-down";


import { connectDatabase } from "./config/database.js";
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
import { startCronJobs } from "./jobs/attendance.job.js";
import {
  globalRateLimiter,
  authRateLimiter,
  attendanceRateLimiter,
} from "./middleware/security.middleware.js";


import { logRouter } from "./modules/logs/log.router.js";

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Emergency IP Blacklist
const BLOCKED_IPS = new Set([
  "118.70.211.226", // Attacker IP from 2026-03-24
]);

const ipBlacklist = (req, res, next) => {
  const clientIP = req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (BLOCKED_IPS.has(clientIP)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

// Speed limiter - delay responses progressively for repeat requests
const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 30,      // allow 30 requests per minute without delay
  delayMs: (hits) => (hits - 30) * 200, // add 200ms delay per request after hit 30
  maxDelayMs: 5000,    // max delay 5 seconds
});

// Middleware
app.use(ipBlacklist);
app.use(speedLimiter);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Prevent NoSQL injection (Express 5-safe: do not assign to req.query)
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
  // req.query is a getter in Express 5; mutate returned object only.
  sanitizeMongoKeysInPlace(req.query);
  next();
});

// Prevent HTTP Parameter Pollution (Express 5-safe: do not assign to req.query)
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
      return res.status(400).json({ message: "Duplicate query parameters are not allowed." });
    }
    seen.add(decodedKey);
  }

  next();
});
app.use(globalRateLimiter);


// CORS configuration - chỉ cho phép các origin đã đăng ký
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:8081", // Expo dev server
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
// Global body size limit: 2MB (đủ cho JSON thông thường)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health check endpoint (cho Fly.io và monitoring)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Swagger
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "SmartAttendance API Documentation",
  })
);

// REGISTER ROUTES
app.use("/api/auth", authRateLimiter);
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
// Face routes cần body lớn hơn (ảnh base64, tối đa 10MB)
app.use("/api/face", express.json({ limit: "10mb" }), express.urlencoded({ extended: true, limit: "10mb" }), faceRouter);
app.use("/api/logs", logRouter);

// 404 fallback — must be registered BEFORE the error handler so unmatched
// routes get a clear 404 instead of falling through to the error handler.
app.use((_req, res, _next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler (Express 5 requires all 4 parameters to recognise this
// as an error-handling middleware).
app.use((err, _req, res, _next) => {
  // If headers were already sent (e.g. streaming response), delegate to the
  // default Express error handler to close the connection properly.
  if (res.headersSent) {
    return _next(err);
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
});

// Server start
const PORT = process.env.PORT || 4000;
// Use 0.0.0.0 as default host in production so Fly machines/proxy can reach the app.
// Keep allowing override via process.env.HOST for deployments (e.g., Fly.io).
// For local development, default to localhost for cleaner logs.
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');

async function start() {
  try {
    // Validate required environment variables
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI environment variable is required");
      process.exit(1);
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET environment variable is required");
      process.exit(1);
    }

    // Check RAG chatbot configuration (migrated from old Gemini chatbot)
    console.log("ℹ️ Chatbot functionality migrated to RAG system (ai-service)");
    console.log("ℹ️ RAG endpoints available at: http://localhost:8001/rag/*");

    console.log("🔄 Connecting to database...");
    await connectDatabase();
    console.log("✅ Database connected successfully");

    const server = app.listen(PORT, HOST, () => {
      // For logging, show localhost when HOST is 0.0.0.0 (bind address)
      const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
      const serverUrl = `http://${displayHost}:${PORT}`;
      const docsUrl = `${serverUrl}/api/docs`;

      // Server startup info (chỉ trong development)
      if (process.env.NODE_ENV !== 'production') {
        console.log("\n🚀 ========================================");
        console.log(`✅ Server đang chạy tại: ${serverUrl}`);
        console.log(`📚 API Documentation: ${docsUrl}`);
        console.log("🚀 ========================================\n");
      } else {
        // Production logging
        console.log(`✅ Server listening on ${HOST}:${PORT}`);
        console.log(`✅ Health check available at /api/health`);
      }

      // Khởi động cron jobs
      try {
        startCronJobs();
      } catch (cronError) {
        console.error("⚠️ Failed to start cron jobs:", cronError);
        // Don't exit - cron jobs are not critical for server startup
      }
    });

    // Initialize Socket.io
    try {
      const { initializeSocket } = await import("./config/socket.js");
      initializeSocket(server);

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Socket.io server ready');
      } else {
        console.log('✅ Socket.io initialized');
      }
    } catch (socketError) {
      console.error("⚠️ Failed to initialize Socket.io:", socketError);
      // Don't exit - Socket.io is not critical for basic API functionality
    }

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("Error details:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

start();
