import { AttendanceModel } from "./attendance.model.js";
import { BranchModel } from "../branches/branch.model.js";
import {
  formatDateLabel,
  formatTime,
  deriveStatus,
  buildAttendanceRecordResponse,
  formatDepartment,
  buildDateQuery,
  getDateRange,
  processCheckIn,
  processCheckOut,
  getUserSchedule,
  getShiftInfo,
  checkLateStatus,
} from "./attendance.service.js";
import {
  emitAttendanceUpdate,
  emitAttendanceUpdateToAdmins,
} from "../../config/socket.js";
import { APP_CONFIG } from "../../config/app.config.js";

// ============================================================================
// USER ATTENDANCE CONTROLLERS
// ============================================================================

/**
 * GET /attendance/recent
 * Lấy lịch sử chấm công gần đây của user
 */
export const getRecentAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 5;

    const docs = await AttendanceModel.find({ userId })
      .populate("locationId")
      .sort({ date: -1 })
      .limit(limit);

    const data = docs.map((doc) => {
      const dayLabel = new Date(doc.date).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: APP_CONFIG.TIMEZONE,
      });

      return {
        date: dayLabel,
        checkIn: doc.checkIn
          ? new Date(doc.checkIn).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: APP_CONFIG.TIMEZONE,
            })
          : null,
        checkOut: doc.checkOut
          ? new Date(doc.checkOut).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: APP_CONFIG.TIMEZONE,
            })
          : null,
        status: doc.status || "absent",
        location: doc.locationId?.name || null,
      };
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("[attendance] recent error", error);
    return res.status(500).json({
      message: error.message || "Lỗi server. Vui lòng thử lại sau.",
    });
  }
};

/**
 * GET /attendance/history
 * Lấy lịch sử chấm công với filter và pagination
 */
export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, status, page = 1, limit = 20 } = req.query;

    const query = { userId };

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by date range
    const dateQuery = buildDateQuery(from, to);
    if (Object.keys(dateQuery).length > 0) {
      Object.assign(query, dateQuery);
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    // Get total count and paginated records in parallel
    const [total, paginatedRecords] = await Promise.all([
      AttendanceModel.countDocuments(query),
      AttendanceModel.find(query)
        .populate("locationId")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const data = paginatedRecords.map((doc) => {
      const dayLabel = new Date(doc.date).toLocaleDateString("vi-VN", {
        weekday: "long",
      });
      return {
        id: doc._id.toString(),
        date: formatDateLabel(doc.date),
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        checkIn: formatTime(doc.checkIn),
        checkOut: formatTime(doc.checkOut),
        hours: doc.workHours ? `${doc.workHours}h` : "-",
        status: deriveStatus(doc),
        location: doc.locationId?.name || "Văn phòng",
        notes: doc.notes || "",
      };
    });

    res.json({
      records: data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[attendance] history error", error);
    res.status(500).json({
      message: "Không lấy được lịch sử chấm công. Vui lòng thử lại sau.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /attendance/checkin
 * Chấm công vào (Check-in)
 */
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude: latRaw, longitude: lonRaw, accuracy } = req.body || {};
    const photoFile = req.file || null;

    const latitude = latRaw !== undefined ? Number(latRaw) : undefined;
    const longitude = lonRaw !== undefined ? Number(lonRaw) : undefined;

    const result = await processCheckIn(
      userId,
      latitude,
      longitude,
      accuracy,
      photoFile?.buffer || null
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        data: result.data,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("[attendance] check-in error", error);
    res.status(500).json({
      success: false,
      message:
        "Có lỗi xảy ra khi chấm công vào. Vui lòng kiểm tra kết nối và thử lại.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /attendance/checkout
 * Check-out (chấm công ra)
 */
export const checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { latitude, longitude, accuracy } = req.body;
    const photoFile = req.file || null;

    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);
    accuracy = accuracy ? parseFloat(accuracy) : null;

    const result = await processCheckOut(
      userId,
      latitude,
      longitude,
      accuracy,
      photoFile?.buffer || null
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        data: result.data,
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("[attendance] check-out error", error);
    res.status(500).json({
      success: false,
      message:
        "Có lỗi xảy ra khi chấm công ra. Vui lòng kiểm tra kết nối và thử lại.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================================================
// ADMIN/MANAGER CONTROLLERS
// ============================================================================

/**
 * GET /attendance/analytics
 * Lấy dữ liệu phân tích chấm công (Admin/HR/Manager)
 */
export const getAttendanceAnalytics = async (req, res) => {
  try {
    const { from, to, department } = req.query;

    const dateQuery = buildDateQuery(from, to);
    if (Object.keys(dateQuery).length === 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateQuery.date = { $gte: sevenDaysAgo };
    }

    const attendanceQuery = { ...dateQuery };
    const userQuery = {};

    if (department && department !== "all") {
      userQuery.department = department;
    }

    const UserModel = (await import("../users/user.model.js")).UserModel;

    let userIds = [];
    if (Object.keys(userQuery).length > 0) {
      const users = await UserModel.find(userQuery).select("_id");
      userIds = users.map((u) => u._id);
      if (userIds.length === 0) {
        return res.json({
          dailyData: [],
          departmentStats: [],
          topPerformers: [],
          summary: {
            attendanceRate: 0,
            avgPresent: 0,
            avgLate: 0,
            avgAbsent: 0,
            trend: 0,
          },
        });
      }
      attendanceQuery.userId = { $in: userIds };
    }

    const attendances = await AttendanceModel.find(attendanceQuery)
      .populate({
        path: "userId",
        select: "name department",
        populate: {
          path: "department",
          select: "name",
        },
      })
      .sort({ date: 1 });

    // OPTIMIZATION: Sử dụng status có sẵn thay vì re-calculate
    // Attendance records đã có status: "present", "late", "absent"
    // Không cần query schedules nữa!

    const dailyMap = new Map();
    const departmentMap = new Map();
    const employeeMap = new Map();

    // Xử lý attendance records với cache
    for (const att of attendances) {
      const dateKey = formatDateLabel(att.date);
      const user = att.userId;
      const dept =
        typeof user?.department === "object" && user?.department?.name
          ? user.department.name
          : user?.department || "N/A";

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          present: 0,
          late: 0,
          absent: 0,
          onLeave: 0,
          total: 0,
        });
      }

      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          onTime: 0,
          late: 0,
          absent: 0,
          total: 0,
        });
      }

      const userId = user?._id?.toString();
      if (userId && !employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: user?.name || "N/A",
          onTime: 0,
          late: 0,
          absent: 0,
          checkInTimes: [],
        });
      }

      const daily = dailyMap.get(dateKey);
      const deptStat = departmentMap.get(dept);
      daily.total++;

      // SIMPLIFIED LOGIC: Sử dụng status có sẵn từ DB
      // Status đã được tính đúng khi check-in, không cần re-calculate
      
      if (att.status === "late") {
        // Đi muộn
        daily.late++;
        deptStat.late++;
        if (userId && att.checkIn) {
          const emp = employeeMap.get(userId);
          if (emp) {
            emp.late++;
            const checkInHour = new Date(att.checkIn).getHours();
            const checkInMin = new Date(att.checkIn).getMinutes();
            emp.checkInTimes.push(
              `${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}`
            );
          }
        }
      } else if (att.status === "present") {
        // Đúng giờ
        daily.present++;
        deptStat.onTime++;
        if (userId && att.checkIn) {
          const emp = employeeMap.get(userId);
          if (emp) {
            emp.onTime++;
            const checkInHour = new Date(att.checkIn).getHours();
            const checkInMin = new Date(att.checkIn).getMinutes();
            emp.checkInTimes.push(
              `${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}`
            );
          }
        }
      } else if (att.status === "absent" || att.status === "on_leave") {
        // Vắng mặt hoặc nghỉ phép
        daily.absent++;
        deptStat.absent++;
        if (userId) {
          const emp = employeeMap.get(userId);
          if (emp) {
            emp.absent++;
          }
        }
      }

      deptStat.total++;
    }

    const dailyData = Array.from(dailyMap.values());
    const departmentStats = Array.from(departmentMap.values()).map((dept) => ({
      department: dept.department,
      onTime: dept.total > 0 ? Math.round((dept.onTime / dept.total) * 100) : 0,
      late: dept.total > 0 ? Math.round((dept.late / dept.total) * 100) : 0,
      absent: dept.total > 0 ? Math.round((dept.absent / dept.total) * 100) : 0,
    }));

    const topPerformers = Array.from(employeeMap.values())
      .map((emp) => {
        const total = emp.onTime + emp.late + emp.absent;
        const punctuality =
          total > 0 ? Math.round((emp.onTime / total) * 100) : 0;
        const avgCheckIn =
          emp.checkInTimes.length > 0
            ? emp.checkInTimes.reduce((sum, time) => {
                const [h, m] = time.split(":").map(Number);
                return sum + h * 60 + m;
              }, 0) / emp.checkInTimes.length
            : 0;
        const avgHours = Math.floor(avgCheckIn / 60);
        const avgMins = Math.round(avgCheckIn % 60);
        return {
          name: emp.name,
          onTime: emp.onTime,
          late: emp.late,
          absent: emp.absent,
          avgCheckIn:
            avgCheckIn > 0
              ? `${String(avgHours).padStart(2, "0")}:${String(
                  avgMins
                ).padStart(2, "0")}`
              : "-",
          punctuality,
        };
      })
      .filter((emp) => emp.onTime + emp.late + emp.absent > 0)
      .sort((a, b) => b.punctuality - a.punctuality)
      .slice(0, 5);

    const totalEmployeesQuery = { isActive: true };
    if (department && department !== "all") {
      totalEmployeesQuery.department = department;
    }
    const totalEmployees = await UserModel.countDocuments(totalEmployeesQuery);

    const totalDays = dailyData.length;
    const avgPresent =
      totalDays > 0
        ? Math.round(
            dailyData.reduce((sum, d) => sum + d.present, 0) / totalDays
          )
        : 0;
    const avgLate =
      totalDays > 0
        ? Math.round(dailyData.reduce((sum, d) => sum + d.late, 0) / totalDays)
        : 0;
    const avgAbsent =
      totalDays > 0
        ? Math.round(
            dailyData.reduce((sum, d) => sum + d.absent, 0) / totalDays
          )
        : 0;
    const attendanceRate =
      totalEmployees > 0 ? Math.round((avgPresent / totalEmployees) * 100) : 0;

    const totalPresent = dailyData.reduce((sum, d) => sum + d.present, 0);
    const totalLate = dailyData.reduce((sum, d) => sum + d.late, 0);
    const totalAbsent = dailyData.reduce((sum, d) => sum + d.absent, 0);
    const totalRecords = totalPresent + totalLate + totalAbsent;

    let trend = 0;
    if (totalDays >= 7) {
      const currentWeek = dailyData.slice(-7);
      const previousWeek = dailyData.slice(-14, -7);
      if (previousWeek.length === 7) {
        const currentAvg =
          currentWeek.reduce((sum, d) => sum + d.present, 0) / 7;
        const previousAvg =
          previousWeek.reduce((sum, d) => sum + d.present, 0) / 7;
        if (previousAvg > 0) {
          trend = Math.round(((currentAvg - previousAvg) / previousAvg) * 100);
        }
      }
    }

    const response = {
      dailyData,
      departmentStats,
      topPerformers,
      summary: {
        attendanceRate,
        avgPresent,
        avgLate,
        avgAbsent,
        trend,
        totalEmployees,
        total: totalRecords,
        ontime: totalPresent,
        late: totalLate,
        absent: totalAbsent,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("[attendance] analytics error", error);
    res.status(500).json({ 
      message: "Không lấy được dữ liệu phân tích",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /attendance/all
 * Lấy tất cả chấm công của tất cả nhân viên (Admin/HR)
 */
export const getAllAttendance = async (req, res) => {
  try {
    const { date, search, status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const { start, end } = getDateRange(date);
    const dateQuery = { $gte: start, $lt: end };

    const UserModel = (await import("../users/user.model.js")).UserModel;

    const userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const usersForScope = await UserModel.find(userQuery)
      .select("_id name email department role")
      .sort({ name: 1 });
    const totalUsers = usersForScope.length;

    if (totalUsers === 0) {
      return res.json({
        records: [],
        summary: { total: 0, present: 0, late: 0, absent: 0 },
        pagination: { page: 1, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    const allUserIds = usersForScope.map((u) => u._id);

    const attendanceDocs = await AttendanceModel.find({
      userId: { $in: allUserIds },
      date: dateQuery,
    })
      .populate("userId", "name email department role")
      .populate("locationId", "name")
      .sort({ checkIn: -1 });

    const attendanceMap = new Map();
    attendanceDocs.forEach((doc) => {
      const populatedUser =
        doc.userId && typeof doc.userId === "object" ? doc.userId : null;
      const key = populatedUser?._id?.toString() || doc.userId?.toString();
      if (key && !attendanceMap.has(key)) {
        attendanceMap.set(key, doc);
      }
    });

    const allRecords = usersForScope.map((user) => {
      const userId = user._id.toString();
      const attendance = attendanceMap.get(userId);
      if (attendance) {
        return buildAttendanceRecordResponse(attendance);
      }
      return {
        id: `absent-${userId}`,
        userId,
        name: user.name || "N/A",
        role: user.role || "N/A",
        email: user.email || "N/A",
        department: formatDepartment(user.department),
        date: formatDateLabel(start),
        checkIn: "-",
        checkOut: "-",
        hours: "-",
        status: "absent",
        location: "-",
        notes: "",
      };
    });

    const statusFilter =
      typeof status === "string" ? status.toLowerCase() : "all";

    const filteredRecords =
      statusFilter && statusFilter !== "all"
        ? allRecords.filter((record) => record.status === statusFilter)
        : allRecords;

    const paginatedRecords = filteredRecords.slice(skip, skip + limitNum);

    const summary = {
      total: totalUsers,
      present: allRecords.filter((record) => record.status === "ontime").length,
      late: allRecords.filter((record) => record.status === "late").length,
      absent: allRecords.filter((record) => record.status === "absent").length,
    };

    res.json({
      records: paginatedRecords,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredRecords.length,
        totalPages: Math.ceil(filteredRecords.length / limitNum),
      },
    });
  } catch (error) {
    console.error("[attendance] getAllAttendance error", error);
    res.status(500).json({ message: "Không lấy được danh sách chấm công" });
  }
};

/**
 * PATCH /attendance/:id
 * Cập nhật bản ghi chấm công (Admin/HR)
 */
export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, locationId, locationName, notes, date } =
      req.body || {};

    let attendance = null;

    if (id.startsWith("absent-")) {
      const userIdStr = id.replace("absent-", "");
      const mongoose = (await import("mongoose")).default;
      if (!mongoose.Types.ObjectId.isValid(userIdStr)) {
        return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
      }

      const userId = new mongoose.Types.ObjectId(userIdStr);
      const UserModel = (await import("../users/user.model.js")).UserModel;
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên" });
      }

      let targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      attendance = await AttendanceModel.findOne({
        userId: userId,
        date: targetDate,
      });

      if (!attendance) {
        attendance = new AttendanceModel({
          userId: userId,
          date: targetDate,
          status: "absent",
        });
      }
    } else {
      attendance = await AttendanceModel.findById(id);
      if (!attendance) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy bản ghi chấm công" });
      }
    }

    // Store old values for change tracking
    const oldCheckIn = attendance.checkIn;
    const oldCheckOut = attendance.checkOut;
    const oldStatus = attendance.status;
    const oldLocationId = attendance.locationId?.toString();

    const { applyTimeToDate } = await import("./attendance.service.js");

    if (checkIn !== undefined) {
      if (!checkIn) {
        attendance.checkIn = null;
      } else {
        const parsedCheckIn = applyTimeToDate(attendance.date, checkIn);
        if (!parsedCheckIn) {
          return res.status(400).json({ message: "Giờ vào không hợp lệ" });
        }
        attendance.checkIn = parsedCheckIn;
      }
    }

    if (checkOut !== undefined) {
      if (!checkOut) {
        attendance.checkOut = null;
      } else {
        const parsedCheckOut = applyTimeToDate(attendance.date, checkOut);
        if (!parsedCheckOut) {
          return res.status(400).json({ message: "Giờ ra không hợp lệ" });
        }

        const checkInToCompare = attendance.checkIn;
        if (checkInToCompare && parsedCheckOut <= checkInToCompare) {
          return res.status(400).json({
            message: "Giờ check-out phải sau giờ check-in",
          });
        }

        attendance.checkOut = parsedCheckOut;
      }
    }

    if (notes !== undefined) {
      attendance.notes = notes;
    }

    if (locationId !== undefined || locationName !== undefined) {
      if (locationId === null || locationName === null || locationName === "") {
        attendance.locationId = undefined;
      } else {
        let resolvedBranch = null;
        if (locationId) {
          resolvedBranch = await BranchModel.findById(locationId);
        } else if (locationName) {
          resolvedBranch = await BranchModel.findOne({
            name: { $regex: `^${locationName}$`, $options: "i" },
          });
        }

        if (!resolvedBranch) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy chi nhánh phù hợp" });
        }
        attendance.locationId = resolvedBranch._id;
      }
    }

    // Validate checkOut must be after checkIn
    if (attendance.checkIn && attendance.checkOut) {
      if (attendance.checkOut <= attendance.checkIn) {
        return res.status(400).json({
          message: "Giờ check-out phải sau giờ check-in",
        });
      }
    }

    // Recalculate work hours nếu checkIn hoặc checkOut thay đổi
    if (checkIn !== undefined || checkOut !== undefined) {
      attendance.calculateWorkHours();
    }

    await attendance.save();

    const updated = await AttendanceModel.findById(attendance._id)
      .populate("userId", "name email department role")
      .populate("locationId", "name");

    // Track changes for notification
    const changes = {};
    if (
      checkIn !== undefined &&
      oldCheckIn?.toString() !== attendance.checkIn?.toString()
    ) {
      changes.checkIn = {
        from: oldCheckIn ? new Date(oldCheckIn).toLocaleString("vi-VN") : "N/A",
        to: attendance.checkIn
          ? new Date(attendance.checkIn).toLocaleString("vi-VN")
          : "N/A",
      };
    }
    if (
      checkOut !== undefined &&
      oldCheckOut?.toString() !== attendance.checkOut?.toString()
    ) {
      changes.checkOut = {
        from: oldCheckOut
          ? new Date(oldCheckOut).toLocaleString("vi-VN")
          : "N/A",
        to: attendance.checkOut
          ? new Date(attendance.checkOut).toLocaleString("vi-VN")
          : "N/A",
      };
    }
    // Removed status check - status variable is not defined in this scope
    if (locationId !== undefined || locationName !== undefined) {
      const newLocationId = attendance.locationId?.toString();
      if (oldLocationId !== newLocationId) {
        const oldBranch = oldLocationId
          ? await BranchModel.findById(oldLocationId)
          : null;
        const newBranch = newLocationId
          ? await BranchModel.findById(newLocationId)
          : null;
        changes.location = {
          from: oldBranch?.name || "N/A",
          to: newBranch?.name || "N/A",
        };
      }
    }

    // Send notification to user if there are changes
    if (Object.keys(changes).length > 0) {
      try {
        const { NotificationService } = await import(
          "../notifications/notification.service.js"
        );
        const { UserModel } = await import("../users/user.model.js");
        const admin = await UserModel.findById(req.user.userId)
          .select("name")
          .lean();
        const adminName = admin?.name || "Quản trị viên";

        await NotificationService.createAttendanceUpdatedNotification(
          updated,
          adminName,
          changes
        );
      } catch (notificationError) {
        console.error(
          "[attendance] Failed to send update notification:",
          notificationError
        );
        // Don't fail if notification fails
      }
    }

    // Emit real-time update to user and admins
    try {
      const attendanceData = {
        _id: updated._id.toString(),
        userId: updated.userId?._id?.toString() || updated.userId?.toString(),
        date: updated.date,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        status: updated.status,
        workHours: updated.workHours,
        locationId:
          updated.locationId?._id?.toString() || updated.locationId?.toString(),
        action: "admin-update",
      };
      if (attendanceData.userId) {
        emitAttendanceUpdate(attendanceData.userId, attendanceData);
      }
      emitAttendanceUpdateToAdmins(attendanceData);
    } catch (socketError) {
      console.error("[attendance] Error emitting update:", socketError);
      // Don't fail if socket emit fails
    }

    res.json({
      message: "Đã cập nhật bản ghi chấm công",
      record: buildAttendanceRecordResponse(updated),
    });
  } catch (error) {
    console.error("[attendance] update error", error);
    res.status(500).json({ message: "Không thể cập nhật bản ghi chấm công" });
  }
};

/**
 * DELETE /attendance/:id
 * Xóa bản ghi chấm công (Admin/HR)
 */
export const deleteAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AttendanceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bản ghi chấm công" });
    }
    res.json({ message: "Đã xóa bản ghi chấm công" });
  } catch (error) {
    console.error("[attendance] delete error", error);
    res.status(500).json({ message: "Không thể xóa bản ghi chấm công" });
  }
};

/**
 * GET /attendance/department
 * Lấy chấm công của phòng ban (Manager)
 */
export const getDepartmentAttendance = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const { date, search, page = 1, limit = 20 } = req.query;

    const UserModel = (await import("../users/user.model.js")).UserModel;

    const manager = await UserModel.findById(managerId).select("department");
    if (!manager || !manager.department) {
      return res.status(403).json({
        message: "Bạn không thuộc phòng ban nào hoặc không có quyền truy cập",
      });
    }

    const { start, end } = getDateRange(date);
    const query = { date: { $gte: start, $lt: end } };

    let userQuery = { department: manager.department, isActive: true };

    if (search) {
      userQuery = {
        ...userQuery,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    const users = await UserModel.find(userQuery).select("_id name email");
    const userIds = users.map((u) => u._id);

    if (userIds.length === 0) {
      return res.json({
        records: [],
        summary: { total: 0, present: 0, late: 0, absent: 0 },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }

    query.userId = { $in: userIds };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [docs, total] = await Promise.all([
      AttendanceModel.find(query)
        .populate("userId", "name email role")
        .populate("locationId", "name")
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceModel.countDocuments(query),
    ]);

    const records = docs.map((doc) => ({
      ...buildAttendanceRecordResponse(doc),
      employeeId: doc.userId?._id?.toString().slice(-3) || "N/A",
    }));

    const allDocs = await AttendanceModel.find(query)
      .populate("userId", "name email")
      .select("status checkIn checkOut");

    const summary = {
      total: users.length,
      present: allDocs.filter((d) => {
        const s = deriveStatus(d);
        return s === "ontime";
      }).length,
      late: allDocs.filter((d) => {
        const s = deriveStatus(d);
        return s === "late";
      }).length,
      absent: users.length - allDocs.length,
    };

    res.json({
      records,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[attendance] getDepartmentAttendance error", error);
    res
      .status(500)
      .json({ message: "Không lấy được danh sách chấm công phòng ban" });
  }
};

/**
 * GET /attendance/analytics/export
 * Xuất báo cáo phân tích chấm công (Admin/HR/Manager)
 */
export const exportAttendanceAnalytics = async (req, res) => {
  try {
    const { from, to, department } = req.query;
    const XLSX = (await import("xlsx")).default;

    const dateQuery = buildDateQuery(from, to);
    if (Object.keys(dateQuery).length === 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      dateQuery.date = { $gte: sevenDaysAgo };
    }

    const attendanceQuery = { ...dateQuery };
    const userQuery = {};

    if (department && department !== "all") {
      userQuery.department = department;
    }

    const UserModel = (await import("../users/user.model.js")).UserModel;

    let userIds = [];
    if (Object.keys(userQuery).length > 0) {
      const users = await UserModel.find(userQuery).select("_id");
      userIds = users.map((u) => u._id);
      if (userIds.length === 0) {
        return res.status(404).json({ message: "Không có dữ liệu để xuất" });
      }
      attendanceQuery.userId = { $in: userIds };
    }

    const attendances = await AttendanceModel.find(attendanceQuery)
      .populate({
        path: "userId",
        select: "name email department",
        populate: {
          path: "department",
          select: "name",
        },
      })
      .sort({ date: 1 });

    const dailyMap = new Map();
    const departmentMap = new Map();

    attendances.forEach((att) => {
      const dateKey = formatDateLabel(att.date);
      const user = att.userId;
      const dept =
        typeof user?.department === "object" && user?.department?.name
          ? user.department.name
          : user?.department || "N/A";

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
        });
      }

      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          onTime: 0,
          late: 0,
          absent: 0,
          total: 0,
        });
      }

      const daily = dailyMap.get(dateKey);
      const deptStat = departmentMap.get(dept);
      daily.total++;

      if (att.status === "present" && att.checkIn) {
        const checkInHour = new Date(att.checkIn).getHours();
        const checkInMin = new Date(att.checkIn).getMinutes();
        if (checkInHour > 8 || (checkInHour === 8 && checkInMin > 0)) {
          daily.late++;
          deptStat.late++;
        } else {
          daily.present++;
          deptStat.onTime++;
        }
      } else if (att.status === "absent" || (!att.checkIn && !att.checkOut)) {
        daily.absent++;
        deptStat.absent++;
      }

      deptStat.total++;
    });

    const dailyData = Array.from(dailyMap.values());
    const departmentStats = Array.from(departmentMap.values()).map((dept) => ({
      "Phòng ban": dept.department,
      "Đúng giờ (%)":
        dept.total > 0 ? Math.round((dept.onTime / dept.total) * 100) : 0,
      "Đi muộn (%)":
        dept.total > 0 ? Math.round((dept.late / dept.total) * 100) : 0,
      "Vắng mặt (%)":
        dept.total > 0 ? Math.round((dept.absent / dept.total) * 100) : 0,
      "Tổng số": dept.total,
    }));

    const summaryData = [
      {
        "Chỉ số": "Tỷ lệ đi làm (%)",
        "Giá trị":
          dailyData.length > 0 && dailyData[0].total > 0
            ? Math.round(
                (dailyData.reduce((sum, d) => sum + d.present, 0) /
                  dailyData.length /
                  dailyData[0].total) *
                  100
              )
            : 0,
      },
      {
        "Chỉ số": "Đi muộn TB (người/ngày)",
        "Giá trị":
          dailyData.length > 0
            ? Math.round(
                dailyData.reduce((sum, d) => sum + d.late, 0) / dailyData.length
              )
            : 0,
      },
      {
        "Chỉ số": "Vắng mặt TB (người/ngày)",
        "Giá trị":
          dailyData.length > 0
            ? Math.round(
                dailyData.reduce((sum, d) => sum + d.absent, 0) /
                  dailyData.length
              )
            : 0,
      },
    ];

    const dailyExportData = dailyData.map((d) => ({
      Ngày: d.date,
      "Đi làm": d.present,
      "Đi muộn": d.late,
      "Vắng mặt": d.absent,
      "Tổng số": d.total,
    }));

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng quan");

    const dailySheet = XLSX.utils.json_to_sheet(dailyExportData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, "Xu hướng hàng ngày");

    const deptSheet = XLSX.utils.json_to_sheet(departmentStats);
    XLSX.utils.book_append_sheet(workbook, deptSheet, "Theo phòng ban");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const fileName = `BaoCaoPhanTichChamCong_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("[attendance] export analytics error", error);
    res.status(500).json({ message: "Không thể xuất báo cáo" });
  }
};
