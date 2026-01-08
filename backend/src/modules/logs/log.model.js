import mongoose from "mongoose";


const logSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // Optional vì có thể là system action
        },
        action: {
            type: String,
            required: true,
            // VD: "checkin", "checkout", "create_request", "approve_request", "login", "register"
        },
        entityType: {
            type: String,
            // VD: "attendance", "request", "user", "shift", "location"
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            // ID của entity liên quan (attendance, request, etc.)
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
            // Browser/device info
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            // Thông tin chi tiết (JSON object)
        },
        status: {
            type: String,
            enum: ["success", "failed", "warning"],
            default: "success",
        },
        errorMessage: {
            type: String,
            // Nếu status = "failed"
        },
    },
    { timestamps: true }
);

// Indexes để tối ưu queries
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ action: 1, createdAt: -1 });
logSchema.index({ entityType: 1, entityId: 1 });
logSchema.index({ createdAt: -1 }); // Cho queries theo thời gian
logSchema.index({ status: 1 });

/**
 * Method chuyển đổi để trả về public data (ẩn sensitive info)
 */
logSchema.methods.toPublicJSON = function () {
    const obj = this.toObject();
    // Có thể ẩn một số fields sensitive nếu cần
    return obj;
};

export const LogModel = mongoose.model("Log", logSchema);

