import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { getPayment, cancelPayment, createUpgradePayment, handleWebhook } from "./billing.controller.js";

export const billingRouter = Router();

// ── Payment endpoints (authenticated) ───────────────────────────────────────
billingRouter.post("/upgrade", authMiddleware, createUpgradePayment);

// GET /payments/:orderCode: any auth'd user can poll their own order status (companyId check in controller)
billingRouter.get("/payments/:orderCode", authMiddleware, getPayment);

// Cancel: write operation — admins only
billingRouter.post("/payments/:orderCode/cancel", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), cancelPayment);

// ── payOS webhook (no auth — signature verification is the guard) ────────────
billingRouter.post("/webhook/payos", handleWebhook);
