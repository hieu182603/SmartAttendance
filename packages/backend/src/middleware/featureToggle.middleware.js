import { FeatureToggleModel } from "../modules/feature-toggle/featureToggle.model.js";

/**
 * Resolve the effective enabled state for one feature given the current user.
 * Precedence (highest → lowest):
 *   1. Per-company override
 *   2. Global enabled flag
 *   3. Per-role disable list
 *
 * Unknown features (not in DB) default to `true` — consistent with checkFeature().
 */
function resolveEffective(feature, userRole, companyId) {
  if (companyId) {
    const override = feature.companyOverrides?.find(
      (o) => o.companyId?.toString() === companyId
    );
    if (override !== undefined) return override.enabled;
  }
  if (!feature.enabled) return false;
  if (userRole && feature.disabledForRoles?.includes(userRole)) return false;
  return true;
}

/**
 * Express middleware factory that enforces a feature-toggle gate on a route.
 *
 * Usage:
 *   router.use(requireFeatureEnabled("payroll"));
 *   router.get("/...", requireFeatureEnabled("attendance"), handler);
 *
 * Behaviour:
 *  - SUPER_ADMIN always bypasses (platform admin must never be locked out).
 *  - If the feature document is not found in the DB the feature is treated as
 *    enabled (unknown = on), matching the behaviour of checkFeature().
 *  - Returns 403 when the feature is disabled for the current user's role or
 *    company.
 *  - Returns 503 on a DB error so upstream callers can distinguish a toggle
 *    block from a hard server error.
 *
 * @param {string} featureKey  Canonical key from DEFAULT_FEATURES vocabulary.
 */
export function requireFeatureEnabled(featureKey) {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const companyId = req.user?.companyId?.toString();

      // SUPER_ADMIN is always allowed — they manage the toggles themselves.
      if (userRole === "SUPER_ADMIN") return next();

      const feature = await FeatureToggleModel.findOne({ featureKey }).lean();

      // Feature not seeded yet — treat as enabled (fail-open for unknown keys).
      if (!feature) return next();

      const enabled = resolveEffective(feature, userRole, companyId);
      if (!enabled) {
        return res.status(403).json({
          success: false,
          message: `Chức năng "${featureKey}" hiện không khả dụng cho tài khoản của bạn.`,
          code: "FEATURE_DISABLED",
        });
      }

      return next();
    } catch (err) {
      console.error("[featureToggle.middleware] Error checking feature:", featureKey, err.message);
      // Return 503 instead of silently bypassing — prevents a DB outage from
      // accidentally un-gating disabled features.
      return res.status(503).json({
        success: false,
        message: "Không thể kiểm tra trạng thái tính năng. Vui lòng thử lại.",
        code: "FEATURE_CHECK_FAILED",
      });
    }
  };
}
