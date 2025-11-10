import mongoose from "mongoose";

/**
 * Schema cho OTP (One-Time Password)
 * Dùng cho xác thực email / quên mật khẩu / xác minh tài khoản
 */
const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["verify_email", "forgot_password", "two_factor"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * 🔒 Xóa OTP tự động sau khi hết hạn (TTL index)
 * TTL (Time-To-Live) sẽ tự động xóa document sau khi `expiresAt` qua hạn
 */
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * ✅ Method xác minh OTP
 * @param {String} inputCode - mã OTP người dùng nhập
 * @returns {Boolean} true nếu hợp lệ
 */
otpSchema.methods.verifyCode = function (inputCode) {
  const now = new Date();
  if (this.verified) return false; // Đã dùng rồi
  if (now > this.expiresAt) return false; // Hết hạn
  return this.code === inputCode;
};

/**
 * 🕒 Hook trước khi lưu - đảm bảo hạn sử dụng OTP
 * Mặc định 5 phút nếu chưa đặt
 */
otpSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    this.expiresAt = expiry;
  }
  next();
});

export const OtpModel = mongoose.model("Otp", otpSchema);
