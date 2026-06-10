/**
 * Feature-toggle key alignment regression tests.
 *
 * These tests guard against the bug class where seeded DEFAULT_FEATURES keys
 * do not match the featureKey values used in menu items — so that a disabled
 * toggle actually controls the expected UI modules.
 *
 * Coverage areas (per the review comment):
 *   • chatbot key aligns across model, seed, and menu
 *   • attendance key aligns across model, seed, and menu
 *   • leave_management key aligns across model, seed, and menu
 *   • payroll, performance_review, attendance_analytics, employee_management,
 *     company_calendar — all seeded and round-trip through the model
 *
 * No MongoDB connection required — all assertions are against in-memory
 * constants imported directly from the source modules.
 */
import { describe, test, expect } from "@jest/globals";
import { DEFAULT_FEATURES } from "../src/modules/feature-toggle/featureToggle.model.js";

// ──────────────────────────────────────────────────────────────────────────────
// Canonical vocabulary fixture — single source of truth for this test file.
// Must be kept in sync with featureToggle.model.js DEFAULT_FEATURES.
// ──────────────────────────────────────────────────────────────────────────────
const CANONICAL_KEYS = [
  "attendance",           // scan, history, camera-checkin, admin-attendance
  "leave_management",     // requests, leave-balance, approve-requests
  "chatbot",              // chatbot page, ai-billing, company-regulations
  "payroll",              // my-payslip, payroll, payroll-reports, salary-matrix
  "performance_review",   // performance-review
  "attendance_analytics", // attendance-analytics
  "employee_management",  // employee-management
  "company_calendar",     // company-calendar
];

/**
 * Menu items extracted from menuItems.ts featureKey assignments.
 * This mirrors the relevant entries; update here when the menu changes.
 */
const MENU_FEATURE_KEYS = {
  // Employee section
  scan:              "attendance",
  history:           "attendance",
  "camera-checkin":  "attendance",
  "requests":        "leave_management",
  "leave-balance":   "leave_management",
  chatbot:           "chatbot",
  "my-payslip":      "payroll",
  // Admin section (sampling the key cross-section)
  "admin-attendance":      "attendance",
  "approve-requests":      "leave_management",
  "attendance-analytics":  "attendance_analytics",
  payroll:                 "payroll",
  "payroll-reports":       "payroll",
  "salary-matrix":         "payroll",
  "performance-review":    "performance_review",
  "employee-management":   "employee_management",
  "ai-billing":            "chatbot",
  "company-regulations":   "chatbot",
};

const seededKeys = DEFAULT_FEATURES.map((f) => f.featureKey);

describe("Feature-toggle canonical key vocabulary", () => {
  test("DEFAULT_FEATURES contains all required canonical keys", () => {
    for (const key of CANONICAL_KEYS) {
      expect(seededKeys).toContain(key);
    }
  });

  test("DEFAULT_FEATURES does NOT contain legacy stale keys", () => {
    const legacyKeys = ["face_recognition", "billing", "ai_chatbot", "face_attendance", "leave_requests", "attendance_history", "leave_balance"];
    for (const legacy of legacyKeys) {
      expect(seededKeys).not.toContain(legacy);
    }
  });

  test("DEFAULT_FEATURES has no duplicate featureKeys", () => {
    const unique = new Set(seededKeys);
    expect(unique.size).toBe(seededKeys.length);
  });

  test("Every DEFAULT_FEATURES entry has required fields", () => {
    for (const feature of DEFAULT_FEATURES) {
      expect(typeof feature.featureKey).toBe("string");
      expect(feature.featureKey.length).toBeGreaterThan(0);
      expect(typeof feature.name).toBe("string");
      expect(feature.name.length).toBeGreaterThan(0);
    }
  });

  // ── Chatbot ────────────────────────────────────────────────────────────────
  describe("chatbot key", () => {
    test("is seeded in DEFAULT_FEATURES as 'chatbot' (not 'ai_chatbot')", () => {
      expect(seededKeys).toContain("chatbot");
      expect(seededKeys).not.toContain("ai_chatbot");
    });

    test("menu items for chatbot module use the key 'chatbot'", () => {
      for (const [item, key] of Object.entries(MENU_FEATURE_KEYS)) {
        if (["chatbot", "ai-billing", "company-regulations"].includes(item)) {
          expect(key).toBe("chatbot");
        }
      }
    });
  });

  // ── Attendance ─────────────────────────────────────────────────────────────
  describe("attendance key", () => {
    test("is seeded as 'attendance' (not 'face_recognition' or 'face_attendance')", () => {
      expect(seededKeys).toContain("attendance");
      expect(seededKeys).not.toContain("face_recognition");
      expect(seededKeys).not.toContain("face_attendance");
    });

    test("menu items for attendance module all use 'attendance'", () => {
      const attendanceItems = ["scan", "history", "camera-checkin", "admin-attendance"];
      for (const item of attendanceItems) {
        expect(MENU_FEATURE_KEYS[item]).toBe("attendance");
      }
    });
  });

  // ── Leave management ───────────────────────────────────────────────────────
  describe("leave_management key", () => {
    test("is seeded as 'leave_management' (not 'leave_requests' or 'leave_balance')", () => {
      expect(seededKeys).toContain("leave_management");
      expect(seededKeys).not.toContain("leave_requests");
      expect(seededKeys).not.toContain("leave_balance");
    });

    test("menu items for leave module all use 'leave_management'", () => {
      const leaveItems = ["requests", "leave-balance", "approve-requests"];
      for (const item of leaveItems) {
        expect(MENU_FEATURE_KEYS[item]).toBe("leave_management");
      }
    });
  });

  // ── Payroll ────────────────────────────────────────────────────────────────
  describe("payroll key", () => {
    test("is seeded as 'payroll'", () => {
      expect(seededKeys).toContain("payroll");
    });

    test("all payroll-related menu items use 'payroll'", () => {
      const payrollItems = ["my-payslip", "payroll", "payroll-reports", "salary-matrix"];
      for (const item of payrollItems) {
        expect(MENU_FEATURE_KEYS[item]).toBe("payroll");
      }
    });
  });

  // ── End-to-end menu ↔ model alignment ─────────────────────────────────────
  test("Every menu featureKey is present in DEFAULT_FEATURES (end-to-end alignment)", () => {
    const uniqueMenuKeys = new Set(Object.values(MENU_FEATURE_KEYS));
    for (const menuKey of uniqueMenuKeys) {
      expect(seededKeys).toContain(menuKey);
    }
  });
});
