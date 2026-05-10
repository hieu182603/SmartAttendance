/**
 * Global setup — runs once before all test projects.
 * Logs in as each required role and persists storageState (localStorage + cookies)
 * to .auth/<role>.json so tests can skip the login step.
 *
 * If a login fails (backend unavailable, wrong credentials), we write an empty
 * storageState so the project still starts — individual tests will gracefully
 * redirect to /login and can be skipped with `test.skip`.
 */

import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

const ROLES = [
  {
    key: "employee",
    email: process.env.E2E_EMPLOYEE_EMAIL || "employee1@smartattendance.com",
    password: process.env.E2E_EMPLOYEE_PASSWORD || "SmartAttendance@2026!",
  },
  {
    key: "hr",
    email: process.env.E2E_HR_EMAIL || "hr@smartattendance.com",
    password: process.env.E2E_HR_PASSWORD || "SmartAttendance@2026!",
  },
  {
    key: "manager",
    email: process.env.E2E_MANAGER_EMAIL || "manager@smartattendance.com",
    password: process.env.E2E_MANAGER_PASSWORD || "SmartAttendance@2026!",
  },
];

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] });

async function saveAuth(key: string, email: string, password: string, outPath: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.locator('input[type="email"], input[name="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 12_000 });

    // Wait a moment for localStorage to be fully written
    await page.waitForTimeout(500);
    await context.storageState({ path: outPath });
    console.log(`[global.setup] ✓ ${key} auth saved → ${outPath}`);
  } catch (err) {
    console.warn(`[global.setup] ⚠ Could not authenticate "${key}" (${email}): ${(err as Error).message}`);
    fs.writeFileSync(outPath, EMPTY_STATE);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  const authDir = path.resolve(".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Run all role logins sequentially to avoid race conditions on a single dev server
  for (const role of ROLES) {
    const outPath = path.join(authDir, `${role.key}.json`);
    await saveAuth(role.key, role.email, role.password, outPath);
  }
}
