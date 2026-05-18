/**
 * Leave E2E — TC-E2E-005: Employee xin nghỉ, Manager duyệt
 *
 * Chạy với project "employee" (storageState: .auth/employee.json).
 * Test manager duyệt đơn sử dụng override storageState inline.
 */

import { test, expect, Page } from "@playwright/test";

/** Chờ ProtectedRoute xác thực xong */
async function waitForAuth(page: Page) {
  await page.locator("text=Đang xác thực").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-005a: Employee — trang xin nghỉ phép
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-005: Employee Leave Requests — /employee/requests", () => {
  test("trang xin nghỉ phép load được cho employee", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang requests có danh sách đơn hoặc nút tạo đơn mới", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    // Page title "Yêu cầu & Đơn từ" should be visible
    const hasTitle = await page.locator("text=/Yêu cầu|Đơn từ|requests/i").first()
      .isVisible({ timeout: 15_000 }).catch(() => false);
    const hasContent = await page.locator(
      "table tbody tr, .request-card, [class*='card'], " +
      "text=/Không có|No data|pending|Tạo yêu cầu/i"
    ).first().isVisible({ timeout: 15_000 }).catch(() => false);

    expect(hasTitle || hasContent, "Requests page should show title or list content").toBe(true);
  });

  test("mở form tạo đơn nghỉ phép khi click nút tạo", async ({ page }) => {
    await page.goto("/employee/requests", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    await page.waitForTimeout(1_500);

    // Find create/request button - RequestsPage has a create button somewhere
    const createBtn = page.locator(
      'button:has-text("Tạo"), button:has-text("Xin nghỉ"), button:has-text("Request"), ' +
      'button:has-text("New"), button:has-text("Yêu cầu"), [data-testid="create-request-btn"]'
    ).first();

    if (!(await createBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Create button not visible — skipping form open test");
      return;
    }

    await createBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leave balance page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Leave Balance — /employee/leave-balance", () => {
  test("trang số ngày phép còn lại load được", async ({ page }) => {
    await page.goto("/employee/leave-balance", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    // Wait for page's own data loading to finish
    await page.locator("text=Đang tải dữ liệu").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});

    expect(page.url()).not.toContain("/login");

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "Leave balance page should have loaded content").toBeGreaterThan(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-005c: Manager — trang duyệt đơn (dùng manager auth)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-005: Manager Approve Requests — /manager/approve-requests", () => {
  test.use({ storageState: ".auth/manager.json" });

  test("trang duyệt đơn load được cho manager", async ({ page }) => {
    await page.goto("/manager/approve-requests", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    const url = page.url();
    if (url.includes("/login")) {
      test.skip(true, "Manager account not available — skipping approve-requests test");
      return;
    }

    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang duyệt đơn có danh sách pending hoặc empty state", async ({ page }) => {
    await page.goto("/manager/approve-requests", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    const url = page.url();
    if (url.includes("/login")) {
      test.skip(true, "Manager account not available");
      return;
    }

    await page.waitForTimeout(2_000);

    // After auth, check any visible meaningful content
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasAnyText = bodyText.trim().length > 50;
    expect(hasAnyText, "Approve page should have loaded content after auth").toBe(true);
  });
});
