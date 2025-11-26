import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../../utils/bcrypt.util.js";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },

    // Thông tin xác thực
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },

    // Vai trò người dùng
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"],
      default: "EMPLOYEE",
    },

    // Liên kết chi nhánh & phòng ban
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },

    // Thông tin bổ sung
    phone: { type: String },
    address: { type: String },
    birthday: { type: Date },
    avatar: { type: String },
    avatarUrl: { type: String },
    bankAccount: { type: String },
    bankName: { type: String },
    isActive: { type: Boolean, default: true },

    // Số ngày phép
    leaveBalance: {
      // Nghỉ phép năm
      annual: {
        total: { type: Number, default: 12 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 12 },
        pending: { type: Number, default: 0 },
      },
      // Nghỉ ốm
      sick: {
        total: { type: Number, default: 30 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 30 },
        pending: { type: Number, default: 0 },
      },
      // Nghỉ không lương
      unpaid: {
        total: { type: Number, default: 999 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 999 },
        pending: { type: Number, default: 0 },
      },
      // Nghỉ bù
      compensatory: {
        total: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
      },
      // Nghỉ thai sản
      maternity: {
        total: { type: Number, default: 180 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 180 },
        pending: { type: Number, default: 0 },
      },
    },
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

/**
 * Method tính toán lại số ngày phép còn lại
 */
userSchema.methods.recalculateLeaveBalance = function () {
  this.leaveBalance.annual.remaining = this.leaveBalance.annual.total - this.leaveBalance.annual.used;
  this.leaveBalance.sick.remaining = this.leaveBalance.sick.total - this.leaveBalance.sick.used;
  this.leaveBalance.unpaid.remaining = this.leaveBalance.unpaid.total - this.leaveBalance.unpaid.used;
  this.leaveBalance.compensatory.remaining = this.leaveBalance.compensatory.total - this.leaveBalance.compensatory.used;
  this.leaveBalance.maternity.remaining = this.leaveBalance.maternity.total - this.leaveBalance.maternity.used;
};

/**
 * Method khởi tạo leave balance nếu chưa có
 */
userSchema.methods.initializeLeaveBalance = function () {
  // Kiểm tra nếu leaveBalance chưa tồn tại hoặc chưa có các field cần thiết
  if (!this.leaveBalance || !this.leaveBalance.annual) {
    this.leaveBalance = {
      annual: { total: 12, used: 0, remaining: 12, pending: 0 },
      sick: { total: 30, used: 0, remaining: 30, pending: 0 },
      unpaid: { total: 999, used: 0, remaining: 999, pending: 0 },
      compensatory: { total: 0, used: 0, remaining: 0, pending: 0 },
      maternity: { total: 180, used: 0, remaining: 180, pending: 0 },
    };
  }
};

export const UserModel = mongoose.model("User", userSchema);
