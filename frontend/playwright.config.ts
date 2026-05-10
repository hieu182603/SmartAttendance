import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  globalSetup: "./e2e/global.setup.ts",

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
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    // Employee pages — authenticated as employee
    {
      name: "employee",
      testMatch: ["**/attendance.spec.ts", "**/leave.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/employee.json",
      },
    },
    // HR/Admin pages — authenticated as HR manager
    {
      name: "hr",
      testMatch: ["**/hr.spec.ts", "**/payroll.spec.ts"],
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
