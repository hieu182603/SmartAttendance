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

dotenv.config();

const app = express(
  cors({
    origin: "*",
  })
);

// Middleware
app.use(cors(
  {
    origin: "*",
  }
));
// Tăng body size limit để nhận ảnh base64 (tối đa 10MB)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Swagger API Documentation
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "SmartAttendance API Documentation",
  })
);

app.use("/api/auth", authRouter);
app.use("/api/leave", leaveRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/requests", requestRouter);
app.use("/api/users", userRouter);
app.use("/api/dashboard", dashboardRouter);

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Kết nối database
    await connectDatabase();

    // Khởi động server
    app.listen(PORT, () => {
      const serverUrl = `http://localhost:${PORT}`;
      const docsUrl = `${serverUrl}/api/docs`;

      console.log("\n🚀 ========================================");
      console.log(`✅ Server đang chạy tại: ${serverUrl}`);
      console.log(`📚 API Documentation: ${docsUrl}`);
      console.log("🚀 ========================================\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
