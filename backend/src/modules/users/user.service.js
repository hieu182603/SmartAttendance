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
      page = 1,
      limit = 20,
      search = "",
      role = "",
      department = "",
      isActive
    } = options;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = { $regex: department, $options: "i" };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select("-password -otp -otpExpires")
        .populate("branch", "name address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
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

  static async updateUserByAdmin(userId, updateData) {
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

