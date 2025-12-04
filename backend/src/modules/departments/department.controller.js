import { DepartmentService } from "./department.service.js";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Tên phòng ban không được để trống"),
  code: z.string().min(1, "Mã phòng ban không được để trống"),
  description: z.string().optional(),
  branchId: z.string().min(1, "Chi nhánh không được để trống"),
  managerId: z.string().min(1, "Trưởng phòng không được để trống"),
  budget: z.number().min(0, "Ngân sách phải >= 0").optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  branchId: z.string().optional(),
  managerId: z.string().optional(),
  budget: z.number().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export class DepartmentController {
  /**
   * GET /api/departments
   * Lấy danh sách phòng ban
   */
  static async getAllDepartments(req, res) {
    try {
      const { page, limit, search, branchId, status } = req.query;

      const result = await DepartmentService.getAllDepartments({
        page,
        limit,
        search,
        branchId,
        status,
      });

      res.json(result);
    } catch (error) {
      console.error("[departments] getAllDepartments error:", error);
      res.status(500).json({ message: error.message || "Không lấy được danh sách phòng ban" });
    }
  }

  /**
   * GET /api/departments/stats
   * Lấy thống kê tổng
   */
  static async getStats(req, res) {
    try {
      const stats = await DepartmentService.getAllDepartmentsStats();
      res.json(stats);
    } catch (error) {
      console.error("[departments] getStats error:", error);
      res.status(500).json({ message: error.message || "Không lấy được thống kê" });
    }
  }

  /**
   * GET /api/departments/:id
   * Lấy chi tiết 1 phòng ban
   */
  static async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      const department = await DepartmentService.getDepartmentById(id);
      res.json({ department });
    } catch (error) {
      console.error("[departments] getDepartmentById error:", error);
      if (error.message === "Không tìm thấy phòng ban") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không lấy được thông tin phòng ban" });
    }
  }

  /**
   * POST /api/departments
   * Tạo phòng ban mới
   */
  static async createDepartment(req, res) {
    try {
      // Validate
      const parse = createDepartmentSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const department = await DepartmentService.createDepartment(parse.data);

      res.status(201).json({
        department,
        message: "Đã tạo phòng ban thành công",
      });
    } catch (error) {
      console.error("[departments] createDepartment error:", error);
      if (error.message.includes("đã tồn tại") || error.message.includes("Không tìm thấy")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không tạo được phòng ban" });
    }
  }

  /**
   * PUT /api/departments/:id
   * Cập nhật phòng ban
   */
  static async updateDepartment(req, res) {
    try {
      const { id } = req.params;

      // Validate
      const parse = updateDepartmentSchema.safeParse(req.body);
      if (!parse.success) {
        const errors = parse.error.flatten();
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: errors,
        });
      }

      const department = await DepartmentService.updateDepartment(id, parse.data);

      res.json({
        department,
        message: "Đã cập nhật phòng ban thành công",
      });
    } catch (error) {
      console.error("[departments] updateDepartment error:", error);
      if (error.message === "Không tìm thấy phòng ban" || error.message.includes("đã tồn tại")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không cập nhật được phòng ban" });
    }
  }

  /**
   * DELETE /api/departments/:id
   * Xóa phòng ban (Soft Delete)
   */
  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      const result = await DepartmentService.deleteDepartment(id);

      res.json({ message: result.message || "Đã vô hiệu hóa phòng ban thành công" });
    } catch (error) {
      console.error("[departments] deleteDepartment error:", error);
      if (
        error.message === "Không tìm thấy phòng ban" ||
        error.message.includes("Không thể xóa") ||
        error.message.includes("đã bị xóa")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không xóa được phòng ban" });
    }
  }
}

