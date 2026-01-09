import { BranchService } from "./branch.service.js";
import { z } from "zod";

const createBranchSchema = z.object({
  name: z.string().min(1, "Tên chi nhánh không được để trống"),
  code: z.string().min(1, "Mã chi nhánh không được để trống"),
  latitude: z.number().min(-90, "Vĩ độ phải từ -90 đến 90").max(90, "Vĩ độ phải từ -90 đến 90"),
  longitude: z.number().min(-180, "Kinh độ phải từ -180 đến 180").max(180, "Kinh độ phải từ -180 đến 180"),
  city: z.string().min(1, "Thành phố không được để trống"),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  managerId: z.string().min(1, "Giám đốc chi nhánh không được để trống"),
  timezone: z.string().optional(),
  establishedDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  city: z.string().min(1).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  managerId: z.string().optional(),
  timezone: z.string().optional(),
  establishedDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export class BranchController {
  /**
   * GET /api/branches
   * Lấy danh sách chi nhánh
   */
  static async getAllBranches(req, res) {
    try {
      const { page, limit, search, status } = req.query;

      const result = await BranchService.getAllBranches({
        page,
        limit,
        search,
        status,
      });

      res.json(result);
    } catch (error) {
      console.error("[branches] getAllBranches error:", error);
      res.status(500).json({ message: error.message || "Không lấy được danh sách chi nhánh" });
    }
  }

  /**
   * GET /api/branches/stats
   * Lấy thống kê tổng
   */
  static async getStats(req, res) {
    try {
      const stats = await BranchService.getAllBranchesStats();
      res.json(stats);
    } catch (error) {
      console.error("[branches] getStats error:", error);
      res.status(500).json({ message: error.message || "Không lấy được thống kê" });
    }
  }

  /**
   * GET /api/branches/list
   * Lấy danh sách đơn giản (cho dropdown)
   */
  static async getBranchesList(req, res) {
    try {
      const branches = await BranchService.getBranchesList();
      res.json({ branches });
    } catch (error) {
      console.error("[branches] getBranchesList error:", error);
      res.status(500).json({ message: error.message || "Không lấy được danh sách" });
    }
  }

  /**
   * GET /api/branches/:id
   * Lấy chi tiết 1 chi nhánh
   */
  static async getBranchById(req, res) {
    try {
      const { id } = req.params;
      const branch = await BranchService.getBranchById(id);
      res.json({ branch });
    } catch (error) {
      console.error("[branches] getBranchById error:", error);
      if (error.message === "Không tìm thấy chi nhánh") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không lấy được thông tin chi nhánh" });
    }
  }

  /**
   * POST /api/branches
   * Tạo chi nhánh mới
   */
  static async createBranch(req, res) {
    try {
      // Validate
      const parse = createBranchSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const branch = await BranchService.createBranch(parse.data);

      res.status(201).json({
        branch,
        message: "Đã tạo chi nhánh thành công",
      });
    } catch (error) {
      console.error("[branches] createBranch error:", error);
      if (error.message.includes("đã tồn tại") || error.message.includes("Không tìm thấy")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không tạo được chi nhánh" });
    }
  }

  /**
   * PUT /api/branches/:id
   * Cập nhật chi nhánh
   */
  static async updateBranch(req, res) {
    try {
      const { id } = req.params;

      // Validate
      const parse = updateBranchSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const branch = await BranchService.updateBranch(id, parse.data);

      res.json({
        branch,
        message: "Đã cập nhật chi nhánh thành công",
      });
    } catch (error) {
      console.error("[branches] updateBranch error:", error);
      if (error.message === "Không tìm thấy chi nhánh" || error.message.includes("đã tồn tại")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không cập nhật được chi nhánh" });
    }
  }

  /**
   * DELETE /api/branches/:id
   * Xóa chi nhánh (Soft Delete)
   */
  static async deleteBranch(req, res) {
    try {
      const { id } = req.params;
      const result = await BranchService.deleteBranch(id);

      res.json({ message: result.message || "Đã vô hiệu hóa chi nhánh thành công" });
    } catch (error) {
      console.error("[branches] deleteBranch error:", error);
      if (
        error.message === "Không tìm thấy chi nhánh" ||
        error.message.includes("Không thể xóa") ||
        error.message.includes("trụ sở chính") ||
        error.message.includes("đã bị xóa")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không xóa được chi nhánh" });
    }
  }

  /**
   * POST /api/branches/:id/transfer
   * Chuyển tài nguyên từ chi nhánh này sang chi nhánh khác
   */
  static async transferResources(req, res) {
    try {
      const { id } = req.params;
      const { targetBranchId } = req.body;

      if (!targetBranchId) {
        return res.status(400).json({ message: "Vui lòng chọn chi nhánh đích" });
      }

      const result = await BranchService.transferResources(id, targetBranchId);
      res.json(result);
    } catch (error) {
      console.error("[branches] transferResources error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("Không thể chuyển") ||
        error.message.includes("trụ sở chính")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không chuyển được tài nguyên" });
    }
  }

  /**
   * POST /api/branches/:id/merge
   * Sáp nhập chi nhánh: Chuyển tài nguyên và vô hiệu hóa chi nhánh nguồn
   */
  static async mergeBranches(req, res) {
    try {
      const { id } = req.params;
      const { targetBranchId } = req.body;

      if (!targetBranchId) {
        return res.status(400).json({ message: "Vui lòng chọn chi nhánh đích để sáp nhập" });
      }

      const result = await BranchService.mergeBranches(id, targetBranchId);
      res.json(result);
    } catch (error) {
      console.error("[branches] mergeBranches error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("Không thể") ||
        error.message.includes("trụ sở chính")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không sáp nhập được chi nhánh" });
    }
  }

  /**
   * GET /api/branches/:id/resources
   * Lấy danh sách nhân viên và phòng ban của chi nhánh (cho preview)
   */
  static async getBranchResources(req, res) {
    try {
      const { id } = req.params;
      const resources = await BranchService.getBranchResources(id);
      res.json(resources);
    } catch (error) {
      console.error("[branches] getBranchResources error:", error);
      if (error.message === "Không tìm thấy chi nhánh") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không lấy được thông tin tài nguyên" });
    }
  }

  /**
   * POST /api/branches/:id/reactivate
   * Kích hoạt lại chi nhánh
   */
  static async reactivateBranch(req, res) {
    try {
      const { id } = req.params;
      const result = await BranchService.reactivateBranch(id);
      res.json(result);
    } catch (error) {
      console.error("[branches] reactivateBranch error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("đang hoạt động")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không thể kích hoạt lại chi nhánh" });
    }
  }
}

