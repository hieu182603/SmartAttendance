import { createPaymentLink, cancelPaymentLink } from "./billing.service.js";
import { OrderModel } from "./order.model.js";
import { CompanyModel } from "../company/company.model.js";
import { UserModel } from "../users/user.model.js";
import { verifyPayOSSignature } from "../../utils/payos.util.js";
import { sendPaymentConfirmationEmail } from "../../utils/email.util.js";
import { PLAN_CONFIG, createUpgradePaymentSchema, createManualOrderSchema } from "@smartattendance/shared";
import { resolveFrontendBaseUrl } from "../../config/allowed-origins.js";

async function applyPaidOrderFulfillment(order) {
  const planCfg = PLAN_CONFIG[order.plan];
  if (!planCfg) return;
  const companyUpdate = { plan: order.plan, maxUsers: planCfg.maxUsers };
  if (order.companyName?.trim()) companyUpdate.name = order.companyName.trim();
  await CompanyModel.findByIdAndUpdate(order.companyId, companyUpdate);
  await UserModel.updateMany(
    { companyId: order.companyId, isTrial: true },
    { isTrial: false, trialConvertedAt: new Date() }
  );
}

async function sendOrderConfirmationEmailOnce(order, orderCode) {
  const fresh = await OrderModel.findById(order._id)
    .select("confirmationEmailSent customerEmail customerName plan billingCycle amount")
    .lean();
  if (!fresh?.confirmationEmailSent) {
    let to = fresh?.customerEmail?.trim();
    let name = fresh?.customerName?.trim() || "Khách hàng";
    if (!to) {
      const admin = await UserModel.findOne({
        companyId: order.companyId,
        role: { $in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
      })
        .select("email name")
        .lean();
      to = admin?.email;
      name = admin?.name ?? "Admin";
    }
    if (to) {
      await sendPaymentConfirmationEmail({
        to,
        name,
        plan: fresh.plan,
        billingCycle: fresh.billingCycle,
        amount: fresh.amount,
        orderCode,
      });
      await OrderModel.findByIdAndUpdate(order._id, { confirmationEmailSent: true });
    }
  }
}

/**
 * POST /api/billing/upgrade
 * Body: { plan: "starter"|"standard"|"premium", billingCycle: "monthly"|"yearly" }
 * Auth: ADMIN, SUPER_ADMIN, or trial user
 */
export async function createUpgradePayment(req, res) {
  try {
    const parsed = createUpgradePaymentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      return res.status(400).json({ success: false, message: msg });
    }
    const {
      plan,
      billingCycle,
      companyName,
      employeeCount,
      customerName,
      customerEmail,
      customerPhone,
      billingMonths,
      notes,
    } = parsed.data;

    const role = req.user?.userContext?.role;
    const isTrial = req.user?.isTrial === true;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role) && !isTrial) {
      return res.status(403).json({ success: false, message: "Chỉ Admin hoặc tài khoản dùng thử mới có thể nâng cấp gói" });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Không xác định được công ty — vui lòng liên hệ admin" });
    }

    const planCfg = PLAN_CONFIG[plan];
    const months = billingCycle === "yearly" ? 12 : billingMonths;
    const amount =
      billingCycle === "yearly" ? planCfg.yearly : planCfg.monthly * months;

    // Supersede stale checkout links — only one active pending order per company
    await OrderModel.updateMany(
      { companyId, status: "pending" },
      { status: "cancelled" }
    );

    // unique per-ms with random suffix to avoid collisions under concurrent requests
    const orderCode = Date.now() * 10 + Math.floor(Math.random() * 10);
    const description = `${plan}-${billingCycle}`.slice(0, 25);
    const frontendUrl = resolveFrontendBaseUrl(req.headers.origin);
    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL chưa được cấu hình — không thể tạo link thanh toán",
      });
    }
    const returnUrl = `${frontendUrl}/payment/return?payment=success&orderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/payment/return?payment=cancelled`;

    const order = await OrderModel.create({
      orderCode,
      companyId,
      plan,
      billingCycle,
      amount,
      companyName,
      employeeCount,
      billingMonths: months,
      customerName,
      customerEmail,
      customerPhone,
      notes: notes || undefined,
    });

    let payosResult;
    try {
      payosResult = await createPaymentLink({
        orderCode,
        amount,
        description,
        returnUrl,
        cancelUrl,
        buyerName: customerName,
        buyerEmail: customerEmail,
        buyerPhone: customerPhone,
      });
    } catch (payosErr) {
      await OrderModel.findByIdAndUpdate(order._id, { status: "cancelled" });
      throw payosErr;
    }

    await OrderModel.findByIdAndUpdate(order._id, { payosPaymentLinkId: payosResult.paymentLinkId });

    return res.status(201).json({
      success: true,
      data: {
        checkoutUrl: payosResult.checkoutUrl,
        qrCode: payosResult.qrCode,
        orderCode,
      },
    });
  } catch (err) {
    console.error("[payOS] createUpgradePayment:", err.message);
    return res.status(502).json({ success: false, message: err.message, code: err.code });
  }
}

/**
 * GET /api/billing/payments/:orderCode
 * Returns our DB order status — no external PayOS call needed for polling.
 */
export async function getPayment(req, res) {
  try {
    const { orderCode } = req.params;
    const order = await OrderModel.findOne({ orderCode: Number(orderCode) }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: "Không tìm thấy đơn hàng" });
    }
    if (order.companyId.toString() !== req.user?.companyId?.toString()) {
      return res.status(403).json({ success: false, error: "Không có quyền xem đơn hàng này" });
    }
    return res.json({ success: true, data: { status: order.status, orderCode: order.orderCode, amount: order.amount } });
  } catch (err) {
    console.error("[payOS] getPayment:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/billing/webhook
 * Called by PayOS when a payment status changes.
 * No auth middleware — signature verification is the guard.
 */
export async function handleWebhook(req, res) {
  try {
    const { code, data, signature } = req.body ?? {};
    if (!data || !signature) {
      return res.status(400).json({ success: false, message: "Missing data or signature" });
    }

    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (!checksumKey) {
      console.error("[payOS webhook] PAYOS_CHECKSUM_KEY not configured");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    if (!verifyPayOSSignature(data, signature, checksumKey)) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // PayOS uses root-level code "00" for success
    if (code !== "00") {
      return res.status(200).json({ success: true, message: "Non-success event acknowledged" });
    }

    const orderCode = Number(data.orderCode);
    const order = await OrderModel.findOne({ orderCode });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Terminal states — never re-process
    if (order.status === "cancelled" || order.status === "failed") {
      return res.status(200).json({ success: true, message: "Terminal state — skipped" });
    }

    if (order.status === "pending") {
      // Verify amount integrity
      if (Number(data.amount) !== order.amount) {
        console.error(`[payOS] webhook: amount mismatch orderCode=${orderCode} expected=${order.amount} got=${data.amount}`);
        await OrderModel.findByIdAndUpdate(order._id, { status: "failed" });
        return res.status(200).json({ success: true, message: "Amount mismatch — marked failed" });
      }
      // Idempotent claim
      const claimed = await OrderModel.findOneAndUpdate(
        { _id: order._id, status: "pending" },
        { status: "paid", paidAt: new Date() },
        { new: false }
      );
      if (!claimed) return res.status(200).json({ success: true, message: "Concurrent update — skipped" });
    }

    await applyPaidOrderFulfillment(order);
    await sendOrderConfirmationEmailOnce(order, orderCode);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[payOS webhook] error:", err.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
}

// ── Super Admin endpoints ────────────────────────────────────────────────────

/**
 * GET /api/billing/admin/orders
 * Query: status, plan, page, limit
 */
export async function getAdminOrders(req, res) {
  try {
    const { status, plan, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .populate({ path: "companyId", select: "name", strictPopulate: false })
        .populate({ path: "processedBy", select: "name email", strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      OrderModel.countDocuments(filter),
    ]);
    return res.json({ success: true, data: { orders, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    console.error("[billing] getAdminOrders:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/billing/admin/orders/:id
 */
export async function getAdminOrderById(req, res) {
  try {
    const order = await OrderModel.findById(req.params.id)
      .populate("companyId", "name email")
      .populate("processedBy", "name email")
      .lean();
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    return res.json({ success: true, data: order });
  } catch (err) {
    console.error("[billing] getAdminOrderById:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/billing/admin/orders/:id/confirm
 * Xác nhận thanh toán thủ công → kích hoạt gói cho company
 */
export async function confirmPayment(req, res) {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    if (order.status === "paid") return res.status(400).json({ success: false, message: "Đơn hàng đã được xác nhận" });

    order.status = "paid";
    order.paidAt = new Date();
    order.processedBy = req.user?.userId;
    order.processedAt = new Date();
    await order.save();

    await applyPaidOrderFulfillment(order);
    await sendOrderConfirmationEmailOnce(order, order.orderCode);

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error("[billing] confirmPayment:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/billing/admin/orders/:id/reject
 * Body: { reason? }
 */
export async function rejectOrder(req, res) {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    if (order.status !== "pending") return res.status(400).json({ success: false, message: "Chỉ từ chối được đơn đang chờ xử lý" });

    order.status = "failed";
    order.notes = req.body?.reason || order.notes;
    order.processedBy = req.user?.userId;
    order.processedAt = new Date();
    await order.save();

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error("[billing] rejectOrder:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveCompanyByName(companyName) {
  const trimmed = companyName.trim();
  const exactFilter = { name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } };
  const exactMatches = await CompanyModel.find(exactFilter).limit(5).lean();
  if (exactMatches.length === 1) return { company: exactMatches[0] };
  if (exactMatches.length > 1) {
    return {
      error: "ambiguous",
      message: `Có ${exactMatches.length} công ty trùng tên "${trimmed}" — nhập tên đầy đủ và chính xác hơn`,
    };
  }

  const partialMatches = await CompanyModel.find({
    name: { $regex: escapeRegex(trimmed), $options: "i" },
  })
    .sort({ name: 1 })
    .limit(5)
    .lean();
  if (partialMatches.length === 1) return { company: partialMatches[0] };
  if (partialMatches.length > 1) {
    return {
      error: "ambiguous",
      message: `Tìm thấy ${partialMatches.length} công ty — nhập tên chính xác hơn (VD: ${partialMatches[0].name})`,
    };
  }
  return { error: "not_found", message: `Không tìm thấy công ty "${trimmed}"` };
}

/**
 * POST /api/billing/admin/orders
 * Tạo đơn thủ công và kích hoạt gói ngay
 * Body: { companyName, plan, billingCycle, notes?, customerEmail?, customerPhone? }
 */
export async function createManualOrder(req, res) {
  try {
    const parsed = createManualOrderSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ";
      return res.status(400).json({ success: false, message: msg });
    }
    const { companyName, plan, billingCycle, notes, customerEmail, customerPhone } = parsed.data;

    const resolved = await resolveCompanyByName(companyName);
    if (resolved.error) {
      const status = resolved.error === "not_found" ? 404 : 409;
      return res.status(status).json({ success: false, message: resolved.message });
    }
    const companyId = resolved.company._id;

    const planCfg = PLAN_CONFIG[plan];
    if (!planCfg) return res.status(400).json({ success: false, message: "Gói không hợp lệ" });
    const amount = planCfg[billingCycle];
    if (!amount) return res.status(400).json({ success: false, message: "billingCycle không hợp lệ" });

    const orderCode = Date.now() * 10 + Math.floor(Math.random() * 10);
    const order = await OrderModel.create({
      orderCode,
      companyId,
      plan,
      billingCycle,
      amount,
      status: "paid",
      paymentMethod: "manual",
      paidAt: new Date(),
      processedBy: req.user?.userId,
      processedAt: new Date(),
      notes,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      confirmationEmailSent: false,
    });

    await applyPaidOrderFulfillment(order);
    await sendOrderConfirmationEmailOnce(order, orderCode);

    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error("[billing] createManualOrder:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/billing/admin/stats
 * Thống kê doanh thu theo tháng + theo gói
 */
export async function getAdminStats(req, res) {
  try {
    const [totalRevenue, pendingCount, monthlyStats, planStats] = await Promise.all([
      OrderModel.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      OrderModel.countDocuments({ status: "pending" }),
      OrderModel.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: { year: { $year: "$paidAt" }, month: { $month: "$paidAt" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
      OrderModel.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: "$plan", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = await OrderModel.countDocuments({ status: "paid", paidAt: { $gte: startOfMonth } });

    return res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total ?? 0,
        pendingCount,
        monthCount,
        monthlyStats,
        planStats,
      },
    });
  } catch (err) {
    console.error("[billing] getAdminStats:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Standard endpoints ───────────────────────────────────────────────────────

/**
 * POST /api/billing/payments/:orderCode/cancel
 * Body: { reason? }
 */
export async function cancelPayment(req, res) {
  try {
    const { orderCode } = req.params;
    const { reason } = req.body;
    const order = await OrderModel.findOne({ orderCode: Number(orderCode) }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: "Không tìm thấy đơn hàng" });
    }
    if (order.companyId.toString() !== req.user?.companyId?.toString()) {
      return res.status(403).json({ success: false, error: "Không có quyền hủy đơn hàng này" });
    }
    const result = await cancelPaymentLink(orderCode, reason);
    if (order.status === "pending") {
      await OrderModel.findOneAndUpdate(
        { orderCode: Number(orderCode), status: "pending" },
        { status: "cancelled" }
      );
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[payOS] cancelPayment:", err.message);
    return res.status(502).json({ success: false, error: err.message, code: err.code });
  }
}
