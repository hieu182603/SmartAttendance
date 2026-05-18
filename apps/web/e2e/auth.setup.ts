/**
 * Auth setup project — runs AFTER auth.spec.ts to write fresh storageState.
 *
 * Why this exists separately from global.setup.ts:
 * auth.spec.ts logs in as employee and hr, which overwrites the Redis single-slot
 * refresh token for each user. If we saved storageState BEFORE auth.spec.ts ran
 * (as global.setup.ts did), the stored refresh token would be stale and cause
 * forceLogout() cascades in every subsequent HR/employee test.
 *
 * This file runs in the "setup" project which depends on "auth", guaranteeing
 * that auth.spec.ts has already run (and overwritten Redis) before we log in
 * here and write the final, valid storageState.
 */
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  outPath: string
) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // No try/catch fallback: if login fails, the setup test must fail loudly so
  // we don't end up with an EMPTY_STATE storage file that quietly makes every
  // dependent employee/hr test redirect to /login.
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  // Small settle delay: let AuthContext finish writing sa_user_role and
  // the backend Set-Cookie header reach the browser before we snapshot state.
  await page.waitForTimeout(500);

  // Verify login actually completed before saving. The web app keeps the
  // access token in React state (NOT localStorage) and the refresh token in
  // an httpOnly cookie — neither is directly inspectable here. But AuthContext
  // writes `sa_user_role` to localStorage on successful login (line 62), so
  // that key being set is a reliable post-login signal.
  const userRole = await page.evaluate(() => localStorage.getItem("sa_user_role"));
  expect(userRole, `sa_user_role must be set after login for ${email}`).toBeTruthy();

  await page.context().storageState({ path: outPath });
  console.log(`[auth.setup] ✓ saved → ${path.basename(outPath)}`);
}

setup("setup: employee auth", async ({ page }) => {
  await loginAndSave(
    page,
    process.env.E2E_EMPLOYEE_EMAIL || "employee1@smartattendance.com",
    process.env.E2E_EMPLOYEE_PASSWORD || "SmartAttendance@2026!",
    path.resolve(".auth/employee.json")
  );
});

setup("setup: hr auth", async ({ page }) => {
  await loginAndSave(
    page,
    process.env.E2E_HR_EMAIL || "hr@smartattendance.com",
    process.env.E2E_HR_PASSWORD || "SmartAttendance@2026!",
    path.resolve(".auth/hr.json")
  );
});

setup("setup: manager auth", async ({ page }) => {
  await loginAndSave(
    page,
    process.env.E2E_MANAGER_EMAIL || "manager@smartattendance.com",
    process.env.E2E_MANAGER_PASSWORD || "SmartAttendance@2026!",
    path.resolve(".auth/manager.json")
  );
});

setup("setup: admin auth", async ({ page }) => {
  await loginAndSave(
    page,
    process.env.E2E_ADMIN_EMAIL || "admin@smartattendance.com",
    process.env.E2E_ADMIN_PASSWORD || "SmartAttendance@2026!",
    path.resolve(".auth/admin.json")
  );
});
