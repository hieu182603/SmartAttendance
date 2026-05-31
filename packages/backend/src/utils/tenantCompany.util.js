/**
 * Phạm vi công ty cho API đọc danh sách.
 * SUPER_ADMIN: ?companyId= từ bộ lọc nền tảng (null = tất cả công ty).
 * Role khác: companyId từ JWT.
 */
export function resolveTenantCompanyId(req) {
  if (req.user?.role === 'SUPER_ADMIN') {
    const q = req.query.companyId;
    return q && String(q).trim() ? String(q).trim() : null;
  }
  return req.user?.companyId ?? null;
}

/**
 * Kiểm tra requester có được truy cập user thuộc tenant khác không.
 * @param {{ role?: string, companyId?: unknown }} requester
 * @param {{ companyId?: unknown }} targetUser
 */
export function canAccessUserTenant(requester, targetUser) {
  if (!requester?.role || !targetUser) return false;
  if (requester.role === "SUPER_ADMIN") return true;

  const reqCo = requester.companyId?.toString?.() ?? null;
  const tgtCo = targetUser.companyId?.toString?.() ?? null;

  // Legacy/test: cả hai không có companyId → cùng môi trường đơn-tenant
  if (reqCo === null && tgtCo === null) return true;
  return reqCo !== null && reqCo === tgtCo;
}

export class TenantAccessError extends Error {
  constructor(message = "Bạn không có quyền truy cập dữ liệu này.") {
    super(message);
    this.name = "TenantAccessError";
    this.statusCode = 403;
  }
}
