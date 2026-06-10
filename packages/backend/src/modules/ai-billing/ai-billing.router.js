import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import { requireFeatureEnabled } from "../../middleware/featureToggle.middleware.js";
import {
  getUsage,
  listInvoices,
  getInvoice,
  getAdminCompaniesUsage,
  generateInvoices,
  confirmInvoice,
  payInvoice,
  handleAiWebhook,
} from "./ai-billing.controller.js";

export const aiBillingRouter = Router();

// ── ADMIN (own company) ───────────────────────────────────────────────────────
aiBillingRouter.get("/usage",                    authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]), requireFeatureEnabled("chatbot"), getUsage);
aiBillingRouter.get("/invoices",                 authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]), requireFeatureEnabled("chatbot"), listInvoices);
aiBillingRouter.get("/invoices/:invoiceCode",    authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]), requireFeatureEnabled("chatbot"), getInvoice);
aiBillingRouter.post("/invoices/:invoiceCode/pay", authMiddleware, requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), requireFeatureEnabled("chatbot"), payInvoice);

// ── SUPER_ADMIN ───────────────────────────────────────────────────────────────
aiBillingRouter.get("/admin/companies",            authMiddleware, requireRole([ROLES.SUPER_ADMIN]), getAdminCompaniesUsage);
aiBillingRouter.post("/admin/invoices/generate",   authMiddleware, requireRole([ROLES.SUPER_ADMIN]), generateInvoices);
aiBillingRouter.put("/admin/invoices/:id/confirm", authMiddleware, requireRole([ROLES.SUPER_ADMIN]), confirmInvoice);

// ── PayOS webhook (no auth) ───────────────────────────────────────────────────
const webhookLimiter = process.env.NODE_ENV === "test"
  ? (_req, _res, next) => next()
  : rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });

aiBillingRouter.post("/webhook/payos", webhookLimiter, handleAiWebhook);
