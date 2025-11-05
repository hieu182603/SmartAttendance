import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../../utils/bcrypt.util.js";

const userSchema = new mongoose.Schema(
    {
        email: { type: String, unique: true, index: true, required: true },
        password: { type: String, required: true },
        name: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        otp: { type: String },
        otpExpires: { type: Date }
    },
    { timestamps: true }
);

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        this.password = await hashPassword(this.password);
        next();
    } catch (error) {
        next(error);
    }
});


userSchema.methods.comparePassword = async function (candidatePassword) {
    return comparePassword(candidatePassword, this.password);
};

export const UserModel = mongoose.model("User", userSchema);

