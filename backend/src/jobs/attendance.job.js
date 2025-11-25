import cron from "node-cron";
import { AttendanceModel } from "../modules/attendance/attendance.model.js";
import { UserModel } from "../modules/users/user.model.js";

/**
 * Cron job: Đánh dấu absent cho nhân viên không chấm công
 * Chạy vào 23:59 mỗi ngày
 */
export const markAbsentJob = cron.schedule(
  "59 23 * * *", // Chạy lúc 23:59 mỗi ngày
  async () => {
    try {
      console.log("[CRON] Bắt đầu kiểm tra absent...");

      // Lấy ngày hôm nay (chỉ ngày, không có giờ)
      const today = new Date();
      const dateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      // Lấy tất cả nhân viên active
      const activeUsers = await UserModel.find({
        isActive: true,
        role: "EMPLOYEE", // Chỉ check nhân viên, không check admin/manager
      }).select("_id");

      const userIds = activeUsers.map((u) => u._id);

      // Lấy danh sách đã chấm công hôm nay
      const attendedToday = await AttendanceModel.find({
        date: dateOnly,
        userId: { $in: userIds },
      }).select("userId");

      const attendedUserIds = attendedToday.map((a) => a.userId.toString());

      // Tìm những người chưa chấm công
      const absentUserIds = userIds.filter(
        (id) => !attendedUserIds.includes(id.toString())
      );

      if (absentUserIds.length === 0) {
        console.log("[CRON] Không có nhân viên absent hôm nay");
        return;
      }

      // Tạo bản ghi absent cho những người chưa chấm công
      const absentRecords = absentUserIds.map((userId) => ({
        userId,
        date: dateOnly,
        status: "absent",
        workHours: 0,
        notes: "Tự động đánh dấu absent - Không chấm công",
      }));

      await AttendanceModel.insertMany(absentRecords);

      console.log(
        `[CRON] Đã đánh dấu absent cho ${absentUserIds.length} nhân viên`
      );
    } catch (error) {
      console.error("[CRON] Lỗi khi đánh dấu absent:", error);
    }
  },
  {
    scheduled: false, // Không tự động start, sẽ start thủ công
    timezone: "Asia/Ho_Chi_Minh", // Múi giờ Việt Nam
  }
);

/**
 * Khởi động tất cả cron jobs
 */
export const startCronJobs = () => {
  markAbsentJob.start();
  console.log("✅ Cron jobs đã được khởi động");
  console.log("   - Mark absent: Chạy lúc 23:59 mỗi ngày");
};

/**
 * Dừng tất cả cron jobs
 */
export const stopCronJobs = () => {
  markAbsentJob.stop();
  console.log("⏹️  Cron jobs đã dừng");
};
