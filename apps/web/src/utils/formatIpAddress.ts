/**
 * Chuẩn hóa IP để hiển thị: proxy (chuỗi nhiều IP), IPv6 loopback, IPv4-mapped IPv6.
 */
export function formatIpAddress(ipAddress: string | null | undefined): string {
  if (!ipAddress) return '—';
  const firstIp = ipAddress.split(',')[0]?.trim() || ipAddress;
  if (firstIp === '::1') return '127.0.0.1 (localhost)';
  return firstIp.replace(/^::ffff:/, '');
}
