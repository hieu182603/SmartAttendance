import cron from "node-cron";
import { AttendanceModel } from "../modules/attendance/attendance.model.js";
import { UserModel } from "../modules/users/user.model.js";
import { RequestModel } from "../modules/requests/request.model.js";

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
        return;
      }

      // === 1. Tự động check-out cho nhân viên quên check-out ===
      const DEFAULT_CHECKOUT_HOUR = 18; 
      const DEFAULT_CHECKOUT_MINUTE = 0;

      const notCheckedOut = await AttendanceModel.find({
        date: dateOnly,
        checkIn: { $ne: null }, 
        checkOut: null, 
      });

      if (notCheckedOut.length > 0) {
        const autoCheckoutTime = new Date(dateOnly);
        autoCheckoutTime.setHours(DEFAULT_CHECKOUT_HOUR, DEFAULT_CHECKOUT_MINUTE, 0, 0);

        for (const attendance of notCheckedOut) {
          attendance.checkOut = autoCheckoutTime;
          attendance.calculateWorkHours();
          
          const existingNotes = attendance.notes || "";
          attendance.notes = existingNotes 
            ? `${existingNotes}\n[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:00 - Quên check-out]`
            : `[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:00 - Quên check-out]`;
          
          await attendance.save();
        }
      }

      // === 2. Tìm những người đang nghỉ phép hôm nay ===
      const approvedLeaveRequests = await RequestModel.find({
        type: { $in: ["leave", "sick", "unpaid", "compensatory", "maternity"] },
        status: "approved",
        startDate: { $lte: dateOnly },
        endDate: { $gte: dateOnly },
      }).select("userId type");

      const onLeaveUserIds = approvedLeaveRequests.map((r) => r.userId.toString());
      
      // Tạo bản ghi "on_leave" cho những người nghỉ phép
      if (approvedLeaveRequests.length > 0) {
        const leaveRecords = [];
        
        for (const request of approvedLeaveRequests) {
          // Kiểm tra xem đã có bản ghi chưa
          const existing = await AttendanceModel.findOne({
            userId: request.userId,
            date: dateOnly,
          });
          
          if (!existing) {
            const leaveTypeMap = {
              leave: "Nghỉ phép năm",
              sick: "Nghỉ ốm",
              unpaid: "Nghỉ không lương",
              compensatory: "Nghỉ bù",
              maternity: "Nghỉ thai sản",
            };
            
            leaveRecords.push({
              userId: request.userId,
              date: dateOnly,
              status: "on_leave",
              workHours: 0,
              notes: `Nghỉ phép: ${leaveTypeMap[request.type] || request.type}`,
            });
          }
        }
        
        if (leaveRecords.length > 0) {
          await AttendanceModel.insertMany(leaveRecords);
        }
      }

      // === 3. Đánh dấu absent cho nhân viên không chấm công (trừ người nghỉ phép) ===
      const activeUsers = await UserModel.find({
        isActive: true,
        role: "EMPLOYEE", // Chỉ check nhân viên, không check admin/manager
      }).select("_id");

      const userIds = activeUsers.map((u) => u._id);

      // Lấy danh sách đã chấm công hoặc có bản ghi hôm nay
      const attendedToday = await AttendanceModel.find({
        date: dateOnly,
        userId: { $in: userIds },
      }).select("userId");

      const attendedUserIds = attendedToday.map((a) => a.userId.toString());

      // Tìm những người chưa chấm công và không nghỉ phép
      const absentUserIds = userIds.filter(
        (id) => !attendedUserIds.includes(id.toString()) && !onLeaveUserIds.includes(id.toString())
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
      }
    } catch (error) {
      console.error("[CRON] Lỗi khi xử lý attendance:", error);
    }
  },
  {
    scheduled: false, 
    timezone: "Asia/Ho_Chi_Minh", 
  }
);

/**
 * Khởi động tất cả cron jobs
 */
export const startCronJobs = () => {
  markAbsentJob.start();
  console.log("✅ Cron jobs đã được khởi động");
  console.log("   Check điểm danh: Chạy lúc 23:59 mỗi ngày");
};

/**
 * Dừng tất cả cron jobs
 */
export const stopCronJobs = () => {
  markAbsentJob.stop();
  console.log("⏹️  Cron jobs đã dừng");
};
