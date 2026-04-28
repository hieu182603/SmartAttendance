import { z } from "zod";
import { SystemConfigModel } from "./config.model.js";

const VALID_CATEGORIES = ["attendance", "payroll", "general", "security", "notification"];
const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER"];

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  category: z.enum(VALID_CATEGORIES),
  value: z.any(),
  description: z.string().optional(),
  editableBy: z.array(z.enum(VALID_ROLES)).optional(),
});

const updateSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
  editableBy: z.array(z.enum(VALID_ROLES)).optional(),
});

const canEdit = (config, role) => {
  if (role === "SUPER_ADMIN") return true;
  if (!Array.isArray(config.editableBy) || config.editableBy.length === 0) {
    return role === "ADMIN";
  }
  return config.editableBy.includes(role);
};

export const listConfigs = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) {
      if (!VALID_CATEGORIES.includes(String(category))) {
        return res.status(400).json({ message: "category không hợp lệ" });
      }
      filter.category = category;
    }
    const items = await SystemConfigModel.find(filter)
      .sort({ category: 1, key: 1 })
      .lean();
    return res.json({ data: items });
  } catch (error) {
    console.error("[config] list error", error);
    return res.status(500).json({ message: "Không lấy được cấu hình" });
  }
};

export const getConfigByKey = async (req, res) => {
  try {
    const key = String(req.params.key || "").toUpperCase();
    const item = await SystemConfigModel.findOne({ key }).lean();
    if (!item) return res.status(404).json({ message: "Không tìm thấy cấu hình" });
    return res.json({ data: item });
  } catch (error) {
    console.error("[config] get error", error);
    return res.status(500).json({ message: "Không lấy được cấu hình" });
  }
};

export const createConfig = async (req, res) => {
  try {
    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parse.error.flatten() });
    }
    const data = parse.data;
    const existed = await SystemConfigModel.findOne({ key: data.key.toUpperCase() });
    if (existed) {
      return res.status(409).json({ message: "Key đã tồn tại" });
    }
    const created = await SystemConfigModel.create({
      ...data,
      key: data.key.toUpperCase(),
      updatedBy: req.user?.userId,
    });
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("[config] create error", error);
    return res.status(500).json({ message: "Không tạo được cấu hình" });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const key = String(req.params.key || "").toUpperCase();
    const parse = updateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parse.error.flatten() });
    }

    const existing = await SystemConfigModel.findOne({ key });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy cấu hình" });

    if (!canEdit(existing, req.user?.role)) {
      return res.status(403).json({ message: "Không có quyền chỉnh sửa cấu hình này" });
    }

    existing.value = parse.data.value;
    if (parse.data.description !== undefined) existing.description = parse.data.description;
    if (parse.data.editableBy !== undefined) existing.editableBy = parse.data.editableBy;
    existing.updatedBy = req.user?.userId;
    await existing.save();

    return res.json({ data: existing });
  } catch (error) {
    console.error("[config] update error", error);
    return res.status(500).json({ message: "Không cập nhật được cấu hình" });
  }
};

export const deleteConfig = async (req, res) => {
  try {
    const key = String(req.params.key || "").toUpperCase();
    const existing = await SystemConfigModel.findOne({ key });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy cấu hình" });
    await existing.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    console.error("[config] delete error", error);
    return res.status(500).json({ message: "Không xoá được cấu hình" });
  }
};
