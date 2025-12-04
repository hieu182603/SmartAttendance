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
   * Xóa chi nhánh (Soft Delete)
   */
  static async deleteBranch(id) {
    const branch = await BranchModel.findById(id);
    if (!branch) {
      throw new Error("Không tìm thấy chi nhánh");
    }

    // Kiểm tra đã bị xóa chưa
    if (branch.deletedAt) {
      throw new Error("Chi nhánh này đã bị xóa trước đó");
    }

    // Không cho xóa trụ sở chính
    if (branch.code === "HQ") {
      throw new Error("Không thể xóa trụ sở chính");
    }

    // Kiểm tra có nhân viên đang hoạt động không
    const activeEmployeeCount = await UserModel.countDocuments({ 
      branch: branch._id,
      isActive: true 
    });
    
    if (activeEmployeeCount > 0) {
      const totalEmployeeCount = await UserModel.countDocuments({ 
        branch: branch._id 
      });
      throw new Error(
        `Không thể xóa chi nhánh vì còn ${totalEmployeeCount} nhân viên ` +
        `(${activeEmployeeCount} đang hoạt động). ` +
        `Vui lòng chuyển nhân viên sang chi nhánh khác trước.`
      );
    }

    // Kiểm tra có phòng ban đang hoạt động không
    const activeDepartmentCount = await DepartmentModel.countDocuments({ 
      branchId: branch._id,
      status: "active",
      deletedAt: null
    });
    
    if (activeDepartmentCount > 0) {
      const totalDepartmentCount = await DepartmentModel.countDocuments({ 
        branchId: branch._id 
      });
      throw new Error(
        `Không thể xóa chi nhánh vì còn ${totalDepartmentCount} phòng ban ` +
        `(${activeDepartmentCount} đang hoạt động). ` +
        `Vui lòng xóa hoặc chuyển phòng ban trước.`
      );
    }

    // Kiểm tra attendance records (locationId)
    const AttendanceModel = (await import('../attendance/attendance.model.js')).AttendanceModel;
    const attendanceCount = await AttendanceModel.countDocuments({
      locationId: branch._id
    });
    if (attendanceCount > 0) {
      throw new Error(
        `Không thể xóa chi nhánh vì còn ${attendanceCount} bản ghi chấm công. ` +
        `Chi nhánh này đã được sử dụng trong hệ thống chấm công.`
      );
    }

    // Soft delete: Chuyển status sang "inactive" và đánh dấu deletedAt
    branch.status = "inactive";
    branch.deletedAt = new Date();
    await branch.save();

    return { message: "Đã vô hiệu hóa chi nhánh thành công" };
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

