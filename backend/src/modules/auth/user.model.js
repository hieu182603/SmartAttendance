import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        email: { type: String, unique: true, index: true, required: true },
        password: { type: String, required: true },
        name: { type: String, required: true }
    },
    { timestamps: true }
);

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});


userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = mongoose.model("User", userSchema);

