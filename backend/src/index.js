import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

import { connectDatabase } from "./config/database.js";
import { swaggerSpec } from "./config/swagger.js";
import { authRouter } from "./modules/auth/auth.router.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "SmartAttendance API Documentation"
}));


app.use("/api/auth", authRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});


app.use((req, res) => {
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
            console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
            console.log("🚀 ========================================\n");

        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

start();
