/** Allow only same-app relative paths (blocks //evil.com and absolute URLs). */
export function isSafeRedirectPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (trimmed.includes("://") || trimmed.includes("\\")) return false;
  return /^\/[\w\-./?=&%]*$/.test(trimmed);
}

export function resolveSafeRedirect(
  path: string | null | undefined,
  fallback: string
): string {
  return isSafeRedirectPath(path) ? path!.trim() : fallback;
}
