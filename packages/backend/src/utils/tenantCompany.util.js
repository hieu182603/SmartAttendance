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
