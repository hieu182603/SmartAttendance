import { test, expect } from "@playwright/test";

/**
 * Smoke E2E — chỉ kiểm tra app load được, có heading và không có console error nghiêm trọng.
 * Không phụ thuộc backend → có thể chạy CI mà không cần đầy đủ stack.
 */
test.describe("Frontend smoke", () => {
  test("Trang chủ render được, không có lỗi script chặn", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // Có ít nhất 1 element được render (root div của React)
    await expect(page.locator("#root")).toBeVisible();
    expect(errors, `Page errors: ${errors.join("; ")}`).toHaveLength(0);
  });

  test("Trang đăng nhập có form email/password", async ({ page }) => {
    await page.goto("/login");

    // Một trong hai input phải xuất hiện
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();
  });
});
