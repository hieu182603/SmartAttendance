import { UserModel } from "../users/user.model.js";
import { OtpModel } from "../otp/otp.model.js";
import { generateTokenFromUser } from "../../utils/jwt.util.js";
import { generateOTP, generateOTPExpiry } from "../../utils/otp.util.js";
import { sendOTPEmail } from "../../utils/email.util.js";

export class AuthService {
  // Đăng ký tài khoản mới
  static async register(userData) {
    const { email, password, name } = userData;

    const existed = await UserModel.findOne({ email });
    if (existed) {
      throw new Error("Email already registered");
    }

    // Tạo tài khoản mới
    const user = await UserModel.create({
      email,
      password,
      name,
      isVerified: false,
    });

    // Tạo OTP mới
    const otp = generateOTP();
    const otpExpires = generateOTPExpiry();

    await OtpModel.create({
      email,
      otp,
      expiresAt: otpExpires,
    });

    // Gửi email OTP
    try {
      await sendOTPEmail(email, otp, name);
    } catch (error) {
      console.error("Failed to send OTP email:", error);
    }

    return {
      message:
        "Registration successful. Please check your email for OTP verification.",
      userId: user._id,
      email: user.email,
    };
  }

  // Xác thực OTP
  static async verifyOTP(email, otp) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("User not found");
    if (user.isVerified) throw new Error("Email already verified");

    // Lấy OTP trong bảng OtpModel
    const otpRecord = await OtpModel.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord) throw new Error("OTP not found. Please request a new one.");

    if (new Date() > otpRecord.expiresAt) {
      throw new Error("OTP expired. Please request a new OTP.");
    }

    if (otpRecord.otp !== otp.trim()) {
      throw new Error("Invalid OTP");
    }

    // Cập nhật user và xóa OTP
    user.isVerified = true;
    await user.save();

    await OtpModel.deleteMany({ email }); // xóa các OTP cũ

    const token = generateTokenFromUser(user);
    return {
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
    };
  }

  // Gửi lại OTP
  static async resendOTP(email) {
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("User not found");
    if (user.isVerified) throw new Error("Email already verified");

    const otp = generateOTP();
    const otpExpires = generateOTPExpiry();

    await OtpModel.create({
      email,
      otp,
      expiresAt: otpExpires,
    });

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Failed to send OTP email");
    }

    return { message: "New OTP sent successfully. Please check your email." };
  }

  // Đăng nhập
  static async login(credentials) {
    const { email, password } = credentials;
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("Invalid credentials");
    if (!user.isVerified) throw new Error("Email not verified");

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    const token = generateTokenFromUser(user);
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  }

  // Lấy user hiện tại
  static async getCurrentUser(userId) {
    const user = await UserModel.findById(userId).select("-password");
    if (!user) throw new Error("User not found");
    return user;
  }
}
