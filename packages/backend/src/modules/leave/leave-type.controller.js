import {
  createLeaveTypeSchema as createSchema,
  updateLeaveTypeSchema as updateSchema,
} from "@smartattendance/shared";
import { LeaveTypeModel } from "./leave-type.model.js";
import { ensureDefaultLeaveTypes } from "./leave-type.defaults.js";
import { resolveTenantCompanyId } from "../../utils/tenantCompany.util.js";

export const listLeaveTypes = async (req, res) => {
  try {
    const companyId = resolveTenantCompanyId(req);
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin || companyId) {
      await ensureDefaultLeaveTypes(companyId);
    }
    const { activeOnly } = req.query;
    const filter = isSuperAdmin && !companyId
      ? {}
      : { $or: [{ companyId }, { companyId: null }] };
    if (String(activeOnly) === "true") filter.isActive = true;
    const items = await LeaveTypeModel.find(filter).sort({ code: 1 }).lean();
    return res.json({ data: items });
  } catch (error) {
    console.error("[leave-type] list error", error);
    return res.status(500).json({ message: "Không lấy được danh sách loại phép" });
  }
};

export const getLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? null;
    const item = await LeaveTypeModel.findById(id).lean();
    if (!item) return res.status(404).json({ message: "Không tìm thấy loại phép" });
    // Allow access to own records and platform-wide defaults only
    const ownedByCompany = item.companyId?.toString() === companyId?.toString();
    const isGlobal = item.companyId == null;
    if (!ownedByCompany && !isGlobal) return res.status(404).json({ message: "Không tìm thấy loại phép" });
    return res.json({ data: item });
  } catch (error) {
    console.error("[leave-type] get error", error);
    return res.status(500).json({ message: "Không lấy được loại phép" });
  }
};

export const createLeaveType = async (req, res) => {
  try {
    const parse = createSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parse.error.flatten() });
    }
    const data = parse.data;
    const companyId = req.user?.companyId ?? null;
    // Scope duplicate check to this company only
    const existed = await LeaveTypeModel.findOne({ code: data.code.toLowerCase(), companyId });
    if (existed) return res.status(409).json({ message: "Code đã tồn tại" });

    const created = await LeaveTypeModel.create({
      ...data,
      code: data.code.toLowerCase(),
      companyId,
      createdBy: req.user?.userId,
    });
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error("[leave-type] create error", error);
    return res.status(500).json({ message: "Không tạo được loại phép" });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const parse = updateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: parse.error.flatten() });
    }
    const companyId = req.user?.companyId ?? null;
    const item = await LeaveTypeModel.findById(id);
    if (!item || item.companyId?.toString() !== companyId?.toString()) {
      return res.status(404).json({ message: "Không tìm thấy loại phép" });
    }
    const updated = await LeaveTypeModel.findByIdAndUpdate(id, parse.data, { new: true });
    return res.json({ data: updated });
  } catch (error) {
    console.error("[leave-type] update error", error);
    return res.status(500).json({ message: "Không cập nhật được loại phép" });
  }
};

export const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? null;
    const item = await LeaveTypeModel.findById(id);
    if (!item || item.companyId?.toString() !== companyId?.toString()) {
      return res.status(404).json({ message: "Không tìm thấy loại phép" });
    }
    await LeaveTypeModel.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (error) {
    console.error("[leave-type] delete error", error);
    return res.status(500).json({ message: "Không xoá được loại phép" });
  }
};
