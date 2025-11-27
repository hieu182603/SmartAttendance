import { AttendanceModel } from "./attendance.model.js";
import { LocationModel } from "../locations/location.model.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

const formatDateLabel = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  const d = new Date(date);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const deriveStatus = (doc) => {
  const dow = new Date(doc.date).getDay();
  if (dow === 0 || dow === 6) {
    return "weekend";
  }
  if (doc.status === "absent") return "absent";
  if (doc.status === "late") return "late";
  if (doc.workHours && doc.workHours > 8) return "overtime";
  if (!doc.checkIn && !doc.checkOut) return "absent";
  return "ontime";
};

const formatWorkHours = (hours) => {
  if (!hours && hours !== 0) return "-";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${minutes}m`;
};

const buildAttendanceRecordResponse = (doc) => {
  if (!doc) return null;
  const populatedUser =
    doc.userId && typeof doc.userId === "object" ? doc.userId : null;
  const name = populatedUser?.name || "N/A";
  const departmentValue =
    populatedUser?.department && typeof populatedUser.department === "object"
      ? populatedUser.department.name || "N/A"
      : populatedUser?.department || "N/A";

  return {
    id: doc._id.toString(),
    userId: populatedUser?._id?.toString() || doc.userId?.toString(),
    name,
    email: populatedUser?.email || "N/A",
    department: departmentValue,
    date: formatDateLabel(doc.date),
    checkIn: formatTime(doc.checkIn),
    checkOut: formatTime(doc.checkOut),
    hours: formatWorkHours(doc.workHours),
    status: deriveStatus(doc),
    location: doc.locationId?.name || "-",
    notes: doc.notes || "",
  };
};

const applyTimeToDate = (baseDate, timeString) => {
  if (!timeString || typeof timeString !== "string") return null;
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const result = new Date(baseDate);
  result.setHours(hour, minute, 0, 0);
  return result;
};

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
      });

      return {
        date: dayLabel,
        checkIn: doc.checkIn
          ? new Date(doc.checkIn).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : null,
        checkOut: doc.checkOut
          ? new Date(doc.checkOut).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
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

export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, search, page = 1, limit = 20 } = req.query;

    const query = { userId };

    // Date range filter
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of day
        query.date.$lte = toDate;
      }
    }

    // Search filter - search in notes
    if (search) {
      query.notes = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [docs, total] = await Promise.all([
      AttendanceModel.find(query)
        .populate("locationId")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      AttendanceModel.countDocuments(query)
    ]);

    // Map and format data
    const data = docs.map((doc) => {
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
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("[attendance] history error", error);
    res.status(500).json({ message: "Không lấy được lịch sử chấm công" });
  }
};

/**
 * Chấm công vào (Check-in)
 * POST /api/attendance/checkin
 * Body: { latitude, longitude, accuracy, ssid?, bssid?, photo? }
 */
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    // If request is multipart/form-data (via multer), small fields are in req.body and file in req.file
    const {
      latitude: latRaw,
      longitude: lonRaw,
      accuracy,
      ssid,
      bssid,
    } = req.body || {};
    const photoFile = req.file || null; // multer will populate req.file when upload.single('photo') used

    // Convert numeric inputs
    const latitude = latRaw !== undefined ? Number(latRaw) : undefined;
    const longitude = lonRaw !== undefined ? Number(lonRaw) : undefined;

    // Validate input
    if (
      latitude === undefined ||
      longitude === undefined ||
      !latitude ||
      !longitude
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp vị trí (latitude và longitude)",
      });
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Vị trí không hợp lệ",
      });
    }

    // Tìm địa điểm chấm công hợp lệ (sử dụng GPS, BSSID, hoặc SSID)
    const locations = await LocationModel.find({ isActive: true });

    let validLocation = null;
    let validationResult = null;

    // Ưu tiên kiểm tra BSSID/SSID trước (chính xác hơn GPS)
    for (const location of locations) {
      validationResult = location.validateLocation(
        latitude,
        longitude,
        bssid || null,
        ssid || null
      );

      if (validationResult.isValid) {
        validLocation = location;
        break;
      }
    }

    if (!validLocation) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn không ở trong khu vực cho phép chấm công. Vui lòng đến văn phòng và kết nối WiFi của công ty để chấm công.",
      });
    }

    // Kiểm tra độ chính xác vị trí (nếu accuracy quá lớn, có thể không đáng tin)
    if (accuracy && accuracy > 100) {
      return res.status(400).json({
        success: false,
        message: "Vị trí không chính xác. Vui lòng bật GPS và thử lại.",
      });
    }

    // Kiểm tra giờ check-in (chỉ cho phép check-in trước giờ làm 20 phút)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Giờ làm: 8:00 (480 phút từ 00:00)
    const WORK_START_HOUR = 8;
    const WORK_START_MINUTE = 0;
    const workStartInMinutes = WORK_START_HOUR * 60 + WORK_START_MINUTE;

    // Cho phép check-in từ 7:40 (trước 20 phút)
    const EARLY_CHECKIN_MINUTES = 20;
    const earliestCheckInTime = workStartInMinutes - EARLY_CHECKIN_MINUTES;

    if (currentTimeInMinutes < earliestCheckInTime) {
      const earliestHour = Math.floor(earliestCheckInTime / 60);
      const earliestMinute = earliestCheckInTime % 60;
      return res.status(400).json({
        success: false,
        message: `Chưa đến giờ chấm công. Vui lòng chấm công sau ${earliestHour}:${earliestMinute.toString().padStart(2, '0')}.`,
        code: "TOO_EARLY",
      });
    }

    // Lấy ngày hiện tại (chỉ lấy phần ngày, không có giờ)
    const today = new Date();
    const dateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Tìm hoặc tạo bản ghi chấm công hôm nay
    let attendance = await AttendanceModel.findOne({
      userId,
      date: dateOnly,
    });

    if (attendance) {
      // Nếu đã check-in rồi
      if (attendance.checkIn) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã chấm công vào hôm nay rồi.",
        });
      }

      // Cập nhật check-in
      attendance.checkIn = now;
      attendance.locationId = validLocation._id;
      if (photoFile) {
        try {
          const result = await uploadToCloudinary(photoFile.buffer, 'attendance/checkins');
          attendance.notes = attendance.notes
            ? `${attendance.notes}\n[Ảnh: ${result.url}]`
            : `[Ảnh: ${result.url}]`;
        } catch (e) {
          console.error("Upload to Cloudinary failed:", e);
          attendance.notes = attendance.notes
            ? `${attendance.notes}\n[Ảnh lưu thất bại]`
            : "[Ảnh lưu thất bại]";
        }
      }
    } else {
      // Tạo mới bản ghi chấm công
      attendance = new AttendanceModel({
        userId,
        date: dateOnly,
        checkIn: now,
        locationId: validLocation._id,
        status: "present",
        notes: "",
      });

      if (photoFile) {
        try {
          // Upload lên Cloudinary
          const result = await uploadToCloudinary(photoFile.buffer, 'attendance/checkins');
          attendance.notes = `[Ảnh: ${result.url}]`;
        } catch (e) {
          console.error("Upload to Cloudinary failed:", e);
          attendance.notes = "[Ảnh lưu thất bại]";
        }
      }
    }

    await attendance.save();

    // Tính toán thời gian check-in
    const checkInTime = formatTime(attendance.checkIn);
    const checkInDate = formatDateLabel(attendance.date);

    res.json({
      success: true,
      message: "Chấm công thành công!",
      data: {
        checkInTime,
        checkInDate,
        location: validLocation.name,
        validationMethod: validationResult.method,
        distance: validationResult.distance
          ? `${validationResult.distance}m`
          : null,
      },
    });
  } catch (error) {
    console.error("[attendance] check-in error", error);


    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã chấm công vào hôm nay rồi.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi chấm công. Vui lòng thử lại.",
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
    const photoFile = req.file;

    // Parse sang number nếu là string (từ FormData)
    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);
    accuracy = accuracy ? parseFloat(accuracy) : null;

    // Validate vị trí
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp vị trí (latitude và longitude)",
      });
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Vị trí không hợp lệ",
      });
    }

    // Tìm địa điểm hợp lệ
    const locations = await LocationModel.find({ isActive: true });
    let validLocation = null;
    let validationResult = null;

    for (const location of locations) {
      validationResult = location.validateLocation(
        latitude,
        longitude,
        null,
        null
      );

      if (validationResult.isValid) {
        validLocation = location;
        break;
      }
    }

    if (!validLocation) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn không ở trong khu vực cho phép chấm công. Vui lòng đến văn phòng để check-out.",
      });
    }

    // Kiểm tra độ chính xác
    if (accuracy && accuracy > 100) {
      return res.status(400).json({
        success: false,
        message: "Vị trí không chính xác. Vui lòng bật GPS và thử lại.",
      });
    }

    // Lấy ngày hiện tại
    const today = new Date();
    const dateOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Tìm bản ghi chấm công hôm nay
    let attendance = await AttendanceModel.findOne({
      userId,
      date: dateOnly,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa check-in hôm nay. Vui lòng check-in trước.",
        code: "NOT_CHECKED_IN",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã check-out hôm nay rồi.",
        code: "ALREADY_CHECKED_OUT",
      });
    }

    // Kiểm tra thời gian làm việc tối thiểu
    const now = new Date();
    const checkInTime = new Date(attendance.checkIn);
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60);

    const MIN_WORK_HOURS = 8;
    if (hoursWorked < MIN_WORK_HOURS) {
      const remainingMinutes = Math.ceil((MIN_WORK_HOURS - hoursWorked) * 60);
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      const timeStr = hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

      return res.status(400).json({
        success: false,
        message: `Bạn cần làm việc ít nhất ${MIN_WORK_HOURS} giờ. Vui lòng chờ thêm ${timeStr} nữa.`,
        code: "INSUFFICIENT_WORK_HOURS",
        data: {
          hoursWorked: Math.floor(hoursWorked * 100) / 100,
          minRequired: MIN_WORK_HOURS,
          remainingMinutes
        }
      });
    }

    // Cập nhật check-out
    attendance.checkOut = now;

    if (photoFile) {
      try {
        const result = await uploadToCloudinary(photoFile.buffer, 'attendance/checkouts');
        attendance.notes = attendance.notes
          ? `${attendance.notes}\n[Ảnh check-out: ${result.url}]`
          : `[Ảnh check-out: ${result.url}]`;
      } catch (e) {
        console.error("Upload to Cloudinary failed:", e);
      }
    }

    // Tính giờ làm việc (updateStatus sẽ tự động chạy trong pre-save hook)
    attendance.calculateWorkHours();

    await attendance.save();

    // Format response
    const checkOutTime = formatTime(attendance.checkOut);
    const checkOutDate = formatDateLabel(attendance.date);
    const workHours = attendance.workHours
      ? `${Math.floor(attendance.workHours)}h ${Math.round((attendance.workHours % 1) * 60)}m`
      : '0h';

    res.json({
      success: true,
      message: "Check-out thành công!",
      data: {
        checkOutTime,
        checkOutDate,
        workHours,
        location: validLocation.name,
        distance: validationResult.distance
          ? `${validationResult.distance}m`
          : null,
      },
    });
  } catch (error) {
    console.error("[attendance] check-out error", error);

    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi check-out. Vui lòng thử lại.",
    });
  }
};

export const getAttendanceAnalytics = async (req, res) => {
  try {
    const { from, to, department } = req.query

    const dateQuery = {}
    if (from || to) {
      dateQuery.date = {}
      if (from) dateQuery.date.$gte = new Date(from)
      if (to) dateQuery.date.$lte = new Date(to)
    } else {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      dateQuery.date = { $gte: sevenDaysAgo }
    }

    const attendanceQuery = { ...dateQuery }
    const userQuery = {}

    if (department && department !== 'all') {
      userQuery.department = department
    }

    const UserModel = (await import('../users/user.model.js')).UserModel

    let userIds = []
    if (Object.keys(userQuery).length > 0) {
      const users = await UserModel.find(userQuery).select('_id')
      userIds = users.map(u => u._id)
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
            trend: 0
          }
        })
      }
      attendanceQuery.userId = { $in: userIds }
    }

    const attendances = await AttendanceModel.find(attendanceQuery)
      .populate({
        path: 'userId',
        select: 'name department',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ date: 1 })

    const dailyMap = new Map()
    const departmentMap = new Map()
    const employeeMap = new Map()

    attendances.forEach(att => {
      const dateKey = formatDateLabel(att.date)
      const user = att.userId
      // Lấy tên phòng ban từ populated object hoặc fallback về string/ObjectId
      const dept = (typeof user?.department === 'object' && user?.department?.name)
        ? user.department.name
        : (user?.department || 'N/A')

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, present: 0, late: 0, absent: 0, onLeave: 0, total: 0 })
      }

      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { department: dept, onTime: 0, late: 0, absent: 0, total: 0 })
      }

      const userId = user?._id?.toString()
      if (userId && !employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          name: user?.name || 'N/A',
          onTime: 0,
          late: 0,
          absent: 0,
          checkInTimes: []
        })
      }

      const daily = dailyMap.get(dateKey)
      const deptStat = departmentMap.get(dept)
      daily.total++

      if (att.status === 'present' && att.checkIn) {
        const checkInHour = new Date(att.checkIn).getHours()
        const checkInMin = new Date(att.checkIn).getMinutes()
        if (checkInHour > 8 || (checkInHour === 8 && checkInMin > 0)) {
          daily.late++
          deptStat.late++
          if (userId) {
            const emp = employeeMap.get(userId)
            emp.late++
            emp.checkInTimes.push(`${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}`)
          }
        } else {
          daily.present++
          deptStat.onTime++
          if (userId) {
            const emp = employeeMap.get(userId)
            emp.onTime++
            emp.checkInTimes.push(`${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}`)
          }
        }
      } else if (att.status === 'absent' || (!att.checkIn && !att.checkOut)) {
        daily.absent++
        deptStat.absent++
        if (userId) {
          const emp = employeeMap.get(userId)
          emp.absent++
        }
      }

      deptStat.total++
    })

    const dailyData = Array.from(dailyMap.values())
    const departmentStats = Array.from(departmentMap.values()).map(dept => ({
      department: dept.department,
      onTime: dept.total > 0 ? Math.round((dept.onTime / dept.total) * 100) : 0,
      late: dept.total > 0 ? Math.round((dept.late / dept.total) * 100) : 0,
      absent: dept.total > 0 ? Math.round((dept.absent / dept.total) * 100) : 0
    }))

    const topPerformers = Array.from(employeeMap.values())
      .map(emp => {
        const total = emp.onTime + emp.late + emp.absent
        const punctuality = total > 0 ? Math.round((emp.onTime / total) * 100) : 0
        const avgCheckIn = emp.checkInTimes.length > 0
          ? emp.checkInTimes.reduce((sum, time) => {
            const [h, m] = time.split(':').map(Number)
            return sum + h * 60 + m
          }, 0) / emp.checkInTimes.length
          : 0
        const avgHours = Math.floor(avgCheckIn / 60)
        const avgMins = Math.round(avgCheckIn % 60)
        return {
          name: emp.name,
          onTime: emp.onTime,
          late: emp.late,
          absent: emp.absent,
          avgCheckIn: avgCheckIn > 0 ? `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}` : '-',
          punctuality
        }
      })
      .filter(emp => emp.onTime + emp.late + emp.absent > 0)
      .sort((a, b) => b.punctuality - a.punctuality)
      .slice(0, 5)

    // Tính tổng số nhân viên thực tế trong hệ thống (theo filter)
    const totalEmployeesQuery = { isActive: true }
    if (department && department !== 'all') {
      totalEmployeesQuery.department = department
    }
    const totalEmployees = await UserModel.countDocuments(totalEmployeesQuery)

    const totalDays = dailyData.length
    const avgPresent = totalDays > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.present, 0) / totalDays) : 0
    const avgLate = totalDays > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.late, 0) / totalDays) : 0
    const avgAbsent = totalDays > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.absent, 0) / totalDays) : 0
    const attendanceRate = totalEmployees > 0 ? Math.round((avgPresent / totalEmployees) * 100) : 0

    // Tính trend: so sánh tuần hiện tại với tuần trước
    let trend = 0
    if (totalDays >= 7) {
      const currentWeek = dailyData.slice(-7)
      const previousWeek = dailyData.slice(-14, -7)
      if (previousWeek.length === 7) {
        const currentAvg = currentWeek.reduce((sum, d) => sum + d.present, 0) / 7
        const previousAvg = previousWeek.reduce((sum, d) => sum + d.present, 0) / 7
        if (previousAvg > 0) {
          trend = Math.round(((currentAvg - previousAvg) / previousAvg) * 100)
        }
      }
    }

    res.json({
      dailyData,
      departmentStats,
      topPerformers,
      summary: {
        attendanceRate,
        avgPresent,
        avgLate,
        avgAbsent,
        trend,
        totalEmployees
      }
    })
  } catch (error) {
    console.error('[attendance] analytics error', error)
    res.status(500).json({ message: 'Không lấy được dữ liệu phân tích' })
  }
}

export const getAllAttendance = async (req, res) => {
  try {
    const { date, search, page = 1, limit = 20 } = req.query

    const query = {}

    if (date) {
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)
      const nextDay = new Date(dateOnly)
      nextDay.setDate(nextDay.getDate() + 1)
      query.date = { $gte: dateOnly, $lt: nextDay }
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      query.date = { $gte: today, $lt: tomorrow }
    }

    const UserModel = (await import('../users/user.model.js')).UserModel

    let userQuery = {}
    if (search) {
      userQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }
    }

    const users = await UserModel.find(userQuery).select('_id name email department')
    const userIds = users.map(u => u._id)

    if (userIds.length > 0) {
      query.userId = { $in: userIds }
    } else if (search) {
      return res.json({
        records: [],
        summary: { total: 0, present: 0, late: 0, absent: 0 },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [docs, total] = await Promise.all([
      AttendanceModel.find(query)
        .populate('userId', 'name email department')
        .populate('locationId', 'name')
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceModel.countDocuments(query)
    ])

    const records = docs.map(buildAttendanceRecordResponse)

    const summary = {
      total: total,
      present: records.filter(r => r.status === 'ontime').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length
    }

    res.json({
      records,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('[attendance] getAllAttendance error', error)
    res.status(500).json({ message: 'Không lấy được danh sách chấm công' })
  }
}

export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, locationId, locationName, notes } = req.body || {};

    const attendance = await AttendanceModel.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi chấm công" });
    }

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
        let resolvedLocation = null;
        if (locationId) {
          resolvedLocation = await LocationModel.findById(locationId);
        } else if (locationName) {
          resolvedLocation = await LocationModel.findOne({
            name: { $regex: `^${locationName}$`, $options: "i" },
          });
        }

        if (!resolvedLocation) {
          return res.status(404).json({ message: "Không tìm thấy địa điểm phù hợp" });
        }
        attendance.locationId = resolvedLocation._id;
      }
    }

    await attendance.save();

    const updated = await AttendanceModel.findById(id)
      .populate("userId", "name email department")
      .populate("locationId", "name");

    res.json({
      message: "Đã cập nhật bản ghi chấm công",
      record: buildAttendanceRecordResponse(updated),
    });
  } catch (error) {
    console.error("[attendance] update error", error);
    res.status(500).json({ message: "Không thể cập nhật bản ghi chấm công" });
  }
};

export const deleteAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AttendanceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy bản ghi chấm công" });
    }
    res.json({ message: "Đã xóa bản ghi chấm công" });
  } catch (error) {
    console.error("[attendance] delete error", error);
    res.status(500).json({ message: "Không thể xóa bản ghi chấm công" });
  }
};

export const exportAttendanceAnalytics = async (req, res) => {
  try {
    const { from, to, department } = req.query
    const XLSX = (await import('xlsx')).default

    const dateQuery = {}
    if (from || to) {
      dateQuery.date = {}
      if (from) dateQuery.date.$gte = new Date(from)
      if (to) dateQuery.date.$lte = new Date(to)
    } else {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      dateQuery.date = { $gte: sevenDaysAgo }
    }

    const attendanceQuery = { ...dateQuery }
    const userQuery = {}

    if (department && department !== 'all') {
      userQuery.department = department
    }

    const UserModel = (await import('../users/user.model.js')).UserModel

    let userIds = []
    if (Object.keys(userQuery).length > 0) {
      const users = await UserModel.find(userQuery).select('_id')
      userIds = users.map(u => u._id)
      if (userIds.length === 0) {
        return res.status(404).json({ message: 'Không có dữ liệu để xuất' })
      }
      attendanceQuery.userId = { $in: userIds }
    }

    const attendances = await AttendanceModel.find(attendanceQuery)
      .populate({
        path: 'userId',
        select: 'name email department',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ date: 1 })

    const dailyMap = new Map()
    const departmentMap = new Map()

    attendances.forEach(att => {
      const dateKey = formatDateLabel(att.date)
      const user = att.userId
      // Lấy tên phòng ban từ populated object hoặc fallback về string/ObjectId
      const dept = (typeof user?.department === 'object' && user?.department?.name)
        ? user.department.name
        : (user?.department || 'N/A')

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, present: 0, late: 0, absent: 0, total: 0 })
      }

      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { department: dept, onTime: 0, late: 0, absent: 0, total: 0 })
      }

      const daily = dailyMap.get(dateKey)
      const deptStat = departmentMap.get(dept)
      daily.total++

      if (att.status === 'present' && att.checkIn) {
        const checkInHour = new Date(att.checkIn).getHours()
        const checkInMin = new Date(att.checkIn).getMinutes()
        if (checkInHour > 8 || (checkInHour === 8 && checkInMin > 0)) {
          daily.late++
          deptStat.late++
        } else {
          daily.present++
          deptStat.onTime++
        }
      } else if (att.status === 'absent' || (!att.checkIn && !att.checkOut)) {
        daily.absent++
        deptStat.absent++
      }

      deptStat.total++
    })

    const dailyData = Array.from(dailyMap.values())
    const departmentStats = Array.from(departmentMap.values()).map(dept => ({
      'Phòng ban': dept.department,
      'Đúng giờ (%)': dept.total > 0 ? Math.round((dept.onTime / dept.total) * 100) : 0,
      'Đi muộn (%)': dept.total > 0 ? Math.round((dept.late / dept.total) * 100) : 0,
      'Vắng mặt (%)': dept.total > 0 ? Math.round((dept.absent / dept.total) * 100) : 0,
      'Tổng số': dept.total
    }))

    const summaryData = [{
      'Chỉ số': 'Tỷ lệ đi làm (%)',
      'Giá trị': dailyData.length > 0 && dailyData[0].total > 0
        ? Math.round((dailyData.reduce((sum, d) => sum + d.present, 0) / dailyData.length) / dailyData[0].total * 100)
        : 0
    }, {
      'Chỉ số': 'Đi muộn TB (người/ngày)',
      'Giá trị': dailyData.length > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.late, 0) / dailyData.length) : 0
    }, {
      'Chỉ số': 'Vắng mặt TB (người/ngày)',
      'Giá trị': dailyData.length > 0 ? Math.round(dailyData.reduce((sum, d) => sum + d.absent, 0) / dailyData.length) : 0
    }]

    const dailyExportData = dailyData.map(d => ({
      'Ngày': d.date,
      'Đi làm': d.present,
      'Đi muộn': d.late,
      'Vắng mặt': d.absent,
      'Tổng số': d.total
    }))

    const workbook = XLSX.utils.book_new()

    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan')

    const dailySheet = XLSX.utils.json_to_sheet(dailyExportData)
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Xu hướng hàng ngày')

    const deptSheet = XLSX.utils.json_to_sheet(departmentStats)
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Theo phòng ban')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const fileName = `BaoCaoPhanTichChamCong_${new Date().toISOString().split('T')[0]}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.send(buffer)
  } catch (error) {
    console.error('[attendance] export analytics error', error)
    res.status(500).json({ message: 'Không thể xuất báo cáo' })
  }
}

export const getDepartmentAttendance = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const { date, search, page = 1, limit = 20 } = req.query;

    const UserModel = (await import('../users/user.model.js')).UserModel;

    // Lấy thông tin manager để biết department
    const manager = await UserModel.findById(managerId).select('department');
    if (!manager || !manager.department) {
      return res.status(403).json({
        message: 'Bạn không thuộc phòng ban nào hoặc không có quyền truy cập'
      });
    }

    const query = {};

    // Filter theo ngày
    if (date) {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: dateOnly, $lt: nextDay };
    } else {
      // Mặc định là hôm nay
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    }

    // Lấy tất cả nhân viên trong phòng ban của manager
    let userQuery = { department: manager.department, isActive: true };

    // Tìm kiếm theo tên hoặc email
    if (search) {
      userQuery = {
        ...userQuery,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await UserModel.find(userQuery).select('_id name email');
    const userIds = users.map(u => u._id);

    if (userIds.length === 0) {
      return res.json({
        records: [],
        summary: { total: 0, present: 0, late: 0, absent: 0 },
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });
    }

    query.userId = { $in: userIds };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [docs, total] = await Promise.all([
      AttendanceModel.find(query)
        .populate('userId', 'name email')
        .populate('locationId', 'name')
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceModel.countDocuments(query)
    ]);

    const records = docs.map(doc => {
      const status = deriveStatus(doc);
      return {
        id: doc._id.toString(),
        userId: doc.userId?._id?.toString(),
        name: doc.userId?.name || 'N/A',
        email: doc.userId?.email || 'N/A',
        employeeId: doc.userId?._id?.toString().slice(-3) || 'N/A',
        date: formatDateLabel(doc.date),
        checkIn: formatTime(doc.checkIn),
        checkOut: formatTime(doc.checkOut),
        hours: doc.workHours
          ? `${Math.floor(doc.workHours)}h ${Math.round((doc.workHours % 1) * 60)}m`
          : '-',
        status,
        location: doc.locationId?.name || '-'
      };
    });

    // Tính summary từ tất cả records trong ngày (không chỉ trang hiện tại)
    const allDocs = await AttendanceModel.find(query)
      .populate('userId', 'name email')
      .select('status checkIn checkOut');

    const summary = {
      total: users.length,
      present: allDocs.filter(d => {
        const s = deriveStatus(d);
        return s === 'ontime';
      }).length,
      late: allDocs.filter(d => {
        const s = deriveStatus(d);
        return s === 'late';
      }).length,
      absent: users.length - allDocs.length
    };

    res.json({
      records,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[attendance] getDepartmentAttendance error', error);
    res.status(500).json({ message: 'Không lấy được danh sách chấm công phòng ban' });
  }
};