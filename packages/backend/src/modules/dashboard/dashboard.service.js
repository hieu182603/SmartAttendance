import { UserModel } from "../users/user.model.js";
import { AttendanceModel } from "../attendance/attendance.model.js";
import { RequestModel } from "../requests/request.model.js";
import { NotificationModel } from "../notifications/notification.model.js";

export class DashboardService {
  /**
   * Lấy summary cho dashboard (shift, location, workingDays)
   */
  static async getDashboardSummary(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Lấy attendance hôm nay của user
      const todayAttendance = await AttendanceModel.findOne({
        userId,
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      }).populate("locationId");

      // Tính số ngày làm việc trong tháng
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthAttendances = await AttendanceModel.find({
        userId,
        date: {
          $gte: monthStart,
          $lte: monthEnd,
        },
        status: { $in: ["present", "late"] },
      });

      const workingDays = {
        used: monthAttendances.length,
        total: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(), // Tổng số ngày trong tháng
      };

      return {
        shift: todayAttendance?.checkIn
          ? new Date(todayAttendance.checkIn).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        location: todayAttendance?.locationId?.name || null,
        workingDays,
      };
    } catch (error) {
      console.error("[DashboardService] getDashboardSummary error:", error);
      return {
        shift: null,
        location: null,
        workingDays: { used: 0, total: 0 },
      };
    }
  }

  /**
   * Lấy pending actions (pending requests, unread notifications)
   */
  static async getPendingActions(userId) {
    try {
      const user = await UserModel.findById(userId).select('role department');

      let pendingRequestsQuery = { status: "pending" };

      // For SUPERVISOR, get pending requests from their department employees that they can approve
      if (user.role === 'SUPERVISOR' && user.department) {
        const departmentUsers = await UserModel.find({
          department: user.department,
          role: { $in: ['EMPLOYEE', 'SUPERVISOR'] },
          isActive: true
        }).select('_id');
        const departmentUserIds = departmentUsers.map(u => u._id);
        pendingRequestsQuery.userId = { $in: departmentUserIds };
      } else {
        // For other roles, get their own pending requests
        pendingRequestsQuery.userId = userId;
      }

      // Đếm pending requests
      const pendingRequests = await RequestModel.countDocuments(pendingRequestsQuery);

      // Đếm unread notifications
      const unreadNotifications = await NotificationModel.countDocuments({
        userId,
        isRead: false,
      });

      return {
        hasPendingRequests: pendingRequests > 0,
        hasUnreadNotifications: unreadNotifications > 0,
      };
    } catch (error) {
      console.error("[DashboardService] getPendingActions error:", error);
      return {
        hasPendingRequests: false,
        hasUnreadNotifications: false,
      };
    }
  }

  /**
   * Lấy thống kê tổng quan cho dashboard
   */
  static async getDashboardStats(departmentFilter = null) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Tổng số nhân viên (chỉ tính active)
      const employeeQuery = { isActive: true };
      if (departmentFilter) {
        employeeQuery.department = departmentFilter;
      }
      const totalEmployees = await UserModel.countDocuments(employeeQuery);

      // Lấy attendance hôm nay
      const todayAttendanceQuery = {
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      };

      let todayAttendance = [];
      if (departmentFilter) {
        // Get users in the department first, then filter attendance
        const departmentUsers = await UserModel.find({ department: departmentFilter, isActive: true }).select('_id');
        const userIds = departmentUsers.map(u => u._id);
        todayAttendanceQuery.userId = { $in: userIds };
      }

      todayAttendance = await AttendanceModel.find(todayAttendanceQuery);

      // Tính toán stats hôm nay
      const presentToday = todayAttendance.filter(
        (att) => att.status === "present"
      ).length;
      const lateToday = todayAttendance.filter(
        (att) => att.status === "late"
      ).length;
      const absentToday = totalEmployees - presentToday - lateToday;

      // Lấy attendance tuần này (7 ngày gần nhất)
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6); // 7 ngày bao gồm hôm nay

      const weekAttendanceQuery = {
        date: {
          $gte: weekStart,
          $lt: tomorrow,
        },
      };

      if (departmentFilter) {
        const departmentUsers = await UserModel.find({ department: departmentFilter, isActive: true }).select('_id');
        const userIds = departmentUsers.map(u => u._id);
        weekAttendanceQuery.userId = { $in: userIds };
      }

      const weekAttendance = await AttendanceModel.find(weekAttendanceQuery);

      // Nhóm theo ngày trong tuần
      const attendanceByDay = {};
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

      // Khởi tạo với giá trị 0
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dayIndex = date.getDay(); // 0 = CN, 1 = T2, ...
        const dayName = dayNames[dayIndex];
        attendanceByDay[dayName] = {
          date: dayName,
          present: 0,
          late: 0,
          absent: 0,
        };
      }

      // Đếm attendance theo ngày
      weekAttendance.forEach((att) => {
        const attDate = new Date(att.date);
        const dayIndex = attDate.getDay();
        const dayName = dayNames[dayIndex];

        if (att.status === "present") {
          attendanceByDay[dayName].present++;
        } else if (att.status === "late") {
          attendanceByDay[dayName].late++;
        } else {
          attendanceByDay[dayName].absent++;
        }
      });

      // Tính absent cho mỗi ngày (tổng employees - present - late)
      Object.keys(attendanceByDay).forEach((day) => {
        const dayData = attendanceByDay[day];
        dayData.absent = Math.max(0, totalEmployees - dayData.present - dayData.late);
      });

      // Chuyển đổi thành array theo thứ tự T2-CN
      const attendanceData = [
        attendanceByDay["T2"],
        attendanceByDay["T3"],
        attendanceByDay["T4"],
        attendanceByDay["T5"],
        attendanceByDay["T6"],
        attendanceByDay["T7"],
        attendanceByDay["CN"],
      ];

      // Tính phần trăm tăng trưởng (so với tuần trước)
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);

      const lastWeekAttendance = await AttendanceModel.find({
        date: {
          $gte: lastWeekStart,
          $lt: lastWeekEnd,
        },
      });

      const lastWeekPresent = lastWeekAttendance.filter(
        (att) => att.status === "present"
      ).length;
      const thisWeekPresent = weekAttendance.filter(
        (att) => att.status === "present"
      ).length;

      let growthPercentage = 0;
      if (lastWeekPresent > 0) {
        growthPercentage =
          ((thisWeekPresent - lastWeekPresent) / lastWeekPresent) * 100;
      } else if (thisWeekPresent > 0) {
        growthPercentage = 100; // Tăng 100% nếu tuần trước = 0
      }

      return {
        kpi: {
          totalEmployees,
          presentToday,
          lateToday,
          absentToday,
        },
        attendanceData,
        growthPercentage: parseFloat(growthPercentage.toFixed(1)),
      };
    } catch (error) {
      console.error("[DashboardService] getDashboardStats error:", error);
      throw error;
    }
  }
}

