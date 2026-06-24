// Load environment variables FIRST — must be the very first import.
// ES modules hoist all imports, so dotenv.config() in this file would run
// AFTER all other imports resolve. Isolating it in env.js ensures .env
// is loaded before any module reads process.env.
import "./config/env.js";

import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { logRedisStartupStatus } from "./config/redis.js";
import { startCronJobs } from "./jobs/attendance.job.js";
import { startAiInvoiceCron } from "./jobs/ai-invoice.job.js";

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

    console.log("🔄 Kiểm tra Redis...");
    const redisStatus = await logRedisStartupStatus();
    if (redisStatus.enabled && !redisStatus.connected) {
      console.warn(
        "⚠️ Redis không phản hồi — phiên refresh dùng JWT-only tạm thời (xem [redis] ở trên)",
      );
    }

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
        startAiInvoiceCron();
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
