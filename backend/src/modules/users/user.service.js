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
}

