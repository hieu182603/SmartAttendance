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
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] });

async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  outPath: string
) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 12_000 });
    // Wait for localStorage to be fully written (token + refresh_token)
    await page.waitForTimeout(500);
    await page.context().storageState({ path: outPath });
    console.log(`[auth.setup] ✓ saved → ${path.basename(outPath)}`);
  } catch (err) {
    console.warn(`[auth.setup] ⚠ Could not authenticate (${email}): ${(err as Error).message}`);
    fs.writeFileSync(outPath, EMPTY_STATE);
  }
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
