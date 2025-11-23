import { UserModel } from "./user.model.js";

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
      "avatarUrl",
      "bankAccount",
      "bankName",
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
    const user = await UserModel.findById(userId).select(
      "-password -otp -otpExpires"
    );

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
      isActive
    } = options;

    const query = {};

    // Search filter - tìm kiếm theo name, email, hoặc department
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } }
      ];
    }

    // Role filter
    if (role && role !== "all") {
      query.role = role;
    }

    // Department filter
    if (department && department !== "all") {
      query.department = { $regex: department, $options: "i" };
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
      .populate("branch", "name address");

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
      "isActive",
      "avatarUrl"
    ];

    const updateFields = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu để cập nhật");
    }

    // Kiểm tra phân quyền role assignment nếu có thay đổi role
    if (updateFields.role && currentUserRole) {
      const roleHierarchy = {
        EMPLOYEE: 1,
        MANAGER: 2,
        HR_MANAGER: 3,
        ADMIN: 4,
        SUPER_ADMIN: 5
      };

      const currentLevel = roleHierarchy[currentUserRole] || 0;
      const targetLevel = roleHierarchy[updateFields.role] || 0;

      // SUPER_ADMIN có thể assign tất cả roles
      if (currentUserRole !== "SUPER_ADMIN") {
        // Các role khác chỉ có thể assign role thấp hơn mình
        if (currentLevel <= targetLevel) {
          throw new Error(`Bạn không có quyền phân quyền role ${updateFields.role}`);
        }
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

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires").populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}

