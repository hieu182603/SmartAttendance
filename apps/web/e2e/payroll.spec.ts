/**
 * Payroll E2E — TC-E2E-004: HR quản lý bảng lương, export PDF/Excel
 *
 * Chạy với project "hr" (storageState: .auth/hr.json).
 */

import { test, expect, Page } from "@playwright/test";

/** Chờ ProtectedRoute xác thực xong */
async function waitForAuth(page: Page) {
  await page.locator("text=Đang xác thực").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-004: Payroll management page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-004: Payroll Page — /hr/payroll", () => {
  test("trang bảng lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang bảng lương có bộ lọc tháng (input[type=month])", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    // PayrollPage has input[type="month"] at line 642 of the component
    const hasMonthInput = await page.locator('input[type="month"]').first()
      .isVisible({ timeout: 15_000 }).catch(() => false);

    expect(hasMonthInput, "Payroll page should have input[type=month] filter").toBe(true);
  });

  test("có nút generate payroll hoặc xuất Excel", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    const hasActionBtn = await page.locator(
      'button:has-text("Generate"), button:has-text("Tính lương"), button:has-text("Tạo bảng lương"), ' +
      'button:has-text("Excel"), button:has-text("PDF"), button:has-text("Xuất")'
    ).first().isVisible({ timeout: 15_000 }).catch(() => false);

    expect(hasActionBtn, "Payroll page should have Generate or Export button").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Salary Matrix page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Salary Matrix — /hr/salary-matrix", () => {
  test("trang thang lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/salary-matrix", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("403");
  });

  test("trang thang lương có danh sách hoặc nút thêm", async ({ page }) => {
    await page.goto("/hr/salary-matrix", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    await page.waitForTimeout(2_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "Salary matrix page should have visible content").toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// My Payslip page (HR user's own payslip)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("My Payslip — /hr/my-payslip", () => {
  test("HR user có thể xem phiếu lương của chính mình", async ({ page }) => {
    await page.goto("/hr/my-payslip", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang my-payslip hiển thị phiếu lương hoặc trạng thái trống", async ({ page }) => {
    await page.goto("/hr/my-payslip", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    await page.waitForTimeout(2_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "My payslip page should have loaded content").toBeGreaterThan(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Payroll Reports page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Payroll Reports — /hr/payroll-reports", () => {
  test("trang báo cáo lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/payroll-reports", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang báo cáo lương có biểu đồ hoặc số liệu", async ({ page }) => {
    await page.goto("/hr/payroll-reports", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    await page.waitForTimeout(3_000); // charts may take longer to render

    const hasChart = await page.locator("svg, canvas, .recharts-wrapper").first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasText = bodyText.trim().length > 100;

    expect(hasChart || hasText, "Payroll reports should show chart or summary data").toBe(true);
  });
});
