import { FeatureToggleModel, DEFAULT_FEATURES } from "./featureToggle.model.js";

/**
 * Resolve effective enabled state for one feature document given a user context.
 * Mirrors the precedence in checkFeature():
 *   1. Company override (highest priority)
 *   2. Global enabled flag
 *   3. Per-role disable list
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
 * Synchronizes the feature toggles in the database with DEFAULT_FEATURES.
 * Removes legacy keys and inserts any missing default features.
 */
async function syncDefaultFeatures() {
  const existing = await FeatureToggleModel.find().lean();
  const existingKeys = existing.map((f) => f.featureKey);
  const defaultKeys = DEFAULT_FEATURES.map((f) => f.featureKey);

  const keysToDelete = existingKeys.filter((k) => !defaultKeys.includes(k));
  if (keysToDelete.length > 0) {
    await FeatureToggleModel.deleteMany({ featureKey: { $in: keysToDelete } });
    console.log(`[featureToggle] Cleaned up legacy toggles: ${keysToDelete.join(", ")}`);
  }

  const missingFeatures = DEFAULT_FEATURES.filter((f) => !existingKeys.includes(f.featureKey));
  if (missingFeatures.length > 0) {
    await FeatureToggleModel.insertMany(missingFeatures);
    console.log(`[featureToggle] Seeded missing toggles: ${missingFeatures.map(f => f.featureKey).join(", ")}`);
  }
}

/**
 * GET /api/feature-toggles
 * SUPER_ADMIN: list all feature toggles. Seeds/syncs defaults.
 */
export async function getAll(req, res) {
  try {
    await syncDefaultFeatures();
    const features = await FeatureToggleModel.find().sort("featureKey").lean();
    return res.json({ success: true, data: features });
  } catch (err) {
    console.error("[featureToggle] getAll:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/feature-toggles/:featureKey
 * Body: { enabled?, disabledForRoles?, companyOverrides? }
 */
export async function update(req, res) {
  try {
    const { featureKey } = req.params;
    const { enabled, disabledForRoles, companyOverrides } = req.body;

    const updateData = { updatedBy: req.user?.userId };
    if (enabled !== undefined) updateData.enabled = enabled;
    if (disabledForRoles !== undefined) updateData.disabledForRoles = disabledForRoles;
    if (companyOverrides !== undefined) updateData.companyOverrides = companyOverrides;

    const feature = await FeatureToggleModel.findOneAndUpdate(
      { featureKey },
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!feature) return res.status(404).json({ success: false, message: "Feature không tồn tại" });
    return res.json({ success: true, data: feature });
  } catch (err) {
    console.error("[featureToggle] update:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/feature-toggles/effective
 * Available to any authenticated user.
 * Returns { featureKey: effectiveEnabled } map for ALL features, resolved for
 * the current user's role and company — same precedence as checkFeature().
 */
export async function getEffectiveToggles(req, res) {
  try {
    const userRole = req.user?.role;
    const companyId = req.user?.companyId?.toString();

    await syncDefaultFeatures();
    const features = await FeatureToggleModel.find().sort("featureKey").lean();

    const effective = {};
    for (const f of features) {
      effective[f.featureKey] = resolveEffective(f, userRole, companyId);
    }

    return res.json({ success: true, data: effective });
  } catch (err) {
    console.error("[featureToggle] getEffectiveToggles:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/feature-toggles/check/:featureKey?companyId=...&role=...
 * Available to any authenticated user — returns whether feature is enabled for them.
 */
export async function checkFeature(req, res) {
  try {
    const { featureKey } = req.params;
    const userRole = req.user?.role;
    const companyId = req.user?.companyId?.toString();

    const feature = await FeatureToggleModel.findOne({ featureKey }).lean();
    if (!feature) return res.json({ success: true, data: { enabled: true } }); // unknown = enabled

    // Company-level override takes priority
    if (companyId) {
      const override = feature.companyOverrides?.find((o) => o.companyId?.toString() === companyId);
      if (override) {
        return res.json({ success: true, data: { enabled: override.enabled } });
      }
    }

    // Global off → disabled for all
    if (!feature.enabled) return res.json({ success: true, data: { enabled: false } });

    // Per-role disable
    if (userRole && feature.disabledForRoles?.includes(userRole)) {
      return res.json({ success: true, data: { enabled: false } });
    }

    return res.json({ success: true, data: { enabled: true } });
  } catch (err) {
    console.error("[featureToggle] checkFeature:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
