import { FeatureToggleModel, DEFAULT_FEATURES } from "./featureToggle.model.js";

/**
 * GET /api/feature-toggles
 * SUPER_ADMIN: list all feature toggles. Seeds defaults if empty.
 */
export async function getAll(req, res) {
  try {
    let features = await FeatureToggleModel.find().sort("featureKey").lean();
    if (features.length === 0) {
      await FeatureToggleModel.insertMany(DEFAULT_FEATURES);
      features = await FeatureToggleModel.find().sort("featureKey").lean();
    }
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
 * POST /api/feature-toggles
 * Body: { featureKey, name, description?, category?, enabled? }
 */
export async function create(req, res) {
  try {
    const { featureKey, name, description, category, enabled } = req.body;
    if (!featureKey || !name) {
      return res.status(400).json({ success: false, message: "featureKey và name là bắt buộc" });
    }
    const feature = await FeatureToggleModel.create({
      featureKey,
      name,
      description,
      category,
      enabled: enabled !== undefined ? enabled : true,
      updatedBy: req.user?.userId,
    });
    return res.status(201).json({ success: true, data: feature });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "featureKey đã tồn tại" });
    }
    console.error("[featureToggle] create:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/feature-toggles/:featureKey
 */
export async function remove(req, res) {
  try {
    const { featureKey } = req.params;
    const feature = await FeatureToggleModel.findOneAndDelete({ featureKey });
    if (!feature) return res.status(404).json({ success: false, message: "Feature không tồn tại" });
    return res.json({ success: true, message: "Đã xóa feature" });
  } catch (err) {
    console.error("[featureToggle] remove:", err.message);
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
