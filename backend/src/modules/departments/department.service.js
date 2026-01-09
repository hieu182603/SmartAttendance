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
   * Kích hoạt lại phòng ban (Reactivate)
   */
  static async reactivateDepartment(id) {
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    if (department.status === "active") {
      throw new Error("Phòng ban này đang hoạt động");
    }

    // Kiểm tra chi nhánh có còn hoạt động không
    const branch = await BranchModel.findById(department.branchId);
    if (!branch || branch.status !== "active") {
      throw new Error("Không thể kích hoạt lại phòng ban vì chi nhánh không hoạt động");
    }

    // Kích hoạt lại: Chuyển status sang "active" và xóa deletedAt
    department.status = "active";
    department.deletedAt = null;
    await department.save();

    return { message: "Đã kích hoạt lại phòng ban thành công", department };
  }

  /**
   * Xóa phòng ban (Soft Delete)
   */
  static async deleteDepartment(id) {
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    // Kiểm tra đã bị xóa chưa
    if (department.deletedAt) {
      throw new Error("Phòng ban này đã bị xóa trước đó");
    }

    // Kiểm tra có nhân viên đang hoạt động không
    const activeEmployeeCount = await UserModel.countDocuments({ 
      department: department._id,
      isActive: true 
    });
    
    if (activeEmployeeCount > 0) {
      const totalEmployeeCount = await UserModel.countDocuments({ 
        department: department._id 
      });
      throw new Error(
        `Không thể xóa phòng ban vì còn ${totalEmployeeCount} nhân viên ` +
        `(${activeEmployeeCount} đang hoạt động). ` +
        `Vui lòng chuyển nhân viên sang phòng ban khác trước.`
      );
    }

    // Soft delete: Chuyển status sang "inactive" và đánh dấu deletedAt
    department.status = "inactive";
    department.deletedAt = new Date();
    await department.save();

    return { message: "Đã vô hiệu hóa phòng ban thành công" };
  }

  /**
   * Chuyển nhân viên từ phòng ban này sang phòng ban khác
   * @param {string} sourceDepartmentId - ID phòng ban nguồn
   * @param {string} targetDepartmentId - ID phòng ban đích
   * @returns {Promise<Object>} Kết quả chuyển nhân viên
   */
  static async transferEmployees(sourceDepartmentId, targetDepartmentId) {
    const sourceDepartment = await DepartmentModel.findById(sourceDepartmentId);
    if (!sourceDepartment) {
      throw new Error("Không tìm thấy phòng ban nguồn");
    }

    const targetDepartment = await DepartmentModel.findById(targetDepartmentId);
    if (!targetDepartment) {
      throw new Error("Không tìm thấy phòng ban đích");
    }

    if (sourceDepartmentId === targetDepartmentId) {
      throw new Error("Không thể chuyển nhân viên vào chính phòng ban đó");
    }

    // Kiểm tra cùng chi nhánh
    if (sourceDepartment.branchId.toString() !== targetDepartment.branchId.toString()) {
      throw new Error("Không thể chuyển nhân viên giữa các phòng ban khác chi nhánh");
    }

    // Đếm nhân viên hiện tại
    const employeeCount = await UserModel.countDocuments({ department: sourceDepartmentId });

    // Chuyển nhân viên
    const employeeResult = await UserModel.updateMany(
      { department: sourceDepartmentId },
      { $set: { department: targetDepartmentId } }
    );

    return {
      message: "Đã chuyển nhân viên thành công",
      transferred: {
        employees: employeeResult.modifiedCount,
      },
      source: {
        departmentId: sourceDepartmentId,
        departmentName: sourceDepartment.name,
        departmentCode: sourceDepartment.code,
      },
      target: {
        departmentId: targetDepartmentId,
        departmentName: targetDepartment.name,
        departmentCode: targetDepartment.code,
      },
    };
  }

  /**
   * Chuyển nhân viên có chọn lọc từ phòng ban này sang phòng ban khác
   * @param {string} sourceDepartmentId - ID phòng ban nguồn
   * @param {string} targetDepartmentId - ID phòng ban đích
   * @param {Array<string>} employeeIds - Danh sách ID nhân viên cần chuyển
   * @returns {Promise<Object>} Kết quả chuyển nhân viên
   */
  static async transferSelectedEmployees(sourceDepartmentId, targetDepartmentId, employeeIds) {
    if (!employeeIds || employeeIds.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một nhân viên để chuyển");
    }

    const sourceDepartment = await DepartmentModel.findById(sourceDepartmentId);
    if (!sourceDepartment) {
      throw new Error("Không tìm thấy phòng ban nguồn");
    }

    const targetDepartment = await DepartmentModel.findById(targetDepartmentId);
    if (!targetDepartment) {
      throw new Error("Không tìm thấy phòng ban đích");
    }

    if (sourceDepartmentId === targetDepartmentId) {
      throw new Error("Không thể chuyển nhân viên vào chính phòng ban đó");
    }

    // Kiểm tra cùng chi nhánh
    if (sourceDepartment.branchId.toString() !== targetDepartment.branchId.toString()) {
      throw new Error("Không thể chuyển nhân viên giữa các phòng ban khác chi nhánh");
    }

    // Kiểm tra nhân viên có thuộc phòng ban nguồn không
    const employees = await UserModel.find({
      _id: { $in: employeeIds },
      department: sourceDepartmentId,
    });

    if (employees.length !== employeeIds.length) {
      throw new Error("Một số nhân viên không thuộc phòng ban nguồn");
    }

    // Chuyển nhân viên đã chọn
    const employeeResult = await UserModel.updateMany(
      { _id: { $in: employeeIds }, department: sourceDepartmentId },
      { $set: { department: targetDepartmentId } }
    );

    return {
      message: `Đã chuyển ${employeeResult.modifiedCount} nhân viên thành công`,
      transferred: {
        employees: employeeResult.modifiedCount,
        employeeIds: employeeIds,
      },
      source: {
        departmentId: sourceDepartmentId,
        departmentName: sourceDepartment.name,
        departmentCode: sourceDepartment.code,
      },
      target: {
        departmentId: targetDepartmentId,
        departmentName: targetDepartment.name,
        departmentCode: targetDepartment.code,
      },
    };
  }

  /**
   * Sáp nhập phòng ban: Chuyển nhân viên và vô hiệu hóa phòng ban nguồn
   * @param {string} sourceDepartmentId - ID phòng ban nguồn (sẽ bị vô hiệu hóa)
   * @param {string} targetDepartmentId - ID phòng ban đích (sẽ nhận nhân viên)
   * @returns {Promise<Object>} Kết quả sáp nhập
   */
  static async mergeDepartments(sourceDepartmentId, targetDepartmentId) {
    // Chuyển nhân viên trước
    const transferResult = await this.transferEmployees(sourceDepartmentId, targetDepartmentId);

    // Vô hiệu hóa phòng ban nguồn
    const sourceDepartment = await DepartmentModel.findById(sourceDepartmentId);
    if (!sourceDepartment) {
      throw new Error("Không tìm thấy phòng ban nguồn để vô hiệu hóa");
    }
    sourceDepartment.status = "inactive";
    sourceDepartment.deletedAt = new Date();
    await sourceDepartment.save();

    return {
      message: "Đã sáp nhập phòng ban thành công",
      ...transferResult,
    };
  }

  /**
   * Lấy danh sách nhân viên của phòng ban (cho preview)
   * @param {string} departmentId - ID phòng ban
   * @returns {Promise<Object>} Danh sách nhân viên
   */
  static async getDepartmentEmployees(departmentId) {
    const department = await DepartmentModel.findById(departmentId);
    if (!department) {
      throw new Error("Không tìm thấy phòng ban");
    }

    const employees = await UserModel.find({ department: departmentId })
      .select("_id name email role isActive")
      .sort({ name: 1 });

    return {
      department: {
        _id: department._id,
        name: department.name,
        code: department.code,
      },
      employees: employees.map((emp) => ({
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        isActive: emp.isActive,
      })),
      counts: {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.isActive).length,
      },
    };
  }

  /**
   * Lấy danh sách phòng ban đơn giản (cho dropdown)
   * @param {string} branchId - ID chi nhánh (optional)
   * @returns {Promise<Array>} Danh sách phòng ban
   */
  static async getDepartmentsList(branchId = null) {
    const query = { status: "active" };
    if (branchId) {
      query.branchId = branchId;
    }

    const departments = await DepartmentModel.find(query)
      .select("name code branchId")
      .populate("branchId", "name code")
      .sort({ name: 1 });

    return departments;
  }
}

