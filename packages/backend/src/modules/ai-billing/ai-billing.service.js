import { AiUsageEventModel } from "./aiUsageEvent.model.js";
import { AiInvoiceModel, generateInvoiceCode } from "./aiInvoice.model.js";
import { CompanyModel } from "../company/company.model.js";
import { UserModel } from "../users/user.model.js";
import { sendAiServiceInvoiceEmail } from "../../utils/email.util.js";

function periodBounds(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * Get daily aggregate usage for one company in a given month.
 */
export async function getUsageForCompany(companyId, { month, year } = {}) {
  const { month: m, year: y } = { ...currentPeriod(), month, year };
  const { start, end } = periodBounds(m, y);

  const [totals, daily] = await Promise.all([
    AiUsageEventModel.aggregate([
      { $match: { companyId: companyId instanceof Object ? companyId : new Object(companyId), createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          totalCostVnd: { $sum: "$estimatedCostVnd" },
          totalCostUsd: { $sum: "$estimatedCostUsd" },
          eventCount: { $sum: 1 },
        },
      },
    ]),
    AiUsageEventModel.aggregate([
      { $match: { companyId: companyId instanceof Object ? companyId : new Object(companyId), createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Ho_Chi_Minh" } },
          tokens: { $sum: "$totalTokens" },
          costVnd: { $sum: "$estimatedCostVnd" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", tokens: 1, costVnd: 1, _id: 0 } },
    ]),
  ]);

  return {
    period: { month: m, year: y },
    totalTokens: totals[0]?.totalTokens ?? 0,
    totalCostVnd: totals[0]?.totalCostVnd ?? 0,
    totalCostUsd: totals[0]?.totalCostUsd ?? 0,
    eventCount: totals[0]?.eventCount ?? 0,
    daily,
  };
}

/**
 * Aggregate token usage and cost for a period — used before creating invoice.
 */
export async function aggregatePeriod(companyId, periodStart, periodEnd) {
  const pipeline = [
    { $match: { companyId, createdAt: { $gte: periodStart, $lte: periodEnd } } },
    {
      $group: {
        _id: "$operation",
        tokens: { $sum: "$totalTokens" },
        costVnd: { $sum: "$estimatedCostVnd" },
      },
    },
    { $project: { operation: "$_id", tokens: 1, costVnd: 1, _id: 0 } },
  ];

  const breakdown = await AiUsageEventModel.aggregate(pipeline);
  const totalTokens = breakdown.reduce((s, r) => s + r.tokens, 0);
  const amountVnd = breakdown.reduce((s, r) => s + r.costVnd, 0);

  return { totalTokens, breakdown, amountVnd };
}

/**
 * Create invoice for one company for a period.
 * Skips if invoice already exists (unique index on companyId + periodStart).
 */
export async function createInvoiceForCompany(companyId, periodStart, periodEnd) {
  const existing = await AiInvoiceModel.findOne({ companyId, periodStart });
  if (existing) return existing;

  const { totalTokens, breakdown, amountVnd } = await aggregatePeriod(companyId, periodStart, periodEnd);

  // Skip creating zero-cost invoices
  if (amountVnd === 0 && totalTokens === 0) return null;

  const invoiceCode = generateInvoiceCode();
  return AiInvoiceModel.create({
    invoiceCode,
    companyId,
    periodStart,
    periodEnd,
    totalTokens,
    breakdown,
    amountVnd,
  });
}

/**
 * List invoices for a single company with pagination.
 */
export async function getInvoicesForCompany(companyId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AiInvoiceModel.find({ companyId }).sort({ periodStart: -1 }).skip(skip).limit(limit).lean(),
    AiInvoiceModel.countDocuments({ companyId }),
  ]);
  return { items, total, page, limit };
}

/**
 * Get one invoice by invoiceCode, optionally verifying companyId ownership.
 */
export async function getInvoiceByCode(invoiceCode, companyId = null) {
  const query = { invoiceCode: Number(invoiceCode) };
  if (companyId) query.companyId = companyId;
  return AiInvoiceModel.findOne(query).populate("companyId", "name email").lean();
}

/**
 * SUPER_ADMIN: get usage summary per company for a given month.
 */
export async function getAllCompaniesUsage({ month, year } = {}) {
  const { month: m, year: y } = { ...currentPeriod(), month, year };
  const { start, end } = periodBounds(m, y);

  return AiUsageEventModel.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: "$companyId",
        totalTokens: { $sum: "$totalTokens" },
        totalCostVnd: { $sum: "$estimatedCostVnd" },
        eventCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "_id",
        as: "company",
      },
    },
    { $unwind: { path: "$company", preserveNullAndEmpty: true } },
    {
      $project: {
        companyId: "$_id",
        companyName: "$company.name",
        totalTokens: 1,
        totalCostVnd: 1,
        eventCount: 1,
        _id: 0,
      },
    },
    { $sort: { totalCostVnd: -1 } },
  ]);
}

/**
 * Issue monthly invoices for a billing period.
 * Finds all companies with usage events, creates/skips invoices, sends invoice email once.
 */
export async function issueMonthlyInvoicesForPeriod(periodStart, periodEnd) {
  const dueDays = parseInt(process.env.AI_INVOICE_DUE_DAYS ?? "15", 10);
  const companyIds = await AiUsageEventModel.distinct("companyId", {
    createdAt: { $gte: periodStart, $lte: periodEnd },
  });

  const periodLabel = `T${String(periodStart.getMonth() + 1).padStart(2, "0")}/${periodStart.getFullYear()}`;

  let issued = 0;
  for (const companyId of companyIds) {
    try {
      let invoice = await createInvoiceForCompany(companyId, periodStart, periodEnd);
      if (!invoice) continue;

      // Refresh from DB (may already exist with issued status)
      invoice = await AiInvoiceModel.findById(invoice._id);

      // Transition to issued
      if (invoice.status === "draft") {
        const now = new Date();
        invoice.status = "issued";
        invoice.issuedAt = now;
        invoice.dueAt = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
        await invoice.save();
      }

      // Send invoice email once
      if (!invoice.invoiceEmailSent) {
        const company = await CompanyModel.findById(companyId).select("name email").lean();
        let to = company?.email;
        let name = "Quản trị viên";

        if (!to) {
          const admin = await UserModel.findOne({
            companyId,
            role: { $in: ["ADMIN", "SUPER_ADMIN"] },
            isActive: true,
          }).select("email name").lean();
          to = admin?.email;
          name = admin?.name ?? "Quản trị viên";
        }

        if (to) {
          await sendAiServiceInvoiceEmail({
            to,
            name,
            companyName: company?.name ?? "Công ty của bạn",
            periodLabel,
            totalTokens: invoice.totalTokens,
            amountVnd: invoice.amountVnd,
            invoiceCode: invoice.invoiceCode,
            dueAt: invoice.dueAt,
            payUrl: null,
          });
          await AiInvoiceModel.findByIdAndUpdate(invoice._id, { invoiceEmailSent: true });
        }
      }
      issued++;
    } catch (err) {
      console.error(`[ai-billing] Failed to issue invoice for company ${companyId}:`, err.message);
    }
  }

  return { issued, total: companyIds.length };
}
