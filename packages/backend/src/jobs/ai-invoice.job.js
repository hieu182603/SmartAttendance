import cron from "node-cron";
import { issueMonthlyInvoicesForPeriod } from "../modules/ai-billing/ai-billing.service.js";

function previousMonthBounds() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end, month, year };
}

// 02:00 ngày 1 hàng tháng, timezone Việt Nam
const aiInvoiceJob = cron.schedule(
  "0 2 1 * *",
  async () => {
    if (process.env.AI_INVOICE_CRON_ENABLED === "false") return;
    const { start, end, month, year } = previousMonthBounds();
    console.log(`[ai-invoice] Issuing invoices for T${String(month).padStart(2, "0")}/${year}...`);
    try {
      const result = await issueMonthlyInvoicesForPeriod(start, end);
      console.log(`[ai-invoice] Done: issued=${result.issued}/${result.total}`);
    } catch (err) {
      console.error("[ai-invoice] Cron failed:", err.message);
    }
  },
  { timezone: "Asia/Ho_Chi_Minh", scheduled: false }
);

export const startAiInvoiceCron = () => {
  if (process.env.AI_INVOICE_CRON_ENABLED !== "false") {
    aiInvoiceJob.start();
    console.log("[ai-invoice] Cron job started (0 2 1 * *, Asia/Ho_Chi_Minh)");
  }
};

export const stopAiInvoiceCron = () => {
  aiInvoiceJob.stop();
};
