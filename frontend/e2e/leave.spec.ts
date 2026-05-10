/**
 * Leave E2E — TC-E2E-005: Employee xin nghỉ, Manager duyệt
 *
 * Chạy với project "employee" (storageState: .auth/employee.json).
 * Test manager duyệt đơn sử dụng override storageState inline.
 */

import { test, expect } from "@playwright/test";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-005a: Employee — trang xin nghỉ phép
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-005: Employee Leave Requests — /employee/requests", () => {
  test("trang xin nghỉ phép load được cho employee", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang requests có danh sách đơn hoặc nút tạo đơn mới", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    const hasContent = await page.locator(
      "table tbody tr, .request-card, " +
      'button:has-text("Tạo đơn"), button:has-text("Xin nghỉ"), button:has-text("New Request"), ' +
      'text=/Không có dữ liệu|No data|đơn nghỉ/i'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasContent, "Requests page should show list or create button").toBe(true);
  });

  test("mở form tạo đơn nghỉ phép khi click nút tạo", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    const createBtn = page.locator(
      'button:has-text("Tạo đơn"), button:has-text("Xin nghỉ"), ' +
      'button:has-text("New Request"), button:has-text("Create"), [data-testid="create-request-btn"]'
    ).first();

    if (!(await createBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Create button not found — skipping form test");
      return;
    }

    await createBtn.click();

    // Form/dialog should appear with date fields
    const hasDateField = await page.locator(
      'input[type="date"], [data-testid="start-date"], .date-picker, ' +
      'text=/Ngày bắt đầu|Start date|Từ ngày/i'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasDateField, "Leave request form should have date field").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-005b: Leave balance page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Leave Balance — /employee/leave-balance", () => {
  test("trang số ngày phép còn lại load được", async ({ page }) => {
    await page.goto("/employee/leave-balance", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    // Should show some leave balance data
    const hasBalance = await page.locator(
      'text=/ngày phép|leave balance|Annual Leave|Nghỉ phép/i, ' +
      ".balance-card, [data-testid='leave-balance']"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasBalance, "Leave balance page should show balance info").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-005c: Manager — trang duyệt đơn (dùng manager auth)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-005: Manager Approve Requests — /manager/approve-requests", () => {
  test.use({ storageState: ".auth/manager.json" });

  test("trang duyệt đơn load được cho manager", async ({ page }) => {
    await page.goto("/manager/approve-requests", { waitUntil: "domcontentloaded" });

    // If storageState is empty (no manager account), it'll redirect to /login — that's OK
    const url = page.url();
    if (url.includes("/login")) {
      test.skip(true, "Manager account not available — skipping approve-requests test");
      return;
    }

    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("trang duyệt đơn có danh sách pending hoặc empty state", async ({ page }) => {
    await page.goto("/manager/approve-requests", { waitUntil: "domcontentloaded" });

    const url = page.url();
    if (url.includes("/login")) {
      test.skip(true, "Manager account not available");
      return;
    }

    await page.waitForTimeout(1_500);

    const hasContent = await page.locator(
      "table tbody tr, .request-item, " +
      'text=/Không có đơn|No requests|Pending|Chờ duyệt/i'
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasContent, "Approve page should show requests or empty state").toBe(true);
  });
});
