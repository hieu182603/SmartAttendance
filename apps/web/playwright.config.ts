import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Smoke — no auth needed
    {
      name: "smoke",
      testMatch: "**/smoke.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // Auth flows — no pre-existing auth (tests the login itself)
    // These tests log in as employee and hr, overwriting the Redis refresh token slot.
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },

    // Auth setup — runs AFTER auth to write fresh storageState files.
    // Depends on "auth" so Redis slots are stable before we save tokens.
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"] },
    },

    // Employee pages — authenticated as employee, runs after setup
    {
      name: "employee",
      testMatch: ["**/attendance.spec.ts", "**/leave.spec.ts"],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/employee.json",
      },
    },

    // HR/Admin pages — authenticated as HR manager, runs after employee.
    // Depends on "employee" (not just "setup") to ensure employee API calls
    // finish before hr tests start, preventing server resource contention.
    {
      name: "hr",
      testMatch: ["**/hr.spec.ts", "**/payroll.spec.ts"],
      dependencies: ["employee"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/hr.json",
      },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 5173,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
