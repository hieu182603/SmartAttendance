import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import {
  getPayment, cancelPayment, createUpgradePayment, handleWebhook,
  getAdminOrders, getAdminOrderById, confirmPayment, rejectOrder, createManualOrder, getAdminStats,
} from "./billing.controller.js";

export const billingRouter = Router();

// ── Super Admin endpoints ────────────────────────────────────────────────────
billingRouter.get("/admin/stats", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAdminStats);
billingRouter.get("/admin/orders", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAdminOrders);
billingRouter.get("/admin/orders/:id", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAdminOrderById);
billingRouter.put("/admin/orders/:id/confirm", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), confirmPayment);
billingRouter.put("/admin/orders/:id/reject", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), rejectOrder);
billingRouter.post("/admin/orders", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), createManualOrder);

// ── Payment endpoints (authenticated) ───────────────────────────────────────
billingRouter.post("/upgrade", authMiddleware, createUpgradePayment);

// GET /payments/:orderCode: any auth'd user can poll their own order status (companyId check in controller)
billingRouter.get("/payments/:orderCode", authMiddleware, getPayment);

// Cancel: write operation — admins only
billingRouter.post("/payments/:orderCode/cancel", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), cancelPayment);

const payosWebhookLimiter =
  process.env.NODE_ENV === "test"
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
      });

// ── payOS webhook (no auth — signature verification is the guard) ────────────
billingRouter.post("/webhook/payos", payosWebhookLimiter, handleWebhook);
