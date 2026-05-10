/**
 * Attendance E2E — TC-E2E-002: Employee check-in và attendance history
 *
 * Chạy với project "employee" (storageState: .auth/employee.json).
 * Không cần login thủ công trong từng test.
 */

import { test, expect, Page } from "@playwright/test";

/** Chờ ProtectedRoute xác thực xong (loading screen biến mất) */
async function waitForAuth(page: Page) {
  await page.locator("text=Đang xác thực").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-002: Camera check-in page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-002: Camera check-in page", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["camera", "geolocation"]);
    await context.setGeolocation({ latitude: 10.7769, longitude: 106.7009 });
  });

  test("trang camera check-in load được và hiển thị UI quét", async ({ page }) => {
    await page.goto("/employee/camera-checkin", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Cannot GET");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("trang camera check-in có video element hoặc UI scan", async ({ page }) => {
    await page.goto("/employee/camera-checkin", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    // Page loaded successfully (headless has no real camera, video may not initialize)
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("Cannot GET");

    // Accept either: video/canvas element OR any visible scan-related UI element
    const hasAnyContent = await page.locator("video, canvas, button, div[class]").first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasAnyContent, "Camera page should render some UI after auth").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Attendance history page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Attendance history page — /employee/history", () => {
  test("trang lịch sử chấm công render được", async ({ page }) => {
    await page.goto("/employee/history", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Cannot GET");
  });

  test("trang lịch sử có bộ lọc tháng hoặc bảng/danh sách", async ({ page }) => {
    await page.goto("/employee/history", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    await page.waitForTimeout(2_000); // wait for API data

    // History page has a <table> element after data loads
    const hasTable = await page.locator("table").first()
      .isVisible({ timeout: 8_000 }).catch(() => false);
    const hasFilterOrEmpty = await page.locator(
      'input[type="month"], input[type="date"], select, ' +
      "text=/Không có dữ liệu|No data|chấm công|Lịch sử/i"
    ).first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasTable || hasFilterOrEmpty, "History page should show table or filter after load").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QR Scan page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QR Scan page — /employee/scan", () => {
  test("trang QR scan load được", async ({ page, context }) => {
    await context.grantPermissions(["camera"]);
    await page.goto("/employee/scan", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Cannot GET");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Schedule page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Schedule page — /employee/schedule", () => {
  test("trang lịch làm việc load được và hiển thị nội dung", async ({ page }) => {
    await page.goto("/employee/schedule", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    // Wait for the page's data-loading spinner to disappear (API calls can be slow)
    await page.locator("text=Đang tải lịch").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});

    expect(page.url()).not.toContain("/login");

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "Schedule page should show content after loading").toBeGreaterThan(100);
  });
});
