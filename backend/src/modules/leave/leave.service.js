import { RequestModel } from "../requests/request.model.js";
import { UserModel } from "../users/user.model.js";

/**
 * Tính số ngày giữa 2 ngày (bao gồm cả ngày bắt đầu và kết thúc)
 * @param {Date|String} startDate - Ngày bắt đầu
 * @param {Date|String} endDate - Ngày kết thúc
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
    leave: "annual", // Mặc định nghỉ phép thường là nghỉ phép năm
    sick: "sick",
    unpaid: "unpaid",
    compensatory: "compensatory",
    maternity: "maternity",
    // Các type khác không phải nghỉ phép
    overtime: null,
    remote: null,
    other: null,
  };
  return mapping[requestType] || null;
};

/**
 * Lấy số ngày phép của user
 * @param {ObjectId} userId - ID của user
 * @returns {Array} Leave balance data
 */
export const getLeaveBalance = async (userId) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Lấy user từ database
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Khởi tạo leave balance nếu chưa có
    user.initializeLeaveBalance();
    
    // Đảm bảo tất cả các field đều tồn tại
    if (!user.leaveBalance.annual || !user.leaveBalance.sick) {
      user.initializeLeaveBalance();
    }

    // Tính toán lại số ngày phép đã dùng từ các request đã approved trong năm hiện tại
    const currentYear = new Date().getFullYear();
    const approvedRequests = await RequestModel.find({
      userId,
      type: { $in: ["leave", "sick", "unpaid", "compensatory", "maternity"] },
      status: "approved",
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });

    // Reset số ngày đã dùng
    user.leaveBalance.annual.used = 0;
    user.leaveBalance.sick.used = 0;
    user.leaveBalance.unpaid.used = 0;
    user.leaveBalance.compensatory.used = 0;
    user.leaveBalance.maternity.used = 0;

    // Tính lại từ các request đã approved
    for (const request of approvedRequests) {
      const days = calculateDays(request.startDate, request.endDate);
      if (days <= 0) continue; // Bỏ qua nếu số ngày không hợp lệ
      
      const leaveType = mapLeaveType(request.type);

      if (leaveType && user.leaveBalance[leaveType]) {
        user.leaveBalance[leaveType].used += days;
      }
    }

    // Tính số ngày đang chờ duyệt
    const pendingRequests = await RequestModel.find({
      userId,
      type: { $in: ["leave", "sick", "unpaid", "compensatory", "maternity"] },
      status: "pending",
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });

    user.leaveBalance.annual.pending = 0;
    user.leaveBalance.sick.pending = 0;
    user.leaveBalance.unpaid.pending = 0;
    user.leaveBalance.compensatory.pending = 0;
    user.leaveBalance.maternity.pending = 0;

    for (const request of pendingRequests) {
      const days = calculateDays(request.startDate, request.endDate);
      if (days <= 0) continue; // Bỏ qua nếu số ngày không hợp lệ
      
      const leaveType = mapLeaveType(request.type);

      if (leaveType && user.leaveBalance[leaveType]) {
        user.leaveBalance[leaveType].pending += days;
      }
    }

    // Tính lại số ngày còn lại
    user.recalculateLeaveBalance();
    await user.save();

    // Format data để trả về frontend
    return [
      {
        id: "annual",
        name: "Nghỉ phép năm",
        total: user.leaveBalance.annual.total,
        used: user.leaveBalance.annual.used,
        remaining: user.leaveBalance.annual.remaining,
        pending: user.leaveBalance.annual.pending,
        description: "Nghỉ phép hàng năm theo quy định",
      },
      {
        id: "sick",
        name: "Nghỉ ốm",
        total: user.leaveBalance.sick.total,
        used: user.leaveBalance.sick.used,
        remaining: user.leaveBalance.sick.remaining,
        pending: user.leaveBalance.sick.pending,
        description: "Nghỉ ốm có lương",
      },
      {
        id: "unpaid",
        name: "Nghỉ không lương",
        total: user.leaveBalance.unpaid.total,
        used: user.leaveBalance.unpaid.used,
        remaining: user.leaveBalance.unpaid.remaining,
        pending: user.leaveBalance.unpaid.pending,
        description: "Nghỉ không hưởng lương",
      },
      {
        id: "compensatory",
        name: "Nghỉ bù",
        total: user.leaveBalance.compensatory.total,
        used: user.leaveBalance.compensatory.used,
        remaining: user.leaveBalance.compensatory.remaining,
        pending: user.leaveBalance.compensatory.pending,
        description: "Nghỉ bù do làm thêm giờ",
      },
      {
        id: "maternity",
        name: "Nghỉ thai sản",
        total: user.leaveBalance.maternity.total,
        used: user.leaveBalance.maternity.used,
        remaining: user.leaveBalance.maternity.remaining,
        pending: user.leaveBalance.maternity.pending,
        description: "Nghỉ thai sản theo luật lao động",
      },
    ];
  } catch (error) {
    console.error("Error getting leave balance:", error);
    throw error;
  }
};

/**
 * Lấy lịch sử nghỉ phép của user
 * @param {ObjectId} userId - ID của user
 * @param {Object} options - Options: limit, skip, status
 * @returns {Array} Leave history
 */
export const getLeaveHistory = async (userId, options = {}) => {
  try {
    // Validate userId
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    const { limit = 50, skip = 0, status } = options;

    // Build query
    const query = {
      userId,
      type: { $in: ["leave", "sick", "unpaid", "compensatory", "maternity"] },
    };

    if (status) {
      query.status = status;
    }

    // Lấy requests với populate thông tin người duyệt
    const requests = await RequestModel.find(query)
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Map type từ request sang tên hiển thị
    const typeMapping = {
      leave: "Nghỉ phép năm",
      sick: "Nghỉ ốm",
      unpaid: "Nghỉ không lương",
      compensatory: "Nghỉ bù",
      maternity: "Nghỉ thai sản",
    };

    // Format data để trả về frontend
    return requests.map((request) => ({
      id: request._id.toString(),
      type: typeMapping[request.type] || request.type,
      startDate: request.startDate.toISOString().split("T")[0],
      endDate: request.endDate.toISOString().split("T")[0],
      days: calculateDays(request.startDate, request.endDate),
      status: request.status,
      reason: request.reason,
      approver: request.approvedBy?.name || null,
      approvedAt: request.approvedAt
        ? new Date(request.approvedAt).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    }));
  } catch (error) {
    console.error("Error getting leave history:", error);
    throw error;
  }
};
