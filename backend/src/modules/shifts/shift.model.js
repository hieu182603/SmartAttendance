import mongoose from "mongoose";

/**
 * Schema cho Shift (Ca làm việc)
 */
const shiftSchema = new mongoose.Schema(
    {
        // TODO: Thêm các fields cần thiết
        // Ví dụ:
        // name: { type: String, required: true },
        // startTime: { type: String, required: true }, // Format: "HH:mm"
        // endTime: { type: String, required: true },
        // breakDuration: { type: Number, default: 0 }, // Phút
        // isActive: { type: Boolean, default: true },
        // description: { type: String }
    },
    { timestamps: true }
);

// TODO: Thêm indexes nếu cần
// shiftSchema.index({ name: 1 }, { unique: true });

// TODO: Thêm methods nếu cần
// shiftSchema.methods.getTotalHours = function() {
//     // Logic tính tổng giờ làm việc
// };

// TODO: Thêm pre-save/post-save hooks nếu cần
// shiftSchema.pre('save', async function (next) {
//     // Logic trước khi lưu
//     next();
// });

export const ShiftModel = mongoose.model("Shift", shiftSchema);

