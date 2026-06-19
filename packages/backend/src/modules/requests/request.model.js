import mongoose from "mongoose";

/**
 * Schema cho Request (Yêu cầu / Đơn xin phép / Tăng ca / Làm từ xa)
 */
const requestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["leave", "sick", "unpaid", "compensatory", "maternity", "overtime", "remote", "late", "early_leave", "correction", "other"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    approvalComments: {
      type: String,
      trim: true,
    },
    overtimeHours: {
      type: Number,
      min: 0,
      max: 24,
    },
  },
  { timestamps: true }
);

// Index giúp tối ưu truy vấn
requestSchema.index({ userId: 1, createdAt: -1 });
requestSchema.index({ status: 1 });

/**
 * ✅ Method phê duyệt yêu cầu
 * @param {ObjectId} managerId - ID của người duyệt
 */
requestSchema.methods.approve = function (managerId, comments) {
  this.status = "approved";
  this.approvedBy = managerId;
  this.approvedAt = new Date();
  this.rejectionReason = undefined;
  if (comments) {
    this.approvalComments = comments;
  }
};

/**
 * ❌ Method từ chối yêu cầu
 * @param {String} reason - Lý do từ chối
 */
requestSchema.methods.reject = function (reason) {
  this.status = "rejected";
  this.rejectionReason = reason;
  this.approvedAt = new Date();
};

/**
 * Tính số ngày giữa 2 ngày (bao gồm cả ngày bắt đầu và kết thúc)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Number} Số ngày
 */
const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Kiểm tra tính hợp lệ của ngày
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  
  // Đảm bảo startDate <= endDate
  if (start > end) {
    return 0;
  }
  
  // Tính số ngày (bao gồm cả 2 ngày)
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 để bao gồm cả ngày bắt đầu và kết thúc
};

/**
 * Map loại nghỉ phép từ request type sang leave balance type
 */
const mapLeaveType = (requestType) => {
  const mapping = {
    leave: "annual",
    sick: "sick",
    unpaid: "unpaid",
    compensatory: "compensatory",
    maternity: "maternity",
    overtime: null,
    remote: null,
    late: null,
    early_leave: null,
    correction: null,
    other: null,
  };
  return mapping[requestType] || null;
};

/**
 * 🕒 Hook kiểm tra logic ngày tháng trước khi lưu
 * Chỉ validate khi tạo mới hoặc thay đổi startDate/endDate
 */
requestSchema.pre("save", async function (next) {
  // Kiểm tra cơ bản: startDate không được lớn hơn endDate
  if (this.startDate > this.endDate) {
    return next(new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc"));
  }

  // Chỉ validate khi tạo mới (isNew) hoặc khi startDate/endDate thay đổi
  if (!this.isNew && !this.isModified("startDate") && !this.isModified("endDate")) {
    return next();
  }

  // Tính số ngày nghỉ
  const daysDiff = calculateDays(this.startDate, this.endDate);
  
  // Check khoảng thời gian quá dài (max 90 ngày)
  if (daysDiff > 90) {
    return next(new Error("Không thể nghỉ quá 90 ngày"));
  }

  // Check ngày trong quá khứ (trừ đơn nghỉ bệnh có thể backdate)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDateOnly = new Date(this.startDate);
  startDateOnly.setHours(0, 0, 0, 0);
  
  if (this.type !== 'sick' && startDateOnly < today) {
    return next(new Error("Không thể tạo đơn nghỉ cho ngày trong quá khứ"));
  }

  // Check trùng lịch với request đã approved (chỉ check cho leave types)
  const leaveTypes = ['leave', 'sick', 'unpaid', 'compensatory', 'maternity'];
  if (leaveTypes.includes(this.type)) {
    // Tìm request đã approved có khoảng thời gian trùng
    // Overlap condition: startDate <= newEndDate AND endDate >= newStartDate
    const existingRequest = await mongoose.model("Request").findOne({
      _id: { $ne: this._id }, // Loại trừ chính request này (khi update)
      userId: this.userId,
      status: 'approved',
      type: this.type,
      startDate: { $lte: this.endDate },
      endDate: { $gte: this.startDate }
    });

    if (existingRequest) {
      return next(new Error("Đã có đơn nghỉ được duyệt trong khoảng thời gian này"));
    }
  }

  // Check vượt quá số ngày phép còn lại (chỉ check cho leave types có balance)
  if (leaveTypes.includes(this.type)) {
    try {
      const UserModel = mongoose.model("User");
      const user = await UserModel.findById(this.userId);
      
      if (!user) {
        return next(new Error("Không tìm thấy thông tin người dùng"));
      }

      // Khởi tạo leave balance nếu chưa có
      user.initializeLeaveBalance();

      // Map request type sang leave balance type
      const leaveType = mapLeaveType(this.type);
      
      if (leaveType && user.leaveBalance[leaveType]) {
        const balance = user.leaveBalance[leaveType];
        const remaining = balance.remaining || 0;
        const pending = balance.pending || 0;
        
        // Tính số ngày đang pending (không bao gồm request hiện tại)
        let effectivePending = pending;
        
        if (!this.isNew && this._id) {
          // Nếu đang update request pending, trừ số ngày của request cũ
          const oldRequest = await mongoose.model("Request").findById(this._id);
          if (oldRequest && oldRequest.status === 'pending') {
            const oldDays = calculateDays(oldRequest.startDate, oldRequest.endDate);
            effectivePending = Math.max(0, pending - oldDays);
          }
        }
        
        // Kiểm tra số ngày còn lại
        // availableDays = remaining - (pending không bao gồm request này) + daysDiff (request này)
        // = remaining - effectivePending
        const availableDays = remaining - effectivePending;
        
        if (daysDiff > availableDays) {
          return next(
            new Error(
              `Số ngày nghỉ (${daysDiff} ngày) vượt quá số ngày phép còn lại (${availableDays} ngày)`
            )
          );
        }
      }
    } catch (error) {
      // Nếu có lỗi khi check balance, tiếp tục (không block việc tạo request)
      // Không throw error để tránh block việc tạo request khi có vấn đề với balance
    }
  }

  next();
});

export const RequestModel = mongoose.model("Request", requestSchema);
