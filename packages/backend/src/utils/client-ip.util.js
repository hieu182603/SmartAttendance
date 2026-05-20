/**
 * Lấy địa chỉ IP client từ Express (ưu tiên proxy headers, chuẩn hóa loopback).
 * @param {import('express').Request | null | undefined} req
 * @returns {string | null}
 */
export const getClientIpAddress = (req) => {
    if (!req || typeof req !== "object") return null;

    const forwardedFor = req.headers?.["x-forwarded-for"];
    const firstForwarded = Array.isArray(forwardedFor)
        ? forwardedFor[0]?.split(",")[0]?.trim()
        : forwardedFor?.split(",")[0]?.trim();

    const realIpHeader = req.headers?.["x-real-ip"];
    const realIp = Array.isArray(realIpHeader) ? realIpHeader[0] : realIpHeader;

    const rawIp =
        firstForwarded ||
        realIp ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        null;

    if (!rawIp) return null;
    if (rawIp === "::1") return "127.0.0.1";
    return rawIp.replace(/^::ffff:/, "");
};
