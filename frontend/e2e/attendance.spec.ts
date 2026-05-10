/**
 * Attendance E2E — TC-E2E-002: Employee check-in và attendance history
 *
 * Chạy với project "employee" (storageState: .auth/employee.json).
 * Không cần login thủ công trong từng test.
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-002: Camera check-in page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-002: Camera check-in page", () => {
  test.beforeEach(async ({ context }) => {
    // Grant camera + geolocation so the page doesn't hang on permission
    await context.grantPermissions(["camera", "geolocation"]);
    await context.setGeolocation({ latitude: 10.7769, longitude: 106.7009 });
  });

  test("trang camera check-in load được và hiển thị UI quét", async ({ page }) => {
    await page.goto("/employee/camera-checkin", { waitUntil: "domcontentloaded" });

    // Should be accessible (not redirected to login)
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/employee");

    // Page should render without crash
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Cannot GET");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("trang camera check-in có video element hoặc UI scan", async ({ page }) => {
    await page.goto("/employee/camera-checkin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    // Either a video element, canvas, or a button related to check-in should be present
    const hasCamera = await page.locator("video, canvas").first().isVisible().catch(() => false);
    const hasScanUI = await page.locator(
      'button:has-text("Chấm công"), button:has-text("Check-in"), [data-testid="checkin-btn"]'
    ).first().isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasCamera || hasScanUI, "Camera UI or checkin button should be visible").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: Attendance history page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Attendance history page — /employee/history", () => {
  test("trang lịch sử chấm công render được", async ({ page }) => {
    await page.goto("/employee/history", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Cannot GET");
  });

  test("trang lịch sử có bộ lọc tháng hoặc bảng/danh sách", async ({ page }) => {
    await page.goto("/employee/history", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    // There should be a table, list, or empty state — not a blank crash
    const hasContent = await page.locator(
      "table, [role='table'], ul, .empty-state, .no-data, tbody tr, " +
      "text=/Không có dữ liệu|No data|chấm công|attendance/i"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasContent, "History page should show table or empty state").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: QR Scan page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QR Scan page — /employee/scan", () => {
  test("trang QR scan load được", async ({ page, context }) => {
    await context.grantPermissions(["camera"]);
    await page.goto("/employee/scan", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText("Cannot GET");
    await expect(page.locator("body")).not.toContainText("404");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E: Schedule page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Schedule page — /employee/schedule", () => {
  test("trang lịch làm việc load được và hiển thị lịch/bảng", async ({ page }) => {
    await page.goto("/employee/schedule", { waitUntil: "domcontentloaded" });

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    // Should show some schedule-related content
    const hasScheduleUI = await page.locator(
      "table, [role='table'], .calendar, .schedule, " +
      "text=/Lịch|Schedule|Ca làm|Shift/i"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);

    expect(hasScheduleUI, "Schedule page should show calendar or table").toBe(true);
  });
});
