import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import { authRouter } from "./modules/auth/auth.router.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerSpec = swaggerJSDoc({
    definition: {
        openapi: "3.0.0",
        info: { title: "SmartAttendance API", version: "0.1.0" }
    },
    apis: ["./src/**/*.router.js", "./src/**/*.controller.js"],
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartattendance";

async function start() {
    try {
        await mongoose.connect(MONGO_URI);
        app.listen(PORT, () => console.log(`API listening on :${PORT}`));
    } catch (err) {
        console.error("Failed to start server", err);
        process.exit(1);
    }
}

start();


