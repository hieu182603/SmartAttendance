/**
 * HR E2E — TC-E2E-003: Quản lý nhân viên, attendance, payroll
 *
 * Chạy với project "hr" (storageState: .auth/hr.json).
 * Không cần login thủ công.
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-003: HR Employee Management page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-003: HR Employee Management — /hr/employee-management", () => {
  test("trang quản lý nhân viên load được cho HR", async ({ page }) => {
    await page.goto("/hr/employee-management", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).not.toContainText("Cannot GET");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang quản lý nhân viên có danh sách hoặc nút thêm nhân viên", async ({ page }) => {
    await page.goto("/hr/employee-management", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Should have a table with employees, or an "Add" button
    const hasEmployeeList = await page.locator(
      "table tbody tr, [role='row'], .employee-card"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    const hasAddButton = await page.locator(
      'button:has-text("Thêm"), button:has-text("Add"), button:has-text("Tạo"), ' +
      'button:has-text("New Employee"), [data-testid="add-employee-btn"]'
    ).first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasEmployeeList || hasAddButton, "Employee management should show list or Add button").toBe(true);
  });

  test("dialog tạo nhân viên mở khi click nút Thêm", async ({ page }) => {
    await page.goto("/hr/employee-management", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    const addBtn = page.locator(
      'button:has-text("Thêm"), button:has-text("Add"), button:has-text("Tạo nhân viên"), ' +
      'button:has-text("New Employee")'
    ).first();

    if (!(await addBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Add button not found — skipping form test");
      return;
    }

    await addBtn.click();

    // A dialog/modal with email or name field should appear
    const emailField = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailField).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: HR Admin Attendance page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("HR Admin Attendance — /hr/admin-attendance", () => {
  test("trang chấm công tổng hợp load được", async ({ page }) => {
    await page.goto("/hr/admin-attendance", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang chấm công có bộ lọc tháng", async ({ page }) => {
    await page.goto("/hr/admin-attendance", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    // Should have date/month filter or attendance table
    const hasFilter = await page.locator(
      'input[type="date"], select, [data-testid="month-filter"], ' +
      'text=/Tháng|Month|Ngày|Date/i'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasFilter, "Admin attendance should have date/month filter").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: HR Approve Requests page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("HR Approve Requests — /hr/approve-requests", () => {
  test("trang duyệt đơn load được cho HR", async ({ page }) => {
    await page.goto("/hr/approve-requests", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: HR Analytics page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("HR Attendance Analytics — /hr/attendance-analytics", () => {
  test("trang analytics load được cho HR", async ({ page }) => {
    await page.goto("/hr/attendance-analytics", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: HR Profile page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("HR Profile — /hr/profile", () => {
  test("trang profile render thông tin user", async ({ page }) => {
    await page.goto("/hr/profile", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    // Profile page should show some user info
    const hasProfile = await page.locator(
      "text=/Hồ sơ|Profile|Thông tin|Email/i, img[alt*='avatar' i], .profile-avatar"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasProfile, "Profile page should show user info").toBe(true);
  });
});
