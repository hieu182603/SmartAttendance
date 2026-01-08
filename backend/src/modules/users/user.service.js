import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import { DepartmentModel } from "../departments/department.model.js";
import { BranchModel } from "../branches/branch.model.js";
import { canManageRole } from "../../config/roles.config.js";

export class UserService {
  /**
   * Cập nhật thông tin user
   */
  static async updateUser(userId, updateData) {
    // Chỉ cho phép cập nhật các field được phép
    const allowedFields = [
      "name",
      "phone",
      "address",
      "birthday",
      "avatar",
      "avatarUrl",
      "bankAccount",
      "bankName",
      "taxId",
    ];

    const updateFields = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Chuyển đổi birthday từ string sang Date nếu có
        if (field === "birthday" && updateData[field]) {
          updateFields[field] = new Date(updateData[field]);
        } else {
          updateFields[field] = updateData[field];
        }
      }
    }

    // Đồng bộ avatar và avatarUrl
    if (updateFields.avatar && !updateFields.avatarUrl) {
      updateFields.avatarUrl = updateFields.avatar;
    }
    if (updateFields.avatarUrl && !updateFields.avatar) {
      updateFields.avatar = updateFields.avatarUrl;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu để cập nhật");
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Lấy thông tin user theo ID
   */
  static async getUserById(userId) {
    const user = await UserModel.findById(userId)
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    return { message: "Đổi mật khẩu thành công" };
  }

  static async getAllUsers(options = {}) {
    const {
      page,
      limit,
      search = "",
      role = "",
      department = "",
      shift = "",
      isActive
    } = options;

    const query = {};

    // Search filter - tìm kiếm theo name, email
    // Note: Không thể search trực tiếp trên department vì nó là ObjectId reference
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];

      // Nếu muốn search theo tên phòng ban, tìm trong Department model trước
      try {
        const departments = await DepartmentModel.find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } }
          ]
        }).select('_id');

        if (departments.length > 0) {
          const departmentIds = departments.map(d => d._id);
          query.$or.push({ department: { $in: departmentIds } });
        }
      } catch (err) {
        // Nếu có lỗi khi tìm department, bỏ qua
        console.warn('[UserService] Error searching departments:', err.message);
      }
    }

    // Role filter
    if (role && role !== "all") {
      query.role = role;
    }

    // Department filter - department có thể là ObjectId hoặc tên phòng ban
    if (department && department !== "all") {
      // Kiểm tra xem department có phải là ObjectId hợp lệ không
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        // Nếu không phải ObjectId, tìm Department theo name hoặc code
        try {
          const dept = await DepartmentModel.findOne({
            $or: [
              { name: { $regex: department, $options: "i" } },
              { code: { $regex: department, $options: "i" } }
            ]
          }).select('_id');

          if (dept) {
            query.department = dept._id;
          } else {
            // Nếu không tìm thấy, set query để không trả về kết quả nào
            query.department = null;
          }
        } catch (err) {
          console.warn('[UserService] Error finding department:', err.message);
          query.department = null;
        }
      }
    }

    // Shift filter
    if (shift && shift !== "all") {
      if (mongoose.Types.ObjectId.isValid(shift)) {
        query.defaultShiftId = shift;
      } else {
        // Nếu không phải ObjectId, có thể là "none" để lọc nhân viên chưa có ca
        if (shift === "none" || shift === "null") {
          query.$or = [
            { defaultShiftId: null },
            { defaultShiftId: { $exists: false } }
          ];
        }
      }
    }

    // Status filter
    if (isActive !== undefined) {
      if (isActive === "true" || isActive === true) {
        query.isActive = true;
      } else if (isActive === "false" || isActive === false) {
        query.isActive = false;
      }
    }

    // Nếu có page và limit thì dùng server-side pagination
    // Nếu không có thì trả về tất cả (cho client-side pagination)
    let users, total;

    if (page !== undefined && limit !== undefined) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;

      [users, total] = await Promise.all([
        UserModel.find(query)
          .select("-password -otp -otpExpires")
          .populate("branch", "name address")
          .populate("department", "name code")
          .populate("defaultShiftId", "name startTime endTime")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        UserModel.countDocuments(query)
      ]);

      return {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } else {
      // Trả về tất cả users (cho client-side pagination)
      [users, total] = await Promise.all([
        UserModel.find(query)
          .select("-password -otp -otpExpires")
          .populate("branch", "name address")
          .populate("department", "name code")
          .populate("defaultShiftId", "name startTime endTime")
          .sort({ createdAt: -1 }),
        UserModel.countDocuments(query)
      ]);

      // Trả về format phù hợp với frontend (frontend expect result.users || result)
      return {
        users,
        pagination: {
          total,
          totalPages: 1
        }
      };
    }
  }

  static async getUserByIdForAdmin(userId) {
    const user = await UserModel.findById(userId)
      .select("-password -otp -otpExpires")
      .populate("branch", "name address")
      .populate("department", "name code")
      .populate("defaultShiftId", "name startTime endTime breakDuration isFlexible description");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  static async updateUserByAdmin(userId, updateData, currentUserRole = null) {
    const allowedFields = [
      "name",
      "email",
      "phone",
      "role",
      "department",
      "branch",
      "defaultShiftId",
      "isActive",
      "avatar",
      "avatarUrl"
    ];

    const updateFields = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Xử lý đặc biệt cho defaultShiftId: empty string -> null
        if (field === "defaultShiftId") {
          updateFields[field] = updateData[field] === "" || updateData[field] === null ? null : updateData[field];
        } else {
          updateFields[field] = updateData[field];
        }
      }
    }

    // Đồng bộ avatar và avatarUrl
    if (updateFields.avatar && !updateFields.avatarUrl) {
      updateFields.avatarUrl = updateFields.avatar;
    }
    if (updateFields.avatarUrl && !updateFields.avatar) {
      updateFields.avatar = updateFields.avatarUrl;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu để cập nhật");
    }

    // Kiểm tra phân quyền role assignment nếu có thay đổi role
    if (updateFields.role && currentUserRole) {
      // Use centralized role hierarchy check
      if (!canManageRole(currentUserRole, updateFields.role)) {
        throw new Error(`Bạn không có quyền phân quyền role ${updateFields.role}`);
      }
    }

    // Validate email format nếu có thay đổi email
    if (updateFields.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateFields.email)) {
        throw new Error("Email không hợp lệ");
      }
    }

    // Validate phone format nếu có thay đổi phone
    if (updateFields.phone && updateFields.phone.trim().length > 0) {
      const phoneRegex = /^[0-9]{10,11}$/;
      const cleanPhone = updateFields.phone.replace(/\s/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error("Số điện thoại phải có 10-11 chữ số");
      }
      updateFields.phone = cleanPhone;
    }

    // Convert department từ string (code/name) sang ObjectId nếu cần
    if (updateFields.department !== undefined) {
      // Nếu là string rỗng hoặc null, set thành null để xóa department
      if (updateFields.department === null || (typeof updateFields.department === "string" && updateFields.department.trim() === "")) {
        updateFields.department = null;
      } else if (updateFields.department) {
        // Kiểm tra xem có phải là ObjectId hợp lệ không
        if (mongoose.Types.ObjectId.isValid(updateFields.department)) {
          // Đã là ObjectId hợp lệ, convert sang ObjectId type để Mongoose xử lý đúng reference
          updateFields.department = new mongoose.Types.ObjectId(updateFields.department);
        } else {
          // Không phải ObjectId, tìm Department theo name hoặc code (fallback cho các API khác)
          const searchValue = String(updateFields.department).trim().toUpperCase();
          const department = await DepartmentModel.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${String(updateFields.department).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { code: searchValue }
            ],
            status: "active"
          }).select("_id");

          if (!department) {
            throw new Error(`Không tìm thấy phòng ban với mã/tên: ${updateFields.department}`);
          }
          updateFields.department = department._id;
        }
      }
    }

    // Convert branch từ string (code/name) sang ObjectId nếu cần
    if (updateFields.branch !== undefined) {
      // Nếu là string rỗng hoặc null, set thành null để xóa branch
      if (updateFields.branch === null || (typeof updateFields.branch === "string" && updateFields.branch.trim() === "")) {
        updateFields.branch = null;
      } else if (updateFields.branch) {
        // Kiểm tra xem có phải là ObjectId hợp lệ không
        if (mongoose.Types.ObjectId.isValid(updateFields.branch)) {
          // Đã là ObjectId hợp lệ, convert sang ObjectId type để Mongoose xử lý đúng reference
          updateFields.branch = new mongoose.Types.ObjectId(updateFields.branch);
        } else {
          // Không phải ObjectId, tìm Branch theo name hoặc code (fallback cho các API khác)
          const searchValue = String(updateFields.branch).trim().toUpperCase();
          const branch = await BranchModel.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${String(updateFields.branch).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { code: searchValue }
            ],
            status: "active"
          }).select("_id");

          if (!branch) {
            throw new Error(`Không tìm thấy chi nhánh với mã/tên: ${updateFields.branch}`);
          }
          updateFields.branch = branch._id;
        }
      }
    }

    // Validate name nếu có thay đổi
    if (updateFields.name !== undefined) {
      if (!updateFields.name || updateFields.name.trim().length === 0) {
        throw new Error("Tên không được để trống");
      }
      if (updateFields.name.trim().length < 2) {
        throw new Error("Tên phải có ít nhất 2 ký tự");
      }
      updateFields.name = updateFields.name.trim();
    }

    // Validate role nếu có thay đổi
    if (updateFields.role) {
      const validRoles = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"];
      if (!validRoles.includes(updateFields.role)) {
        throw new Error("Role không hợp lệ");
      }
    }

    const currentUser = await UserModel.findById(userId).select("defaultShiftId").lean();
    const oldDefaultShiftId = currentUser?.defaultShiftId?.toString();
    const newDefaultShiftId = updateFields.defaultShiftId?.toString();

    // Nếu có thay đổi defaultShiftId, có 2 cách xử lý:
    // 1. Nếu muốn full time (tất cả các ngày) → cập nhật defaultShiftId và vô hiệu hóa assignments
    // 2. Nếu muốn assignment mới (theo pattern) → tạo assignment mới
    // Đối với màn quản lý nhân viên hiện tại: coi đây là ca làm việc mặc định (full time) → dùng cách 1
    if (updateFields.defaultShiftId !== undefined && oldDefaultShiftId !== newDefaultShiftId) {
      if (newDefaultShiftId) {
        try {
          const { shiftAssignmentService } = await import('../shifts/shiftAssignment.service.js');
          // Gán ca làm việc full time cho nhân viên (sử dụng defaultShiftId)
          await shiftAssignmentService.assignShiftToUser(userId.toString(), newDefaultShiftId, {
            isFullTime: true,
          });
        } catch (assignmentError) {
          console.error(`[UserService] Error creating assignment for user ${userId}:`, assignmentError);
          // Nếu tạo assignment thất bại, vẫn tiếp tục cập nhật defaultShiftId bên dưới
        }
      } else {
        // Nếu xóa defaultShiftId (set về null/empty), vô hiệu hóa tất cả assignments
        try {
          const { EmployeeShiftAssignmentModel } = await import('../shifts/employeeShiftAssignment.model.js');
          await EmployeeShiftAssignmentModel.updateMany(
            { userId: userId.toString(), isActive: true },
            { $set: { isActive: false } }
          );
        } catch (assignmentError) {
          console.error(`[UserService] Error deactivating assignments for user ${userId}:`, assignmentError);
        }
      }
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires").populate("branch", "name address").populate("department", "name code").populate("defaultShiftId");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Cập nhật avatar cho user
   */
  static async updateAvatar(userId, avatarUrl) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarUrl, avatarUrl } },
      { new: true, runValidators: true }
    )
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Tạo user mới bởi admin
   */
  static async createUserByAdmin(userData, adminRole) {
    const { email, password, name, role, department, branch, phone, defaultShiftId, isActive = true } = userData;

    // Validate required fields
    if (!email || !password || !name || !role) {
      throw new Error("Email, password, name và role là bắt buộc");
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Email không hợp lệ");
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Validate name length
    if (normalizedName.length < 2) {
      throw new Error("Tên phải có ít nhất 2 ký tự");
    }

    // Validate role
    const validRoles = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"];
    if (!validRoles.includes(role)) {
      throw new Error("Role không hợp lệ");
    }

    // Check if admin can assign this role
    if (!canManageRole(adminRole, role)) {
      throw new Error("Bạn không có quyền phân quyền này");
    }

    // Check if email already exists
    const existed = await UserModel.findOne({ email: normalizedEmail });
    if (existed) {
      throw new Error("Email đã được đăng ký");
    }

    // Validate department if provided
    if (department) {
      const deptExists = await DepartmentModel.findById(department);
      if (!deptExists) {
        throw new Error("Phòng ban không tồn tại");
      }
    }

    // Validate branch if provided
    if (branch) {
      const branchExists = await BranchModel.findById(branch);
      if (!branchExists) {
        throw new Error("Chi nhánh không tồn tại");
      }
    }

    // Validate phone if provided
    if (phone && phone.trim().length > 0) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        throw new Error("Số điện thoại phải có 10-11 chữ số");
      }
    }

    // Create user
    const user = await UserModel.create({
      email: normalizedEmail,
      password,
      name: normalizedName,
      role,
      department: department || null,
      branch: branch || null,
      phone: phone ? phone.trim() : null,
      defaultShiftId: defaultShiftId || null,
      isActive,
      isVerified: true, // Admin created users are automatically verified
    });

    return user;
  }
}

