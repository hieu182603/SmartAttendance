import { BranchModel } from "./branch.model.js";
import { UserModel } from "../users/user.model.js";
import { DepartmentModel } from "../departments/department.model.js";

export class BranchService {
  /**
   * Tạo chi nhánh mới
   */
  static async createBranch(data) {
    // Kiểm tra code đã tồn tại chưa
    const existingBranch = await BranchModel.findOne({ code: data.code.toUpperCase() });
    if (existingBranch) {
      throw new Error("Mã chi nhánh đã tồn tại");
    }

    // Kiểm tra managerId có tồn tại không
    if (data.managerId) {
      const manager = await UserModel.findById(data.managerId);
      if (!manager) {
        throw new Error("Không tìm thấy giám đốc chi nhánh");
      }
    }

    const branch = await BranchModel.create({
      name: data.name,
      code: data.code.toUpperCase(),
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      country: data.country || "Việt Nam",
      phone: data.phone,
      email: data.email,
      managerId: data.managerId,
      establishedDate: data.establishedDate ? new Date(data.establishedDate) : new Date(),
      status: data.status || "active",
      timezone: data.timezone || "GMT+7",
    });

    return branch;
  }

  /**
   * Lấy danh sách chi nhánh
   */
  static async getAllBranches(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
    } = options;

    const query = {};

    // Tìm kiếm
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo status
    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [branches, total] = await Promise.all([
      BranchModel.find(query)
        .populate("managerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BranchModel.countDocuments(query),
    ]);

    // Tính toán stats cho mỗi branch
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        const employeeCount = await UserModel.countDocuments({ branch: branch._id });
        const departmentCount = await DepartmentModel.countDocuments({ branchId: branch._id });

        return {
          ...branch.toObject(),
          employeeCount,
          departmentCount,
        };
      })
    );

    return {
      branches: branchesWithStats,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  /**
   * Lấy thống kê tổng
   */
  static async getAllBranchesStats() {
    const [branches, totalEmployees, totalDepartments, activeBranches] = await Promise.all([
      BranchModel.find({}),
      UserModel.countDocuments({}),
      DepartmentModel.countDocuments({}),
      BranchModel.countDocuments({ status: "active" }),
    ]);

    // Tính tổng nhân viên và phòng ban theo branch
    const employeeCountByBranch = await UserModel.aggregate([
      { $group: { _id: "$branch", count: { $sum: 1 } } },
    ]);

    const departmentCountByBranch = await DepartmentModel.aggregate([
      { $group: { _id: "$branchId", count: { $sum: 1 } } },
    ]);

    const totalEmployeesInBranches = employeeCountByBranch.reduce((sum, item) => sum + item.count, 0);
    const totalDepartmentsInBranches = departmentCountByBranch.reduce((sum, item) => sum + item.count, 0);

    return {
      total: branches.length,
      totalEmployees: totalEmployeesInBranches,
      totalDepartments: totalDepartmentsInBranches,
      active: activeBranches,
    };
  }

  /**
   * Lấy chi tiết 1 chi nhánh
   */
  static async getBranchById(id) {
    const branch = await BranchModel.findById(id).populate("managerId", "name email role");

    if (!branch) {
      throw new Error("Không tìm thấy chi nhánh");
    }

    // Tính stats
    const employeeCount = await UserModel.countDocuments({ branch: branch._id });
    const departmentCount = await DepartmentModel.countDocuments({ branchId: branch._id });

    return {
      ...branch.toObject(),
      employeeCount,
      departmentCount,
    };
  }

  /**
   * Cập nhật chi nhánh
   */
  static async updateBranch(id, data) {
    const branch = await BranchModel.findById(id);
    if (!branch) {
      throw new Error("Không tìm thấy chi nhánh");
    }

    // Kiểm tra code trùng (nếu có thay đổi)
    if (data.code && data.code.toUpperCase() !== branch.code) {
      const existingBranch = await BranchModel.findOne({ code: data.code.toUpperCase() });
      if (existingBranch) {
        throw new Error("Mã chi nhánh đã tồn tại");
      }
    }

    // Kiểm tra managerId
    if (data.managerId) {
      const manager = await UserModel.findById(data.managerId);
      if (!manager) {
        throw new Error("Không tìm thấy giám đốc chi nhánh");
      }
    }

    // Cập nhật
    if (data.name) branch.name = data.name;
    if (data.code) branch.code = data.code.toUpperCase();
    if (data.latitude !== undefined) branch.latitude = data.latitude;
    if (data.longitude !== undefined) branch.longitude = data.longitude;
    if (data.city) branch.city = data.city;
    if (data.country) branch.country = data.country;
    if (data.phone !== undefined) branch.phone = data.phone;
    if (data.email !== undefined) branch.email = data.email;
    if (data.managerId !== undefined) branch.managerId = data.managerId;
    if (data.establishedDate) branch.establishedDate = new Date(data.establishedDate);
    if (data.status) branch.status = data.status;
    if (data.timezone) branch.timezone = data.timezone;

    await branch.save();

    return branch;
  }

  /**
   * Xóa chi nhánh
   */
  static async deleteBranch(id) {
    const branch = await BranchModel.findById(id);
    if (!branch) {
      throw new Error("Không tìm thấy chi nhánh");
    }

    // Kiểm tra có nhân viên không
    const employeeCount = await UserModel.countDocuments({ branch: branch._id });
    if (employeeCount > 0) {
      throw new Error("Không thể xóa chi nhánh vì còn nhân viên");
    }

    // Kiểm tra có phòng ban không
    const departmentCount = await DepartmentModel.countDocuments({ branchId: branch._id });
    if (departmentCount > 0) {
      throw new Error("Không thể xóa chi nhánh vì còn phòng ban");
    }

    // Không cho xóa trụ sở chính
    if (branch.code === "HQ") {
      throw new Error("Không thể xóa trụ sở chính");
    }

    await BranchModel.findByIdAndDelete(id);

    return { message: "Đã xóa chi nhánh thành công" };
  }

  /**
   * Lấy danh sách đơn giản (cho dropdown và check-in)
   */
  static async getBranchesList() {
    const branches = await BranchModel.find({ status: "active" })
      .select("name code latitude longitude")
      .sort({ name: 1 });

    return branches;
  }
}

