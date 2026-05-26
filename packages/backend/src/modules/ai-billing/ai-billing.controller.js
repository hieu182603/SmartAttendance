import mongoose from "mongoose";
import {
  getUsageForCompany,
  getInvoicesForCompany,
  getInvoiceByCode,
  getAllCompaniesUsage,
  createInvoiceForCompany,
} from "./ai-billing.service.js";
import { AiInvoiceModel } from "./aiInvoice.model.js";
import { aiUsageQuerySchema, generateInvoiceSchema } from "@smartattendance/shared";
import { createPaymentLink } from "../billing/billing.service.js";
import { verifyPayOSSignature } from "../../utils/payos.util.js";
import { sendAiPaymentConfirmationEmail } from "../../utils/email.util.js";
import { CompanyModel } from "../company/company.model.js";
import { UserModel } from "../users/user.model.js";
import { resolveFrontendBaseUrl } from "../../config/allowed-origins.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function periodBounds(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

// ── ADMIN endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/ai-billing/usage?month=&year=
 * ADMIN: own company usage
 */
export async function getUsage(req, res) {
  try {
    const parsed = aiUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message });
    }
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const data = await getUsageForCompany(companyId, parsed.data);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/ai-billing/invoices?page=&limit=
 * ADMIN: own company invoices list
 */
export async function listInvoices(req, res) {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const data = await getInvoicesForCompany(companyId, { page, limit });
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/ai-billing/invoices/:invoiceCode
 * ADMIN: own company invoice detail
 */
export async function getInvoice(req, res) {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const invoice = await getInvoiceByCode(req.params.invoiceCode, companyId);
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    return res.json({ success: true, data: invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── SUPER_ADMIN endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/ai-billing/admin/companies?month=&year=
 * SUPER_ADMIN: usage summary for all companies
 */
export async function getAdminCompaniesUsage(req, res) {
  try {
    const parsed = aiUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message });
    }
    const data = await getAllCompaniesUsage(parsed.data);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/ai-billing/admin/invoices/generate
 * SUPER_ADMIN: generate invoices for a period
 * Body: { periodMonth, periodYear, companyId? }
 */
export async function generateInvoices(req, res) {
  try {
    const parsed = generateInvoiceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message });
    }
    const { periodMonth, periodYear, companyId } = parsed.data;
    const { start, end } = periodBounds(periodMonth, periodYear);

    if (companyId) {
      const invoice = await createInvoiceForCompany(
        new mongoose.Types.ObjectId(companyId), start, end
      );
      return res.json({ success: true, created: invoice ? 1 : 0, invoices: invoice ? [invoice] : [] });
    }

    // Generate for all companies that have events in the period
    const { AiUsageEventModel } = await import("./aiUsageEvent.model.js");
    const companyIds = await AiUsageEventModel.distinct("companyId", {
      createdAt: { $gte: start, $lte: end },
    });

    const results = await Promise.allSettled(
      companyIds.map((cid) => createInvoiceForCompany(cid, start, end))
    );

    const created = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return res.json({ success: true, created, total: companyIds.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/ai-billing/admin/invoices/:id/confirm
 * SUPER_ADMIN: manually mark invoice as paid
 */
export async function confirmInvoice(req, res) {
  try {
    const invoice = await AiInvoiceModel.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    if (invoice.status === "paid") {
      return res.json({ success: true, message: "Hóa đơn đã được thanh toán trước đó", data: invoice });
    }
    invoice.status = "paid";
    invoice.paidAt = new Date();
    invoice.processedBy = req.user.userId;
    await invoice.save();
    await sendAiConfirmationEmailOnce(invoice);
    return res.json({ success: true, data: invoice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function sendAiConfirmationEmailOnce(invoice) {
  const fresh = await AiInvoiceModel.findById(invoice._id)
    .select("confirmationEmailSent companyId amountVnd invoiceCode periodStart")
    .lean();
  if (fresh?.confirmationEmailSent) return;

  const company = await CompanyModel.findById(fresh.companyId).select("name email").lean();
  let to = company?.email;
  let name = "Quản trị viên";
  if (!to) {
    const admin = await UserModel.findOne({
      companyId: fresh.companyId,
      role: { $in: ["ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    }).select("email name").lean();
    to = admin?.email;
    name = admin?.name ?? "Quản trị viên";
  }
  if (!to) return;

  const d = fresh.periodStart ? new Date(fresh.periodStart) : new Date();
  const periodLabel = `T${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  await sendAiPaymentConfirmationEmail({
    to,
    name,
    companyName: company?.name ?? "Công ty",
    periodLabel,
    amountVnd: fresh.amountVnd,
    invoiceCode: fresh.invoiceCode,
  });
  await AiInvoiceModel.findByIdAndUpdate(invoice._id, { confirmationEmailSent: true });
}

// ── Payment endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/ai-billing/invoices/:invoiceCode/pay
 * ADMIN (own company): create PayOS payment link for an AI invoice
 */
export async function payInvoice(req, res) {
  try {
    const companyId = new mongoose.Types.ObjectId(req.user.companyId);
    const invoice = await AiInvoiceModel.findOne({
      invoiceCode: Number(req.params.invoiceCode),
      companyId,
    });
    if (!invoice) return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn" });
    if (!["issued", "overdue"].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: `Hóa đơn đang ở trạng thái "${invoice.status}", không thể thanh toán` });
    }

    const frontendUrl = resolveFrontendBaseUrl(req.headers.origin);
    if (!frontendUrl) {
      return res.status(500).json({ success: false, message: "FRONTEND_URL chưa được cấu hình" });
    }
    const code = invoice.invoiceCode;
    const d = invoice.periodStart ? new Date(invoice.periodStart) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    const payosResult = await createPaymentLink({
      orderCode: code,
      amount: invoice.amountVnd,
      description: `Chi phi AI T${mm}/${yyyy}`.slice(0, 25),
      returnUrl: `${frontendUrl}/payment/ai-return?payment=success&invoiceCode=${code}`,
      cancelUrl: `${frontendUrl}/payment/ai-return?payment=cancel&invoiceCode=${code}`,
    });

    invoice.payosPaymentLinkId = payosResult.paymentLinkId;
    invoice.checkoutUrl = payosResult.checkoutUrl;
    await invoice.save();

    return res.json({ success: true, checkoutUrl: payosResult.checkoutUrl, invoiceCode: code });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/ai-billing/webhook/payos
 * No auth — verified by HMAC signature
 */
export async function handleAiWebhook(req, res) {
  try {
    const { data, signature } = req.body ?? {};
    if (!data || !signature) return res.status(400).json({ success: false });

    const isValid = verifyPayOSSignature(data, signature, process.env.PAYOS_CHECKSUM_KEY);
    if (!isValid) return res.status(400).json({ success: false, message: "Invalid signature" });

    const { orderCode } = data;
    const invoice = await AiInvoiceModel.findOne({ invoiceCode: Number(orderCode) });
    if (!invoice) return res.json({ success: true }); // ignore unknown codes

    if (["issued", "overdue"].includes(invoice.status)) {
      invoice.status = "paid";
      invoice.paidAt = new Date();
      await invoice.save();
      await sendAiConfirmationEmailOnce(invoice);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[ai-billing webhook]", err.message);
    return res.status(500).json({ success: false });
  }
}
