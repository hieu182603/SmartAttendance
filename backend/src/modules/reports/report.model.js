import mongoose from "mongoose";

/**
 * Schema cho Report (Báo cáo)
 */
const reportSchema = new mongoose.Schema(
    {
        // TODO: Thêm các fields cần thiết
        // Ví dụ:
        // userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // type: { type: String, enum: ["daily", "weekly", "monthly", "custom"], required: true },
        // startDate: { type: Date, required: true },
        // endDate: { type: Date, required: true },
        // totalHours: { type: Number, default: 0 },
        // totalDays: { type: Number, default: 0 },
        // presentDays: { type: Number, default: 0 },
        // absentDays: { type: Number, default: 0 },
        // lateDays: { type: Number, default: 0 },
        // data: { type: mongoose.Schema.Types.Mixed }, // Dữ liệu chi tiết của báo cáo
        // generatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// TODO: Thêm indexes nếu cần
// reportSchema.index({ userId: 1, startDate: -1, endDate: -1 });
// reportSchema.index({ type: 1, createdAt: -1 });

// TODO: Thêm methods nếu cần
// reportSchema.methods.generatePDF = function() {
//     // Logic generate PDF
// };

// reportSchema.methods.calculateStats = function() {
//     // Logic tính toán thống kê
// };

// TODO: Thêm pre-save/post-save hooks nếu cần
// reportSchema.pre('save', async function (next) {
//     // Logic trước khi lưu
//     next();
// });

export const ReportModel = mongoose.model("Report", reportSchema);

