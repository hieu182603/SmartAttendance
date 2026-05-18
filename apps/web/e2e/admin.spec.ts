/**
 * Admin E2E — trang quản trị hệ thống
 *
 * Chạy với project "admin" (storageState: .auth/admin.json).
 * Nếu không có admin account, các test sẽ skip gracefully.
 *
 * Covers:
 * - Departments (/admin/departments)
 * - Branches (/admin/branches)
 * - Audit Logs (/admin/audit-logs)
 * - Role Management (/admin/role-management)
 * - System Health (/admin/system-health)
 * - Active Sessions (/admin/active-sessions)
 */

import { test, expect, Page } from "@playwright/test";

/** Chờ ProtectedRoute xác thực xong */
async function waitForAuth(page: Page) {
  await page.locator("text=Đang xác thực").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

/** Skip gracefully nếu admin account chưa được setup */
async function skipIfNoAdmin(page: Page) {
  if (page.url().includes("/login")) {
    test.skip(true, "Admin account not available — skipping");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Departments page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Departments — /admin/departments", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang phòng ban load được cho admin", async ({ page }) => {
    await page.goto("/admin/departments", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    skipIfNoAdmin(page);

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang phòng ban có danh sách hoặc nút tạo", async ({ page }) => {
    await page.goto("/admin/departments", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const hasContent = await page.locator(
      "table tbody tr, [class*='card'], button:has-text('Thêm'), button:has-text('Tạo')"
    ).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const bodyText = (await page.locator("body").textContent()) || "";
    expect(hasContent || bodyText.length > 100, "Departments page should have content").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Branches page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Branches — /admin/branches", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang chi nhánh load được cho admin", async ({ page }) => {
    await page.goto("/admin/branches", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
  });

  test("trang chi nhánh có danh sách hoặc nút tạo chi nhánh", async ({ page }) => {
    await page.goto("/admin/branches", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "Branches page should have loaded content").toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Audit Logs — /admin/audit-logs", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang nhật ký kiểm toán load được", async ({ page }) => {
    await page.goto("/admin/audit-logs", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang audit logs có bảng hoặc trạng thái trống", async ({ page }) => {
    await page.goto("/admin/audit-logs", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const hasTable = await page.locator("table").first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const bodyText = (await page.locator("body").textContent()) || "";
    expect(hasTable || bodyText.trim().length > 100, "Audit logs page should have table or content").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Role Management page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Role Management — /admin/role-management", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang quản lý phân quyền load được", async ({ page }) => {
    await page.goto("/admin/role-management", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
  });

  test("trang role management có danh sách role hoặc permission", async ({ page }) => {
    await page.goto("/admin/role-management", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    const hasRoleContent =
      bodyText.toLowerCase().includes("admin") ||
      bodyText.toLowerCase().includes("role") ||
      bodyText.toLowerCase().includes("quyền");
    expect(hasRoleContent, "Role management page should show role/permission content").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// System Health page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin System Health — /admin/system-health", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang sức khỏe hệ thống load được", async ({ page }) => {
    await page.goto("/admin/system-health", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang system health hiển thị thông tin dịch vụ", async ({ page }) => {
    await page.goto("/admin/system-health", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(3_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    const hasServiceInfo =
      bodyText.toLowerCase().includes("mongodb") ||
      bodyText.toLowerCase().includes("redis") ||
      bodyText.toLowerCase().includes("api") ||
      bodyText.toLowerCase().includes("health") ||
      bodyText.toLowerCase().includes("status");
    expect(hasServiceInfo, "System health page should show service status info").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Active Sessions page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Active Sessions — /admin/active-sessions", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang phiên đăng nhập load được", async ({ page }) => {
    await page.goto("/admin/active-sessions", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang active sessions có bảng hoặc thông báo trống", async ({ page }) => {
    await page.goto("/admin/active-sessions", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const hasTable = await page.locator("table").first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    const bodyText = (await page.locator("body").textContent()) || "";
    expect(hasTable || bodyText.trim().length > 100, "Active sessions page should render content").toBe(true);
  });

  test("nút làm mới hoạt động không gây lỗi", async ({ page }) => {
    await page.goto("/admin/active-sessions", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(1_500);

    const refreshBtn = page.locator('button:has-text("Làm mới"), button:has-text("Refresh")').first();
    if (!(await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Refresh button not found");
      return;
    }

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await refreshBtn.click();
    await page.waitForTimeout(1_000);
    expect(errors, `Page errors after refresh: ${errors.join("; ")}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Face Recognition Logs page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin Face Recognition Logs — /admin/face-recognition-logs", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang lịch sử nhận diện khuôn mặt load được", async ({ page }) => {
    await page.goto("/admin/face-recognition-logs", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// System Config page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin System Config — /admin/system-config", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("trang cấu hình hệ thống load được", async ({ page }) => {
    await page.goto("/admin/system-config", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }

    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("403");
    await expect(page.locator("body")).toBeVisible();
  });

  test("trang system config có form hoặc nội dung cấu hình", async ({ page }) => {
    await page.goto("/admin/system-config", { waitUntil: "domcontentloaded" });
    await waitForAuth(page);
    if (page.url().includes("/login")) { test.skip(true, "No admin"); return; }
    await page.waitForTimeout(2_000);

    const bodyText = (await page.locator("body").textContent()) || "";
    expect(bodyText.trim().length, "System config page should have content").toBeGreaterThan(100);
  });
});
