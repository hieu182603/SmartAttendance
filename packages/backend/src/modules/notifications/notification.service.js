import { NotificationModel } from "./notification.model.js";
import { emitNotification } from "../../config/socket.js";

export class NotificationService {
  static async createNotification(data) {
    const notification = await NotificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      metadata: data.metadata || {},
    });

    // Emit real-time notification via Socket.io
    try {
      emitNotification(String(data.userId), {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedEntityType: notification.relatedEntityType,
        relatedEntityId: notification.relatedEntityId,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      });
    } catch (error) {
      console.error("[NotificationService] Error emitting notification:", error);
      // Don't fail if socket emit fails
    }

    return notification;
  }

  static async createRequestApprovalNotification(request, approverName, isApproved, comments) {
    // Reuse createNotification để đảm bảo luôn emit real-time qua Socket.io
    const reason = request.reason || "";
    const preview =
      reason.length > 50 ? `${reason.substring(0, 50)}...` : reason;

    return this.createNotification({
      userId: request.userId,
      type: isApproved ? "request_approved" : "request_rejected",
      title: isApproved
        ? "✅ Yêu cầu đã được phê duyệt"
        : "❌ Yêu cầu đã bị từ chối",
      message: isApproved
        ? `Yêu cầu "${preview}" đã được ${approverName} phê duyệt.${comments ? `\n\nNhận xét: ${comments}` : ""
        }`
        : `Yêu cầu "${preview}" đã bị ${approverName} từ chối.${comments ? `\n\nLý do: ${comments}` : ""
        }`,
      relatedEntityType: "request",
      relatedEntityId: request._id,
      metadata: {
        requestType: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        approverName,
        comments,
      },
    });
  }

  static async getUserNotifications(userId, options = {}) {
    const { limit = 50, skip = 0, isRead } = options;
    const query = { userId };
    if (isRead !== undefined) {
      query.isRead = isRead;
    }
    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    return notifications;
  }

  static async markAsRead(notificationId, userId) {
    const notification = await NotificationModel.findOne({
      _id: notificationId,
      userId,
    });
    if (!notification) {
      throw new Error("Notification not found");
    }
    return notification.markAsRead();
  }

  static async markAllAsRead(userId) {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  }

  static async getUnreadCount(userId) {
    return NotificationModel.countDocuments({ userId, isRead: false });
  }

  /**
   * Create and emit notification (convenience method)
   */
  static async createAndEmitNotification(data) {
    return this.createNotification(data);
  }

  /**
   * Tạo notification khi admin update attendance của user
   * @param {Object} attendance - Attendance object (đã populate userId)
   * @param {string} adminName - Tên admin đã update
   * @param {Object} changes - Object chứa các thay đổi
   */
  static async createAttendanceUpdatedNotification(attendance, adminName, changes = {}) {
    const userName = attendance.userId?.name || "Nhân viên";
    const date = attendance.date ? new Date(attendance.date).toLocaleDateString("vi-VN") : "";

    // Tạo message mô tả các thay đổi
    const changeMessages = [];
    if (changes.checkIn) changeMessages.push(`Check-in: ${changes.checkIn.from || "N/A"} → ${changes.checkIn.to || "N/A"}`);
    if (changes.checkOut) changeMessages.push(`Check-out: ${changes.checkOut.from || "N/A"} → ${changes.checkOut.to || "N/A"}`);
    if (changes.status) changeMessages.push(`Trạng thái: ${changes.status.from || "N/A"} → ${changes.status.to || "N/A"}`);
    if (changes.location) changeMessages.push(`Địa điểm: ${changes.location.from || "N/A"} → ${changes.location.to || "N/A"}`);

    const changesText = changeMessages.length > 0
      ? `\n\nCác thay đổi:\n${changeMessages.join("\n")}`
      : "";

    return this.createNotification({
      userId: attendance.userId?._id || attendance.userId,
      type: "attendance_updated",
      title: "📝 Chấm công đã được cập nhật",
      message: `Chấm công của bạn ngày ${date} đã được ${adminName} cập nhật.${changesText}`,
      relatedEntityType: "attendance",
      relatedEntityId: attendance._id,
      metadata: {
        date: attendance.date,
        changes,
        adminName,
      },
    });
  }

  /**
   * Tạo notification cho performance review được approve
   * @param {Object} review - Performance review object (đã populate employeeId và reviewerId)
   * @param {string} approverName - Tên người approve
   */
  static async createPerformanceReviewApprovedNotification(review, approverName) {
    const employeeName = review.employeeId?.name || "Nhân viên";
    const period = review.period || "";
    const overallScore = review.overallScore || "N/A";

    return this.createNotification({
      userId: review.reviewerId?._id || review.reviewerId,
      type: "performance_review_approved",
      title: "✅ Đánh giá hiệu suất đã được phê duyệt",
      message: `Đánh giá hiệu suất cho ${employeeName} (Kỳ ${period}) đã được ${approverName} phê duyệt. Điểm tổng: ${overallScore}`,
      relatedEntityType: "performance_review",
      relatedEntityId: review._id,
      metadata: {
        employeeId: review.employeeId?._id || review.employeeId,
        employeeName,
        period,
        overallScore,
        approverName,
        reviewDate: review.reviewDate,
      },
    });
  }

  /**
   * Tạo notification cho performance review bị reject
   * @param {Object} review - Performance review object (đã populate employeeId và reviewerId)
   * @param {string} rejecterName - Tên người reject
   * @param {string} rejectionReason - Lý do reject
   */
  static async createPerformanceReviewRejectedNotification(review, rejecterName, rejectionReason) {
    const employeeName = review.employeeId?.name || "Nhân viên";
    const period = review.period || "";
    const reasonPreview = rejectionReason.length > 100
      ? `${rejectionReason.substring(0, 100)}...`
      : rejectionReason;

    return this.createNotification({
      userId: review.reviewerId?._id || review.reviewerId,
      type: "performance_review_rejected",
      title: "❌ Đánh giá hiệu suất đã bị từ chối",
      message: `Đánh giá hiệu suất cho ${employeeName} (Kỳ ${period}) đã bị ${rejecterName} từ chối.${rejectionReason ? `\n\nLý do: ${reasonPreview}` : ""}`,
      relatedEntityType: "performance_review",
      relatedEntityId: review._id,
      metadata: {
        employeeId: review.employeeId?._id || review.employeeId,
        employeeName,
        period,
        rejecterName,
        rejectionReason,
      },
    });
  }

  /**
   * Tạo notification khi assign shift cho user
   * @param {Object} assignment - Shift assignment object
   * @param {Object} shift - Shift object
   * @param {string} adminName - Tên admin đã assign
   */
  static async createShiftAssignedNotification(assignment, shift, adminName) {
    const userName = assignment.userId?.name || assignment.userId?.toString() || "Nhân viên";
    const shiftName = shift?.name || "Ca làm việc";
    const effectiveFrom = assignment.effectiveFrom
      ? new Date(assignment.effectiveFrom).toLocaleDateString("vi-VN")
      : "";

    return this.createNotification({
      userId: assignment.userId?._id || assignment.userId,
      type: "shift_assigned",
      title: "📅 Đã được gán ca làm việc",
      message: `Bạn đã được ${adminName} gán ca làm việc "${shiftName}".${effectiveFrom ? ` Có hiệu lực từ ${effectiveFrom}.` : ""}`,
      relatedEntityType: "shift",
      relatedEntityId: assignment._id || assignment.shiftId,
      metadata: {
        shiftId: assignment.shiftId || shift?._id,
        shiftName,
        effectiveFrom: assignment.effectiveFrom,
        effectiveTo: assignment.effectiveTo,
        pattern: assignment.pattern,
        adminName,
      },
    });
  }

  /**
   * Tạo notification khi remove shift assignment
   * @param {string} userId - User ID
   * @param {Object} shift - Shift object
   * @param {string} adminName - Tên admin đã remove
   */
  static async createShiftRemovedNotification(userId, shift, adminName) {
    const shiftName = shift?.name || "Ca làm việc";

    return this.createNotification({
      userId,
      type: "shift_removed",
      title: "📅 Đã bị gỡ ca làm việc",
      message: `Ca làm việc "${shiftName}" của bạn đã bị ${adminName} gỡ bỏ.`,
      relatedEntityType: "shift",
      relatedEntityId: shift?._id,
      metadata: {
        shiftId: shift?._id,
        shiftName,
        adminName,
      },
    });
  }

  /**
   * Tạo notification khi update shift assignment
   * @param {Object} assignment - Updated shift assignment object
   * @param {Object} shift - Shift object
   * @param {string} adminName - Tên admin đã update
   * @param {Object} changes - Object chứa các thay đổi
   */
  static async createShiftUpdatedNotification(assignment, shift, adminName, changes = {}) {
    const userName = assignment.userId?.name || assignment.userId?.toString() || "Nhân viên";
    const shiftName = shift?.name || "Ca làm việc";

    const changeMessages = [];
    if (changes.effectiveFrom) changeMessages.push(`Ngày bắt đầu: ${changes.effectiveFrom.from || "N/A"} → ${changes.effectiveFrom.to || "N/A"}`);
    if (changes.effectiveTo) changeMessages.push(`Ngày kết thúc: ${changes.effectiveTo.from || "N/A"} → ${changes.effectiveTo.to || "N/A"}`);
    if (changes.pattern) changeMessages.push(`Pattern: ${changes.pattern.from || "N/A"} → ${changes.pattern.to || "N/A"}`);

    const changesText = changeMessages.length > 0
      ? `\n\nCác thay đổi:\n${changeMessages.join("\n")}`
      : "";

    return this.createNotification({
      userId: assignment.userId?._id || assignment.userId,
      type: "shift_updated",
      title: "📅 Ca làm việc đã được cập nhật",
      message: `Ca làm việc "${shiftName}" của bạn đã được ${adminName} cập nhật.${changesText}`,
      relatedEntityType: "shift",
      relatedEntityId: assignment._id || assignment.shiftId,
      metadata: {
        shiftId: assignment.shiftId || shift?._id,
        shiftName,
        changes,
        adminName,
      },
    });
  }

  /**
   * Tạo notification cho manager/admin khi có request mới
   * @param {Object} request - Request object (đã populate userId)
   * @param {string} managerId - Manager ID cần nhận notification
   */
  static async createRequestCreatedNotification(request, managerId) {
    const employeeName = request.userId?.name || "Nhân viên";
    const requestTypeMap = {
      leave: "Nghỉ phép",
      sick: "Nghỉ ốm",
      unpaid: "Nghỉ không lương",
      compensatory: "Nghỉ bù",
      maternity: "Nghỉ thai sản",
    };
    const typeLabel = requestTypeMap[request.type] || request.type;
    const startDate = request.startDate ? new Date(request.startDate).toLocaleDateString("vi-VN") : "";
    const endDate = request.endDate ? new Date(request.endDate).toLocaleDateString("vi-VN") : "";
    const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

    const reasonPreview = request.reason
      ? (request.reason.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason)
      : "";

    return this.createNotification({
      userId: managerId,
      type: "request_created",
      title: "📋 Có yêu cầu mới cần duyệt",
      message: `${employeeName} đã gửi yêu cầu ${typeLabel} từ ${dateRange}.${reasonPreview ? `\n\nLý do: ${reasonPreview}` : ""}`,
      relatedEntityType: "request",
      relatedEntityId: request._id,
      metadata: {
        employeeId: request.userId?._id || request.userId,
        employeeName,
        requestType: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        urgency: request.urgency,
      },
    });
  }
}

