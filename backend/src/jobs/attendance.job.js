import cron from "node-cron";
import { AttendanceModel } from "../modules/attendance/attendance.model.js";
import { UserModel } from "../modules/users/user.model.js";
import { RequestModel } from "../modules/requests/request.model.js";
import { ATTENDANCE_CONFIG } from "../config/app.config.js";

/**
 * Logic xử lý attendance cuối ngày
 * - Tự động check-out cho nhân viên quên check-out
 * - Đánh dấu absent cho nhân viên không chấm công
 */
export const processEndOfDayAttendance = async (targetDate = null) => {
  try {
    // Lấy ngày cần xử lý (mặc định là hôm nay)
    const today = targetDate || new Date();
    const dateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Kiểm tra nếu là cuối tuần (0 = Chủ nhật, 6 = Thứ 7)
    const dayOfWeek = dateOnly.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { success: true, message: "Bỏ qua cuối tuần" };
    }

    // === 1. Tự động check-out cho nhân viên quên check-out ===
    const DEFAULT_CHECKOUT_HOUR = ATTENDANCE_CONFIG.DEFAULT_CHECKOUT_HOUR;
    const DEFAULT_CHECKOUT_MINUTE = ATTENDANCE_CONFIG.DEFAULT_CHECKOUT_MINUTE;

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
          ? `${existingNotes}\n[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:${String(DEFAULT_CHECKOUT_MINUTE).padStart(2, '0')} - Quên check-out]`
          : `[Tự động check-out lúc ${DEFAULT_CHECKOUT_HOUR}:${String(DEFAULT_CHECKOUT_MINUTE).padStart(2, '0')} - Quên check-out]`;

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
        try {
          await AttendanceModel.insertMany(leaveRecords, { ordered: false });
        } catch (error) {
          // Bỏ qua lỗi duplicate key
          if (error.code !== 11000) {
            throw error;
          }
        }
      }
    }

    // === 3. Đánh dấu absent cho nhân viên không chấm công (trừ người nghỉ phép) ===
    const activeUsers = await UserModel.find({
      isActive: true,
      role: { $in: ["EMPLOYEE", "MANAGER"] },
    }).select("_id");

    const userIds = activeUsers.map((u) => u._id);

    const attendedToday = await AttendanceModel.find({
      date: dateOnly,
      userId: { $in: userIds },
    }).select("userId");

    const attendedUserIds = attendedToday.map((a) => a.userId.toString());

    const absentUserIds = userIds.filter(
      (id) => !attendedUserIds.includes(id.toString()) && !onLeaveUserIds.includes(id.toString())
    );

    if (absentUserIds.length > 0) {
      const absentRecords = absentUserIds.map((userId) => ({
        userId,
        date: dateOnly,
        status: "absent",
        workHours: 0,
        notes: "Tự động đánh dấu absent - Không chấm công",
      }));

      try {
        await AttendanceModel.insertMany(absentRecords, { ordered: false });
      } catch (error) {
        // Bỏ qua lỗi duplicate key
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
    
    return {
      success: true,
      date: dateOnly,
      autoCheckout: notCheckedOut.length,
      onLeave: approvedLeaveRequests.length,
      absent: absentUserIds.length,
    };
  } catch (error) {
    console.error("[CRON] ❌ Lỗi khi xử lý attendance:", error);
    throw error;
  }
};

/**
 * Cron job 1: Chạy tự động lúc 23:59 mỗi ngày
 */
export const markAbsentJob = cron.schedule(
  "59 23 * * *",
  async () => {
    await processEndOfDayAttendance();
  },
  {
    scheduled: false,
    timezone: "Asia/Ho_Chi_Minh",
  }
);

export const backupAbsentJob = cron.schedule(
  "30 0 * * *",
  async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await processEndOfDayAttendance(yesterday);
  },
  {
    scheduled: false,
    timezone: "Asia/Ho_Chi_Minh",
  }
);

/**
 * Kiểm tra và xử lý các ngày đã qua chưa có record (khi server khởi động)
 */
export const checkMissingDays = async () => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const activeUsers = await UserModel.find({
      isActive: true,
      role: { $in: ["EMPLOYEE", "MANAGER"] },
    }).select("_id");
    
    if (activeUsers.length === 0) return;
    
    for (let d = new Date(sevenDaysAgo); d < today; d.setDate(d.getDate() + 1)) {
      const checkDate = new Date(d);
      const dayOfWeek = checkDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      const dateOnly = new Date(
        checkDate.getFullYear(),
        checkDate.getMonth(),
        checkDate.getDate()
      );
      
      const existingRecords = await AttendanceModel.find({
        date: dateOnly,
      }).select("userId");
      
      const existingUserIds = existingRecords.map(r => r.userId.toString());
      
      const missingUserIds = activeUsers
        .map(u => u._id)
        .filter(id => !existingUserIds.includes(id.toString()));
      
      if (missingUserIds.length > 0) {
        const approvedLeaveRequests = await RequestModel.find({
          type: { $in: ["leave", "sick", "unpaid", "compensatory", "maternity"] },
          status: "approved",
          startDate: { $lte: dateOnly },
          endDate: { $gte: dateOnly },
        }).select("userId");
        
        const onLeaveUserIds = approvedLeaveRequests.map(r => r.userId.toString());
        
        const absentUserIds = missingUserIds.filter(
          id => !onLeaveUserIds.includes(id.toString())
        );
        
        if (absentUserIds.length > 0) {
          const absentRecords = absentUserIds.map(userId => ({
            userId,
            date: dateOnly,
            status: "absent",
            workHours: 0,
            notes: "Tự động đánh dấu absent - Không chấm công",
          }));
          
          try {
            await AttendanceModel.insertMany(absentRecords, { ordered: false });
          } catch (error) {
            // Bỏ qua lỗi duplicate key
            if (error.code !== 11000) {
              throw error;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[CRON] Lỗi khi kiểm tra ngày thiếu:", error);
  }
};

/**
 * Khởi động tất cả cron jobs
 */
export const startCronJobs = async () => {
  markAbsentJob.start();
  backupAbsentJob.start();
  await checkMissingDays();
};

/**
 * Dừng tất cả cron jobs
 */
export const stopCronJobs = () => {
  markAbsentJob.stop();
  backupAbsentJob.stop();
  console.log("⏹️  Cron jobs đã dừng");
};
