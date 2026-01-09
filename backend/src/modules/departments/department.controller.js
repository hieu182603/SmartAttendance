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

  /**
   * POST /api/departments/:id/transfer
   * Chuyển nhân viên từ phòng ban này sang phòng ban khác
   */
  static async transferEmployees(req, res) {
    try {
      const { id } = req.params;
      const { targetDepartmentId } = req.body;

      if (!targetDepartmentId) {
        return res.status(400).json({ message: "Vui lòng chọn phòng ban đích" });
      }

      const result = await DepartmentService.transferEmployees(id, targetDepartmentId);
      res.json(result);
    } catch (error) {
      console.error("[departments] transferEmployees error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("Không thể chuyển") ||
        error.message.includes("khác chi nhánh")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không chuyển được nhân viên" });
    }
  }

  /**
   * POST /api/departments/:id/merge
   * Sáp nhập phòng ban: Chuyển nhân viên và vô hiệu hóa phòng ban nguồn
   */
  static async mergeDepartments(req, res) {
    try {
      const { id } = req.params;
      const { targetDepartmentId } = req.body;

      if (!targetDepartmentId) {
        return res.status(400).json({ message: "Vui lòng chọn phòng ban đích để sáp nhập" });
      }

      const result = await DepartmentService.mergeDepartments(id, targetDepartmentId);
      res.json(result);
    } catch (error) {
      console.error("[departments] mergeDepartments error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("Không thể") ||
        error.message.includes("khác chi nhánh")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không sáp nhập được phòng ban" });
    }
  }

  /**
   * GET /api/departments/:id/employees
   * Lấy danh sách nhân viên của phòng ban (cho preview)
   */
  static async getDepartmentEmployees(req, res) {
    try {
      const { id } = req.params;
      const employees = await DepartmentService.getDepartmentEmployees(id);
      res.json(employees);
    } catch (error) {
      console.error("[departments] getDepartmentEmployees error:", error);
      if (error.message === "Không tìm thấy phòng ban") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không lấy được thông tin nhân viên" });
    }
  }

  /**
   * GET /api/departments/list
   * Lấy danh sách đơn giản (cho dropdown)
   */
  static async getDepartmentsList(req, res) {
    try {
      const { branchId } = req.query;
      const departments = await DepartmentService.getDepartmentsList(branchId);
      res.json({ departments });
    } catch (error) {
      console.error("[departments] getDepartmentsList error:", error);
      res.status(500).json({ message: error.message || "Không lấy được danh sách" });
    }
  }

  /**
   * POST /api/departments/:id/reactivate
   * Kích hoạt lại phòng ban
   */
  static async reactivateDepartment(req, res) {
    try {
      const { id } = req.params;
      const result = await DepartmentService.reactivateDepartment(id);
      res.json(result);
    } catch (error) {
      console.error("[departments] reactivateDepartment error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("đang hoạt động") ||
        error.message.includes("chi nhánh không hoạt động")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không thể kích hoạt lại phòng ban" });
    }
  }

  /**
   * POST /api/departments/:id/transfer-selected
   * Chuyển nhân viên có chọn lọc
   */
  static async transferSelectedEmployees(req, res) {
    try {
      const { id } = req.params;
      const { targetDepartmentId, employeeIds } = req.body;

      if (!targetDepartmentId) {
        return res.status(400).json({ message: "Vui lòng chọn phòng ban đích" });
      }

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: "Vui lòng chọn ít nhất một nhân viên" });
      }

      const result = await DepartmentService.transferSelectedEmployees(id, targetDepartmentId, employeeIds);
      res.json(result);
    } catch (error) {
      console.error("[departments] transferSelectedEmployees error:", error);
      if (
        error.message.includes("Không tìm thấy") ||
        error.message.includes("Không thể chuyển") ||
        error.message.includes("khác chi nhánh") ||
        error.message.includes("không thuộc")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Không chuyển được nhân viên" });
    }
  }
}

