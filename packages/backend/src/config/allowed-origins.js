/** Shared allowlist for CORS and PayOS return/cancel URLs. */
export function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
  ]
    .map((o) => o?.trim())
    .filter(Boolean);

  const devDefaults =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://localhost:8081"];

  return [...new Set([...fromEnv, ...devDefaults].map((o) => o.replace(/\/$/, "")))];
}

export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  return getAllowedOrigins().includes(origin.trim().replace(/\/$/, ""));
}

/**
 * Resolve frontend base URL for PayOS redirects — never trust raw Origin alone.
 * @param {string | undefined} originHeader
 * @returns {string}
 */
export function resolveFrontendBaseUrl(originHeader) {
  const normalized =
    typeof originHeader === "string" ? originHeader.trim().replace(/\/$/, "") : "";
  if (normalized && isAllowedOrigin(normalized)) {
    return normalized;
  }
  const fallback = process.env.FRONTEND_URL?.trim().replace(/\/$/, "");
  if (fallback) return fallback;
  return process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:5173";
}
