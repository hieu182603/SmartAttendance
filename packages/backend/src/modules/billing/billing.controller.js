import { createPaymentLink, cancelPaymentLink } from "./billing.service.js";
import { OrderModel } from "./order.model.js";
import { CompanyModel } from "../company/company.model.js";
import { UserModel } from "../users/user.model.js";
import { verifyPayOSSignature } from "../../utils/payos.util.js";
import { sendPaymentConfirmationEmail } from "../../utils/email.util.js";
import { PLAN_CONFIG, createUpgradePaymentSchema } from "@smartattendance/shared";

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
    const { plan, billingCycle } = parsed.data;

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
    const amount = planCfg[billingCycle];

    // Supersede stale checkout links — only one active pending order per company
    await OrderModel.updateMany(
      { companyId, status: "pending" },
      { status: "cancelled" }
    );

    // unique per-ms with random suffix to avoid collisions under concurrent requests
    const orderCode = Date.now() * 10 + Math.floor(Math.random() * 10);
    const description = `${plan}-${billingCycle}`.slice(0, 25);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl = `${frontendUrl}/employee/upgrade?payment=success&orderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/employee/upgrade?payment=cancelled`;

    const order = await OrderModel.create({ orderCode, companyId, plan, billingCycle, amount });

    let payosResult;
    try {
      payosResult = await createPaymentLink({ orderCode, amount, description, returnUrl, cancelUrl });
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

    // Idempotent fulfillment (also runs on retry when already "paid")
    const planCfg = PLAN_CONFIG[order.plan];
    if (planCfg) {
      await CompanyModel.findByIdAndUpdate(order.companyId, {
        plan: order.plan,
        maxUsers: planCfg.maxUsers,
      });
    }

    await UserModel.updateMany(
      { companyId: order.companyId, isTrial: true },
      { isTrial: false, trialConvertedAt: new Date() }
    );

    // Send confirmation email (once)
    const freshOrder = await OrderModel.findById(order._id).select("confirmationEmailSent").lean();
    if (!freshOrder?.confirmationEmailSent) {
      const admin = await UserModel.findOne({
        companyId: order.companyId,
        role: { $in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
      }).select("email name").lean();

      if (admin?.email) {
        await sendPaymentConfirmationEmail({
          to: admin.email,
          name: admin.name ?? "Admin",
          plan: order.plan,
          billingCycle: order.billingCycle,
          amount: order.amount,
          orderCode,
        });
        await OrderModel.findByIdAndUpdate(order._id, { confirmationEmailSent: true });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[payOS webhook] error:", err.message);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
}

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
