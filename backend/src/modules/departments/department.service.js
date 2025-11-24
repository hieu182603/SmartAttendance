import { DepartmentModel } from "./department.model.js";
import { UserModel } from "../users/user.model.js";
import { BranchModel } from "../branches/branch.model.js";

export class DepartmentService {
  /**
   * Tạo phòng ban mới
   */
  static async createDepartment(data) {
    // Kiểm tra code đã tồn tại chưa
    const existingDepartment = await DepartmentModel.findOne({ code: data.code.toUpperCase() });
    if (existingDepartment) {
      throw new Error("Mã phòng ban đã tồn tại");
    }

    // Kiểm tra branchId có tồn tại không
    const branch = await BranchModel.findById(data.branchId);
    if (!branch) {
      throw new Error("Không tìm thấy chi nhánh");
    }

    // Kiểm tra managerId có tồn tại không
    if (data.managerId) {
      const manager = await UserModel.findById(data.managerId);
      if (!manager) {
        throw new Error("Không tìm thấy trưởng phòng");
      }
    }

    const department = await DepartmentModel.create({
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      branchId: data.branchId,
      managerId: data.managerId,
      budget: data.budget || 0,
      status: data.status || "active",
    });

    return department;
  }

  /**
   * Lấy danh sách phòng ban
   */
  static async getAllDepartments(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      branchId = "",
      status = "",
    } = options;

    const query = {};

    // Tìm kiếm
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo branchId
    if (branchId && branchId !== "all") {
      query.branchId = branchId;
    }

    // Lọc theo status
    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [departments, total] = await Promise.all([
      DepartmentModel.find(query)
        .populate("branchId", "name code")
        .populate("managerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DepartmentModel.countDocuments(query),
    ]);

    // Tính toán stats cho mỗi department
    const departmentsWithStats = await Promise.all(
      departments.map(async (department) => {
        const employeeCount = await UserModel.countDocuments({ department: department._id });
        const activeEmployees = await UserModel.countDocuments({
          department: department._id,
          isActive: true,
        });

        return {
          ...department.toObject(),
          employeeCount,
          activeEmployees,
        };
      })
    );

    return {
      departments: departmentsWithStats,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  /**
   * Lấy thống kê tổng
   */
  static async getAllDepartmentsStats() {
    const [departments, totalEmployees, activeEmployees, totalBudget] = await Promise.all([
      DepartmentModel.find({}),
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isActive: true }),
      DepartmentModel.aggregate([{ $group: { _id: null, total: { $sum: "$budget" } } }]),
    ]);

    // Tính tổng nhân viên theo department
    const employeeCountByDepartment = await UserModel.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);

    const totalEmployeesInDepartments = employeeCountByDepartment.reduce(
      (sum, item) => sum + item.count,
      0
    );

    return {
      total: departments.length,
      totalEmployees: totalEmployeesInDepartments,
      activeEmployees: activeEmployees,
      totalBudget: totalBudget[0]?.total || 0,
    };
  }

  /**
   * Lấy chi tiết 1 phòng ban
   */
  static async getDepartmentById(id) {
    const department = await DepartmentModel.findById(id)
      .populate("branchId", "name code city")
      .populate("managerId", "name email role");

    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    // Tính stats
    const employeeCount = await UserModel.countDocuments({ department: department._id });
    const activeEmployees = await UserModel.countDocuments({
      department: department._id,
      isActive: true,
    });

    return {
      ...department.toObject(),
      employeeCount,
      activeEmployees,
    };
  }

  /**
   * Cập nhật phòng ban
   */
  static async updateDepartment(id, data) {
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    // Kiểm tra code trùng (nếu có thay đổi)
    if (data.code && data.code.toUpperCase() !== department.code) {
      const existingDepartment = await DepartmentModel.findOne({ code: data.code.toUpperCase() });
      if (existingDepartment) {
        throw new Error("Mã phòng ban đã tồn tại");
      }
    }

    // Kiểm tra branchId
    if (data.branchId) {
      const branch = await BranchModel.findById(data.branchId);
      if (!branch) {
        throw new Error("Không tìm thấy chi nhánh");
      }
    }

    // Kiểm tra managerId
    if (data.managerId) {
      const manager = await UserModel.findById(data.managerId);
      if (!manager) {
        throw new Error("Không tìm thấy trưởng phòng");
      }
    }

    // Cập nhật
    if (data.name) department.name = data.name;
    if (data.code) department.code = data.code.toUpperCase();
    if (data.description !== undefined) department.description = data.description;
    if (data.branchId) department.branchId = data.branchId;
    if (data.managerId !== undefined) department.managerId = data.managerId;
    if (data.budget !== undefined) department.budget = data.budget;
    if (data.status) department.status = data.status;

    await department.save();

    return department;
  }

  /**
   * Xóa phòng ban
   */
  static async deleteDepartment(id) {
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    // Kiểm tra có nhân viên không
    const employeeCount = await UserModel.countDocuments({ department: department._id });
    if (employeeCount > 0) {
      throw new Error("Không thể xóa phòng ban vì còn nhân viên");
    }

    await DepartmentModel.findByIdAndDelete(id);

    return { message: "Đã xóa phòng ban thành công" };
  }
}

