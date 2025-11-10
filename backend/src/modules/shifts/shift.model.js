import mongoose from "mongoose";

/**
 * Schema cho Shift (Ca làm việc)
 * Dùng để định nghĩa các ca làm: sáng, chiều, đêm, linh hoạt...
 */
const shiftSchema = new mongoose.Schema(
  {
    // Tên ca làm (VD: "Ca sáng", "Ca chiều", "Ca đêm")
    name: { type: String, required: true, unique: true, trim: true },

    // Giờ bắt đầu và kết thúc (định dạng "HH:mm")
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    // Số phút nghỉ giữa ca
    breakDuration: { type: Number, default: 0 }, // phút

    // Loại ca: cố định hoặc linh hoạt
    isFlexible: { type: Boolean, default: false },

    // Mô tả thêm (nếu có)
    description: { type: String },

    // Trạng thái kích hoạt
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🔍 Index để tránh trùng tên ca
shiftSchema.index({ name: 1 }, { unique: true });

// 🧮 Method tính tổng giờ làm việc (đã trừ giờ nghỉ)
shiftSchema.methods.getTotalHours = function () {
  const [startH, startM] = this.startTime.split(":").map(Number);
  const [endH, endM] = this.endTime.split(":").map(Number);

  let totalMinutes =
    endH * 60 + endM - (startH * 60 + startM) - this.breakDuration;
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Xử lý ca qua ngày (VD: 22:00 -> 06:00)

  return totalMinutes / 60; // đổi ra giờ
};

// 🪝 Hook trước khi lưu — chuẩn hóa dữ liệu
shiftSchema.pre("save", function (next) {
  this.name = this.name.trim();
  next();
});

export const ShiftModel = mongoose.model("Shift", shiftSchema);
