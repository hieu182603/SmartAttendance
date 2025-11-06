import mongoose from "mongoose";

/**
 * Schema cho Attendance (Chấm công)
 */
const attendanceSchema = new mongoose.Schema(
    {
        // TODO: Thêm các fields cần thiết
        // Ví dụ:
        // userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        // date: { type: Date, required: true },
        // checkIn: { type: Date },
        // checkOut: { type: Date },
        // status: { type: String, enum: ["present", "absent", "late"], default: "present" },
        // location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
        // notes: { type: String }
    },
    { timestamps: true }
);

// TODO: Thêm indexes nếu cần
// attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// TODO: Thêm methods nếu cần
// attendanceSchema.methods.calculateWorkHours = function() {
//     // Logic tính toán giờ làm việc
// };

// TODO: Thêm pre-save/post-save hooks nếu cần
// attendanceSchema.pre('save', async function (next) {
//     // Logic trước khi lưu
//     next();
// });

export const AttendanceModel = mongoose.model("Attendance", attendanceSchema);

