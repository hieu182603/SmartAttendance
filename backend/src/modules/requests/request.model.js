import mongoose from "mongoose";

/**
 * Schema cho Request (Yêu cầu/Đơn xin phép)
 */
const requestSchema = new mongoose.Schema(
    {
        // TODO: Thêm các fields cần thiết
        // Ví dụ:
        // userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // type: { type: String, enum: ["leave", "overtime", "remote", "other"], required: true },
        // startDate: { type: Date, required: true },
        // endDate: { type: Date, required: true },
        // reason: { type: String, required: true },
        // status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        // approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // approvedAt: { type: Date },
        // rejectionReason: { type: String }
    },
    { timestamps: true }
);

// TODO: Thêm indexes nếu cần
// requestSchema.index({ userId: 1, createdAt: -1 });
// requestSchema.index({ status: 1 });

// TODO: Thêm methods nếu cần
// requestSchema.methods.approve = function(approvedBy) {
//     // Logic phê duyệt
// };

// requestSchema.methods.reject = function(rejectionReason) {
//     // Logic từ chối
// };

// TODO: Thêm pre-save/post-save hooks nếu cần
// requestSchema.pre('save', async function (next) {
//     // Logic trước khi lưu
//     next();
// });

export const RequestModel = mongoose.model("Request", requestSchema);

