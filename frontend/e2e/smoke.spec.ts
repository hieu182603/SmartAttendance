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

  test("route không tồn tại hiển thị trang 404", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    // Wait for React to hydrate — the app shows "Loading..." during chunk loading
    await page.locator("text=Loading").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await expect(page.locator("body")).toBeVisible();
    // Root catch-all renders NotFoundPage in-place (URL stays, content shows 404)
    // Sub-routes (e.g. /employee/*) redirect to /not-found — both are acceptable
    const bodyText = (await page.locator("body").textContent()) || "";
    const url = page.url();
    const is404 =
      url.includes("not-found") ||
      bodyText.includes("404") ||
      bodyText.toLowerCase().includes("không tìm thấy") ||
      bodyText.toLowerCase().includes("page not found");
    expect(is404, `Expected 404 page content, got URL: ${url}, body snippet: ${bodyText.slice(0, 200)}`).toBe(true);
  });
});
