/**
 * Payroll E2E — TC-E2E-004: HR quản lý bảng lương, export PDF/Excel
 *
 * Chạy với project "hr" (storageState: .auth/hr.json).
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-004: HR Payroll management page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-004: Payroll Page — /hr/payroll", () => {
  test("trang bảng lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang bảng lương có bộ lọc tháng", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const hasMonthFilter = await page.locator(
      'input[type="month"], select[name*="month" i], [data-testid="month-filter"], ' +
      "text=/Tháng|Month/i"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasMonthFilter, "Payroll page should have month filter").toBe(true);
  });

  test("có nút generate payroll hoặc xuất Excel", async ({ page }) => {
    await page.goto("/hr/payroll", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const hasActionBtn = await page.locator(
      'button:has-text("Generate"), button:has-text("Tính lương"), ' +
      'button:has-text("Excel"), button:has-text("PDF"), button:has-text("Xuất")'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasActionBtn, "Payroll page should have Generate or Export button").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: Salary Matrix page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Salary Matrix — /hr/salary-matrix", () => {
  test("trang thang lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/salary-matrix", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("403");
  });

  test("trang thang lương có danh sách hoặc nút thêm", async ({ page }) => {
    await page.goto("/hr/salary-matrix", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    const hasContent = await page.locator(
      "table tbody tr, .salary-row, " +
      'button:has-text("Thêm"), button:has-text("Add"), ' +
      "text=/Thang lương|Salary Matrix|Không có dữ liệu/i"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasContent, "Salary matrix should show list or add button").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: Employee payslip (my-payslip) - HR user's own payslip
// ─────────────────────────────────────────────────────────────────────────────
test.describe("My Payslip — /hr/my-payslip", () => {
  test("HR user có thể xem phiếu lương của chính mình", async ({ page }) => {
    await page.goto("/hr/my-payslip", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang my-payslip có nút download PDF hoặc Excel", async ({ page }) => {
    await page.goto("/hr/my-payslip", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const hasDownloadBtn = await page.locator(
      'button:has-text("PDF"), button:has-text("Excel"), ' +
      'button:has-text("Download"), button:has-text("Tải về"), ' +
      'button:has-text("Xuất")'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    // Even if no payslip exists, the UI should render (may show empty state)
    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
    // hasDownloadBtn is informational — might not exist if no payslip generated yet
    if (!hasDownloadBtn) {
      const hasEmptyState = await page.locator(
        "text=/Chưa có phiếu lương|No payslip|chưa được tạo/i"
      ).first().isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasEmptyState || hasDownloadBtn, "Page should show payslip or empty state").toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: Payroll Reports page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Payroll Reports — /hr/payroll-reports", () => {
  test("trang báo cáo lương load được cho HR", async ({ page }) => {
    await page.goto("/hr/payroll-reports", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang báo cáo lương có biểu đồ hoặc số liệu tổng hợp", async ({ page }) => {
    await page.goto("/hr/payroll-reports", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    const hasChart = await page.locator(
      "svg, canvas, .recharts-wrapper, " +
      "text=/Tổng lương|Total Salary|Net Pay|Bộ phận|Department/i"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasChart, "Payroll reports should show chart or summary data").toBe(true);
  });
});
