import cron from "node-cron";
import { AttendanceModel } from "../modules/attendance/attendance.model.js";
import { UserModel } from "../modules/users/user.model.js";

/**
 * Cron job: Xử lý attendance cuối ngày
 * - Tự động check-out cho nhân viên quên check-out
 * - Đánh dấu absent cho nhân viên không chấm công
 * Chạy vào 23:59 mỗi ngày
 */
export const markAbsentJob = cron.schedule(
  "59 23 * * *", // Chạy lúc 23:59 mỗi ngày
  async () => {
    try {
      console.log("[CRON] Bắt đầu xử lý attendance cuối ngày...");

      // Lấy ngày hôm nay (chỉ ngày, không có giờ)
      const today = new Date();
      const dateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      // Kiểm tra nếu là cuối tuần (0 = Chủ nhật, 6 = Thứ 7)
      const dayOfWeek = today.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log("[CRON] Hôm nay là cuối tuần, bỏ qua xử lý");
        return;
      }

      // === 1. Tự động check-out cho nhân viên quên check-out ===
      const DEFAULT_CHECKOUT_HOUR = 18; // 18:00 (6 PM)
      const DEFAULT_CHECKOUT_MINUTE = 0;

      const notCheckedOut = await AttendanceModel.find({
        date: dateOnly,
        checkIn: { $ne: null }, // Đã check-in
        checkOut: null, // Chưa check-out
      });

      if (notCheckedOut.length > 0) {
        const autoCheckoutTime = new Date(dateOnly);
        autoCheckoutTime.setHours(DEFAULT_CHECKOUT_HOUR, DEFAULT_CHECKOUT_MINUTE, 0, 0);

        for (const attendance of notCheckedOut) {
          attendance.checkOut = autoCheckoutTime;
          attendance.calculateWorkHours(); // Tính lại giờ làm
          
          // Thêm note để đánh dấu là auto checkout
          const existingNotes = attendance.notes || "";
          attendance.notes = existingNotes 
            ? `${existingNotes}\n[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:00 - Quên check-out]`
            : `[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:00 - Quên check-out]`;
          
          await attendance.save();
        }

        console.log(
          `[CRON] Đã tự động check-out cho ${notCheckedOut.length} nhân viên quên check-out`
        );
      }

      // === 2. Đánh dấu absent cho nhân viên không chấm công ===
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

      if (absentUserIds.length > 0) {
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
      }

      console.log("[CRON] Hoàn thành xử lý attendance cuối ngày");
    } catch (error) {
      console.error("[CRON] Lỗi khi xử lý attendance:", error);
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
  console.log("   - Attendance end-of-day: Chạy lúc 23:59 mỗi ngày");
  console.log("     + Tự động check-out (18:00) cho nhân viên quên check-out");
  console.log("     + Đánh dấu absent cho nhân viên không chấm công");
};

/**
 * Dừng tất cả cron jobs
 */
export const stopCronJobs = () => {
  markAbsentJob.stop();
  console.log("⏹️  Cron jobs đã dừng");
};
