import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

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
import { startCronJobs } from "./jobs/attendance.job.js";


import { logRouter } from "./modules/logs/log.router.js";

dotenv.config();

const app = express(
  cors({
    origin: "*",
  })
);

// Middleware
app.use(cors());
app.use(cors(
  {
    origin: "*",
  }
));
// Tăng body size limit để nhận ảnh base64 (tối đa 10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/api/logs", logRouter);

// Error handler
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Server start
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for Fly.io

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

    console.log("🔄 Connecting to database...");
    await connectDatabase();
    console.log("✅ Database connected successfully");

    const server = app.listen(PORT, HOST, () => {
      const serverUrl = `http://${HOST}:${PORT}`;
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
