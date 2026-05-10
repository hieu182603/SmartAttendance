/**
 * Auth E2E — TC-E2E-001, TC-E2E-006, TC-E2E-007
 *
 * Yêu cầu: frontend dev server + backend đang chạy.
 * Set env vars trong .env.test (xem e2e/env.example).
 *
 * Sau login, app redirect đến base path theo role:
 *   EMPLOYEE   → /employee
 *   SUPERVISOR/MANAGER → /manager
 *   HR_MANAGER → /hr
 *   ADMIN/SUPER_ADMIN → /admin
 */

import { test, expect, Page } from "@playwright/test";

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-001: Đăng nhập thành công → redirect đến dashboard đúng role
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-001: Login flow", () => {
  test("employee login → redirect /employee", async ({ page }) => {
    const email = process.env.E2E_EMPLOYEE_EMAIL || "employee@test.com";
    const password = process.env.E2E_EMPLOYEE_PASSWORD || "Test@123456";

    await fillLoginForm(page, email, password);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    expect(page.url()).not.toContain("/login");
    // Employee should land on /employee
    expect(page.url()).toContain("/employee");
  });

  test("hr login → redirect /hr", async ({ page }) => {
    const email = process.env.E2E_HR_EMAIL || "hr_manager@test.com";
    const password = process.env.E2E_HR_PASSWORD || "Test@123456";

    await fillLoginForm(page, email, password);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/hr");
  });

  test("sai mật khẩu → vẫn ở /login, hiện thông báo lỗi", async ({ page }) => {
    await fillLoginForm(page, "someone@test.com", "wrongpassword123");

    await expect(page.locator("body")).toContainText(
      /invalid|incorrect|sai|lỗi|không đúng|not found/i,
      { timeout: 8_000 }
    );
    expect(page.url()).toContain("/login");
  });

  test("email không tồn tại → hiện thông báo lỗi", async ({ page }) => {
    await fillLoginForm(page, "nonexistent_xyz_abc@test.com", "Test@123456");

    await expect(page.locator("body")).toContainText(
      /invalid|not found|sai|lỗi|không tìm thấy/i,
      { timeout: 8_000 }
    );
    expect(page.url()).toContain("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-006: Đăng xuất → redirect về /login, session bị xóa
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-006: Logout flow", () => {
  test("click logout → redirect /login", async ({ page }) => {
    const email = process.env.E2E_EMPLOYEE_EMAIL || "employee@test.com";
    const password = process.env.E2E_EMPLOYEE_PASSWORD || "Test@123456";

    await fillLoginForm(page, email, password);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    // Try opening user/avatar menu if exists, then click logout
    const avatarMenu = page.locator('[data-testid="user-menu"], [data-testid="avatar-btn"]').first();
    if (await avatarMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await avatarMenu.click();
    }

    const logoutBtn = page.locator(
      'button:has-text("Logout"), button:has-text("Đăng xuất"), button:has-text("Sign out"), [data-testid="logout-btn"]'
    ).first();

    await expect(logoutBtn).toBeVisible({ timeout: 5_000 });
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");

    // localStorage tokens should be cleared
    const token = await page.evaluate(() => localStorage.getItem("sa_token"));
    expect(token).toBeNull();
  });

  test("sau logout, truy cập /employee redirect về /login", async ({ page }) => {
    const email = process.env.E2E_EMPLOYEE_EMAIL || "employee@test.com";
    const password = process.env.E2E_EMPLOYEE_PASSWORD || "Test@123456";

    await fillLoginForm(page, email, password);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15_000 });

    // Clear tokens directly to simulate logout
    await page.evaluate(() => {
      localStorage.removeItem("sa_token");
      localStorage.removeItem("sa_refresh_token");
      localStorage.removeItem("sa_user_role");
    });

    await page.goto("/employee");
    // Should redirect to /login since no auth token
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-E2E-007: Truy cập trang protected khi chưa đăng nhập → redirect /login
// ─────────────────────────────────────────────────────────────────────────────
test.describe("TC-E2E-007: Protected route guard", () => {
  test("truy cập /employee khi chưa đăng nhập → redirect /login", async ({ page }) => {
    await page.goto("/employee");
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("truy cập /hr khi chưa đăng nhập → redirect /login", async ({ page }) => {
    await page.goto("/hr");
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("truy cập /admin khi chưa đăng nhập → redirect /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL((url) => url.pathname.includes("/login"), { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});
