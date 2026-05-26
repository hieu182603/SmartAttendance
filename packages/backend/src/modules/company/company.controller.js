import { CompanyModel } from "./company.model.js";
import { UserModel } from "../users/user.model.js";
import { OrderModel } from "../billing/order.model.js";

const PLAN_IDS = ["trial", "starter", "standard", "premium"];

export class CompanyController {
  static async list(req, res) {
    try {
      const { page = 1, limit = 20, search, plan, isActive } = req.query;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
      const filter = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }
      if (plan && plan !== "all" && PLAN_IDS.includes(plan)) {
        filter.plan = plan;
      }
      if (isActive === "true") filter.isActive = true;
      if (isActive === "false") filter.isActive = false;

      const companies = await CompanyModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();
      const companyIds = companies.map((c) => c._id);
      const userCounts = companyIds.length
        ? await UserModel.aggregate([
            { $match: { companyId: { $in: companyIds } } },
            { $group: { _id: "$companyId", count: { $sum: 1 } } },
          ])
        : [];
      const countByCompany = Object.fromEntries(
        userCounts.map((row) => [row._id.toString(), row.count])
      );
      const items = companies.map((c) => ({
        ...c,
        userCount: countByCompany[c._id.toString()] ?? 0,
      }));
      const total = await CompanyModel.countDocuments(filter);
      return res.json({ data: items, total, page: pageNum, limit: limitNum });
    } catch (err) {
      console.error("[company] list error", err);
      return res.status(500).json({ message: "Không lấy được danh sách công ty" });
    }
  }

  static async get(req, res) {
    try {
      const company = await CompanyModel.findById(req.params.id).lean();
      if (!company) return res.status(404).json({ message: "Không tìm thấy công ty" });
      const userCount = await UserModel.countDocuments({ companyId: company._id });
      return res.json({ data: { ...company, userCount } });
    } catch (err) {
      console.error("[company] get error", err);
      return res.status(500).json({ message: "Không lấy được thông tin công ty" });
    }
  }

  static async update(req, res) {
    try {
      const { plan, isActive, maxUsers, name, email, phone } = req.body;
      const updateData = {};
      if (plan !== undefined) updateData.plan = plan;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      const company = await CompanyModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).lean();
      if (!company) return res.status(404).json({ message: "Không tìm thấy công ty" });
      return res.json({ data: company });
    } catch (err) {
      console.error("[company] update error", err);
      return res.status(500).json({ message: "Không cập nhật được công ty" });
    }
  }

  static async remove(req, res) {
    try {
      const company = await CompanyModel.findById(req.params.id);
      if (!company) return res.status(404).json({ message: "Không tìm thấy công ty" });

      const userCount = await UserModel.countDocuments({ companyId: company._id });
      if (userCount > 0) {
        return res.status(409).json({
          message: `Không thể xóa: công ty còn ${userCount} tài khoản. Vui lòng vô hiệu hóa hoặc gỡ người dùng trước.`,
        });
      }

      await OrderModel.deleteMany({ companyId: company._id });
      await CompanyModel.findByIdAndDelete(company._id);
      return res.json({ success: true, message: "Đã xóa công ty" });
    } catch (err) {
      console.error("[company] remove error", err);
      return res.status(500).json({ message: "Không xóa được công ty" });
    }
  }
}
