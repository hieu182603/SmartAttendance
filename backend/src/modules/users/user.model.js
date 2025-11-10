import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../../utils/bcrypt.util.js";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },

    // Thông tin xác thực
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // Vai trò người dùng
    role: {
      type: String,
      enum: ["admin", "director", "manager", "employee"],
      default: "employee",
    },

    // Liên kết chi nhánh & phòng ban
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    department: { type: String },

    // Thông tin bổ sung
    phone: { type: String },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password trước khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// So sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

export const UserModel = mongoose.model("User", userSchema);
