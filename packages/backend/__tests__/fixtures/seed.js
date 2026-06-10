// Seed helpers — create minimal data for integration tests.
// Each function returns the created document(s) with plain JS objects.

import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "SmartAttendance@2026!";

export async function hashPassword(plain = DEFAULT_PASSWORD) {
  return bcrypt.hash(plain, 10);
}

export async function createBranch(BranchModel, overrides = {}) {
  return BranchModel.create({
    name: "HQ Branch",
    address: "123 Main St",
    phone: "0909000001",
    ...overrides,
  });
}

export async function createDepartment(DepartmentModel, overrides = {}) {
  return DepartmentModel.create({
    name: "Engineering",
    code: "ENG",
    ...overrides,
  });
}

export async function createShift(ShiftModel, overrides = {}) {
  return ShiftModel.create({
    name: "Morning",
    startTime: "08:00",
    endTime: "17:00",
    breakDuration: 60,
    isFlexible: false,
    isActive: true,
    ...overrides,
  });
}

export async function createLeaveTypes(LeaveTypeModel) {
  return LeaveTypeModel.insertMany([
    { code: "ANNUAL", name: "Annual Leave", defaultQuotaDays: 12, isPaid: true, requiresApproval: true, isActive: true },
    { code: "SICK", name: "Sick Leave", defaultQuotaDays: 10, isPaid: true, requiresApproval: false, isActive: true },
    { code: "UNPAID", name: "Unpaid Leave", defaultQuotaDays: 0, isPaid: false, requiresApproval: true, isActive: true },
  ]);
}

export async function createUser(UserModel, role, overrides = {}) {
  const hashed = await hashPassword();
  const defaults = {
    email: `${role.toLowerCase()}@test.com`,
    password: hashed,
    name: `Test ${role}`,
    role,
    isVerified: true,
    isActive: true,
    isTrial: false,
    leaveBalance: {
      annual: { total: 12, used: 0, remaining: 12, pending: 0 },
      sick: { total: 10, used: 0, remaining: 10, pending: 0 },
      unpaid: { total: 999, used: 0, remaining: 999, pending: 0 },
    },
    baseSalary: 10_000_000,
    position: "Staff",
  };
  return UserModel.create({ ...defaults, ...overrides });
}

// Creates the standard set of users used across all integration tests.
export async function seedAllUsers(UserModel) {
  const roles = [
    "SUPER_ADMIN",
    "ADMIN",
    "HR_MANAGER",
    "MANAGER",
    "EMPLOYEE",
  ];
  const users = {};
  for (const role of roles) {
    users[role.toLowerCase()] = await createUser(UserModel, role);
  }

  // Trial user — not yet expired
  users.trialActive = await createUser(UserModel, "TRIAL", {
    email: "trial@test.com",
    name: "Trial User",
    isTrial: true,
    trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Trial user — already expired
  users.trialExpired = await createUser(UserModel, "TRIAL", {
    email: "trialexpired@test.com",
    name: "Expired Trial User",
    isTrial: true,
    trialExpiresAt: new Date(Date.now() - 1000), // expired 1 second ago
  });

  return users;
}

// Returns a JWT for the given user (bypasses login flow for speed).
export async function tokenFor(user) {
  const { generateAccessToken } = await import("../../src/utils/jwt.util.js");
  return generateAccessToken({
    userId: user._id,
    email: user.email,
    role: user.role,
    department_id: user.department,
    companyId: user.companyId ?? null,
  });
}

export { DEFAULT_PASSWORD };
