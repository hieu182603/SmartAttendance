import { UserModel } from "../users/user.model.js";
import { AttendanceModel } from "../attendance/attendance.model.js";

export class DashboardService {
  /**
   * Lấy thống kê tổng quan cho dashboard
   */
  static async getDashboardStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Tổng số nhân viên (chỉ tính active)
      const totalEmployees = await UserModel.countDocuments({ isActive: true });

      // Lấy attendance hôm nay
      const todayAttendance = await AttendanceModel.find({
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      });

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

      const weekAttendance = await AttendanceModel.find({
        date: {
          $gte: weekStart,
          $lt: tomorrow,
        },
      });

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

