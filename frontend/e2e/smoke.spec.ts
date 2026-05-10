/**
 * Smoke E2E — kiểm tra app load được, không có JS error nghiêm trọng.
 * Không phụ thuộc backend → có thể chạy CI mà không cần đầy đủ stack.
 */
import { test, expect } from "@playwright/test";

test.describe("Frontend smoke", () => {
  test("trang chủ render được, không có lỗi script chặn", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
    expect(errors, `Page errors: ${errors.join("; ")}`).toHaveLength(0);
  });

  test("trang /login có form email và password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("trang 404 render không bị crash", async ({ page }) => {
    await page.goto("/not-found");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Cannot GET");
  });

  test("route không tồn tại redirect về 404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
    // Expect either a 404 message or redirect to /not-found
    const url = page.url();
    const bodyText = await page.locator("body").textContent();
    const is404 = url.includes("not-found") || (bodyText || "").toLowerCase().includes("404") || (bodyText || "").toLowerCase().includes("không tìm thấy");
    expect(is404, `Expected 404 behavior, got URL: ${url}`).toBe(true);
  });
});
