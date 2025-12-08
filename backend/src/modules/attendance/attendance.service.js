import {
  SHIFT_CONFIG,
  ATTENDANCE_CONFIG,
  APP_CONFIG,
} from "../../config/app.config.js";
import { EmployeeScheduleModel } from "../schedule/schedule.model.js";
import { AttendanceModel } from "./attendance.model.js";
import { BranchModel } from "../branches/branch.model.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import {
  emitAttendanceUpdate,
  emitAttendanceUpdateToAdmins,
} from "../../config/socket.js";

// ============================================================================
// CONSTANTS
// ============================================================================
const EARTH_RADIUS_M = 6371e3; // Bán kính trái đất (mét)
const MAX_DISTANCE = 100; // 100m

// ============================================================================
// LOCATION UTILITIES
// ============================================================================

/**
 * Tính khoảng cách giữa 2 điểm GPS (Haversine formula)
 * @param {number} lat1 - Vĩ độ điểm 1
 * @param {number} lon1 - Kinh độ điểm 1
 * @param {number} lat2 - Vĩ độ điểm 2
 * @param {number} lon2 - Kinh độ điểm 2
 * @returns {number} Khoảng cách tính bằng mét
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
};

/**
 * Tìm chi nhánh gần nhất từ danh sách branches
 * @param {Array} branches - Danh sách branches
 * @param {number} latitude - Vĩ độ hiện tại
 * @param {number} longitude - Kinh độ hiện tại
 * @returns {Object|null} { branch, distance } hoặc null
 */
export const findNearestBranch = (branches, latitude, longitude) => {
  if (!branches || branches.length === 0) return null;

  let nearest = branches[0];
  let minDistance = calculateDistance(
    latitude,
    longitude,
    nearest.latitude,
    nearest.longitude
  );

  for (const branch of branches) {
    const distance = calculateDistance(
      latitude,
      longitude,
      branch.latitude,
      branch.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = branch;
    }
  }

  return { branch: nearest, distance: Math.round(minDistance) };
};

/**
 * Kiểm tra vị trí có hợp lệ để chấm công không
 * @param {Object} nearestBranch - Kết quả từ findNearestBranch
 * @returns {boolean}
 */
export const isValidLocation = (nearestBranch) => {
  return nearestBranch && nearestBranch.distance <= MAX_DISTANCE;
};

/**
 * Validate và tìm branch hợp lệ cho check-in/check-out
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @returns {Promise<Object>} { valid, branch, distance, message }
 */
export const validateAndFindBranch = async (latitude, longitude) => {
  const locationValidation = validateLocation(latitude, longitude);
  if (!locationValidation.valid) {
    return {
      valid: false,
      branch: null,
      distance: null,
      message: locationValidation.message,
    };
  }

  // Tìm tất cả branch active
  const branches = await BranchModel.find({ status: "active" });

  // Kiểm tra nếu không có branch nào active
  if (!branches || branches.length === 0) {
    return {
      valid: false,
      branch: null,
      distance: null,
      message: "Hệ thống chưa được cấu hình chi nhánh. Vui lòng liên hệ Admin.",
    };
  }

  const nearest = findNearestBranch(branches, latitude, longitude);

  if (!isValidLocation(nearest)) {
    return {
      valid: false,
      branch: null,
      distance: nearest?.distance || null,
      message: `Bạn không ở trong khu vực cho phép chấm công. Vui lòng đến văn phòng và kết nối WiFi của công ty để chấm công.`,
    };
  }

  return {
    valid: true,
    branch: nearest.branch,
    distance: nearest.distance,
    message: null,
  };
};

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Lấy giờ và phút theo configured timezone từ một Date object
 * @param {Date} date - Date object (có thể ở bất kỳ timezone nào)
 * @returns {Object} { hour, minute } - Giờ và phút theo configured timezone
 */
export const getTimeInGMT7 = (date) => {
  const dateInGMT7 = new Date(
    date.toLocaleString("en-US", {
      timeZone: APP_CONFIG.TIMEZONE,
    })
  );

  return {
    hour: dateInGMT7.getHours(),
    minute: dateInGMT7.getMinutes(),
  };
};

/**
 * Format ngày thành label (DD/MM/YYYY)
 * @param {Date} date - Ngày cần format
 * @returns {string}
 */
export const formatDateLabel = (date) => {
  const d = new Date(date);
  // Sử dụng toLocaleString với configured timezone
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);

  const day = parts.find((p) => p.type === "day")?.value || "01";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const year = parts.find((p) => p.type === "year")?.value || "2024";

  return `${day}/${month}/${year}`;
};

/**
 * Format thời gian thành HH:MM (theo GMT+7 - Việt Nam)
 * @param {Date|string} value - Thời gian cần format
 * @returns {string}
 */
export const formatTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  // Sử dụng toLocaleTimeString với configured timezone để đảm bảo thời gian chính xác
  const timeString = d.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return timeString;
};

/**
 * Format giờ làm việc thành "Xh Ym"
 * @param {number} hours - Số giờ làm việc
 * @returns {string}
 */
export const formatWorkHours = (hours) => {
  if (!hours && hours !== 0) return "-";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${minutes}m`;
};

/**
 * Áp dụng thời gian vào một ngày cụ thể (GMT+7 timezone)
 * @param {Date} baseDate - Ngày cơ sở
 * @param {string} timeString - Chuỗi thời gian (HH:MM)
 * @returns {Date|null}
 */
export const applyTimeToDate = (baseDate, timeString) => {
  if (!timeString || typeof timeString !== "string") return null;
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  // Validate hour and minute ranges
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  // Get the date in configured timezone
  const baseDateStr = baseDate.toLocaleString("en-US", {
    timeZone: APP_CONFIG.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Parse to get year, month, day
  const [month, day, year] = baseDateStr.split("/");

  // Create date at specified time in GMT+7 (convert to UTC by subtracting 7 hours)
  const result = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      hour - 7, // Convert GMT+7 to UTC
      minute,
      0,
      0
    )
  );

  return result;
};

/**
 * Tạo date query cho MongoDB
 * @param {string|Date} from - Ngày bắt đầu
 * @param {string|Date} to - Ngày kết thúc
 * @returns {Object} MongoDB date query
 */
export const buildDateQuery = (from, to) => {
  const query = {};
  if (from || to) {
    query.date = {};
    if (from) {
      const fromDate = new Date(from + "T00:00:00.000Z");
      query.date.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to + "T23:59:59.999Z");
      query.date.$lte = toDate;
    }
  }
  return query;
};

/**
 * Tạo date range cho một ngày cụ thể
 * @param {Date|string} date - Ngày cần tạo range
 * @returns {Object} { start, end }
 */
export const getDateRange = (date) => {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return { start: targetDate, end: nextDay };
};

/**
 * Lấy date only (không có time)
 * @param {Date} date - Ngày cần convert
 * @returns {Date}
 */
export const getDateOnly = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Xác định trạng thái chấm công
 * @param {Object} doc - Document attendance
 * @returns {string} Status: 'ontime' | 'late' | 'absent' | 'overtime' | 'weekend' | 'on_leave'
 */
export const deriveStatus = (doc) => {
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

// ============================================================================
// SCHEDULE UTILITIES
// ============================================================================

/**
 * Lấy schedule của nhân viên trong ngày (với populate shift)
 * @param {string} userId - ID nhân viên
 * @param {Date} date - Ngày cần lấy schedule
 * @returns {Promise<Object|null>}
 */
export const getUserSchedule = async (userId, date) => {
  try {
    const schedule = await EmployeeScheduleModel.findOne({
      userId,
      date: date,
    })
      .populate("shiftId")
      .lean();

    return schedule;
  } catch (error) {
    return null;
  }
};

/**
 * Lấy thông tin shift từ schedule hoặc tìm shift mặc định trong DB
 * @param {Object} schedule - Schedule object
 * @returns {Promise<Object>} Shift info
 */
export const getShiftInfo = async (schedule) => {
  try {
    const { ShiftModel } = await import("../shifts/shift.model.js");

    // Nếu schedule có shiftId đã được populate
    if (schedule?.shiftId && typeof schedule.shiftId === "object") {
      return {
        startTime: schedule.shiftId.startTime,
        endTime: schedule.shiftId.endTime,
        breakDuration: schedule.shiftId.breakDuration || 0,
        shiftName: schedule.shiftId.name,
        isFlexible: schedule.shiftId.isFlexible || false,
      };
    }

    // Nếu schedule có shiftId nhưng chưa populate
    if (schedule?.shiftId) {
      const shift = await ShiftModel.findById(schedule.shiftId).lean();
      if (shift) {
        return {
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakDuration: shift.breakDuration || 0,
          shiftName: shift.name,
          isFlexible: shift.isFlexible || false,
        };
      }
    }

    // Nếu schedule có startTime và endTime trực tiếp
    if (schedule?.startTime && schedule?.endTime) {
      return {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakDuration: 0,
        shiftName: schedule.shiftName || "Ca làm việc",
        isFlexible: false,
      };
    }

    // Tìm shift mặc định trong DB
    let defaultShift = await ShiftModel.findOne({
      isActive: true,
      name: { $regex: /full time|hành chính/i },
    }).lean();

    if (!defaultShift) {
      defaultShift = await ShiftModel.findOne({ isActive: true })
        .sort({ createdAt: 1 })
        .lean();
    }

    if (defaultShift) {
      return {
        startTime: defaultShift.startTime,
        endTime: defaultShift.endTime,
        breakDuration: defaultShift.breakDuration || 0,
        shiftName: defaultShift.name,
        isFlexible: defaultShift.isFlexible || false,
      };
    }

    // Fallback về config mặc định
    return {
      startTime: SHIFT_CONFIG.DEFAULT_START_TIME,
      endTime: SHIFT_CONFIG.DEFAULT_END_TIME,
      breakDuration: SHIFT_CONFIG.DEFAULT_BREAK_DURATION,
      shiftName: SHIFT_CONFIG.DEFAULT_SHIFT_NAME,
      isFlexible: false,
    };
  } catch (error) {
    return {
      startTime: SHIFT_CONFIG.DEFAULT_START_TIME,
      endTime: SHIFT_CONFIG.DEFAULT_END_TIME,
      breakDuration: SHIFT_CONFIG.DEFAULT_BREAK_DURATION,
      shiftName: SHIFT_CONFIG.DEFAULT_SHIFT_NAME,
      isFlexible: false,
    };
  }
};

/**
 * Kiểm tra đi muộn dựa trên shift info
 * @param {Date} checkInTime - Thời gian check-in
 * @param {Object} shiftInfo - Thông tin shift
 * @returns {boolean}
 */
export const checkLateStatus = (checkInTime, shiftInfo) => {
  const LATE_TOLERANCE_MINUTES = SHIFT_CONFIG.LATE_TOLERANCE_MINUTES;

  if (shiftInfo?.isFlexible) {
    return false;
  }

  const startTime = shiftInfo?.startTime || SHIFT_CONFIG.DEFAULT_START_TIME;
  const [startHour, startMinute] = startTime.split(":").map(Number);

  // Lấy giờ/phút của checkInTime theo GMT+7
  const { hour: checkInHour, minute: checkInMinute } =
    getTimeInGMT7(checkInTime);
  const checkInTimeInMinutes = checkInHour * 60 + checkInMinute;

  // Tính thời gian muộn (startTime + tolerance) theo phút
  const lateTimeInMinutes =
    startHour * 60 + startMinute + LATE_TOLERANCE_MINUTES;

  // So sánh: nếu checkInTime > lateTime thì đi muộn
  return checkInTimeInMinutes > lateTimeInMinutes;
};

/**
 * Kiểm tra về sớm/overtime dựa trên shift info
 * @param {Date} checkOutTime - Thời gian check-out
 * @param {Object} shiftInfo - Thông tin shift
 * @returns {Object} { isEarlyLeave, isOvertime, minutesEarly, minutesOvertime }
 */
export const checkEarlyLeaveOrOvertime = (checkOutTime, shiftInfo) => {
  const EARLY_TOLERANCE_MINUTES = SHIFT_CONFIG.EARLY_LEAVE_TOLERANCE_MINUTES;
  const OVERTIME_THRESHOLD_MINUTES = SHIFT_CONFIG.OVERTIME_THRESHOLD_MINUTES;

  if (shiftInfo?.isFlexible) {
    return {
      isEarlyLeave: false,
      isOvertime: false,
      minutesEarly: 0,
      minutesOvertime: 0,
    };
  }

  const endTime = shiftInfo?.endTime || SHIFT_CONFIG.DEFAULT_END_TIME;
  const [endHour, endMinute] = endTime.split(":").map(Number);

  // Lấy giờ/phút của checkOutTime theo GMT+7
  const { hour: checkOutHour, minute: checkOutMinute } =
    getTimeInGMT7(checkOutTime);
  const checkOutTimeInMinutes = checkOutHour * 60 + checkOutMinute;

  // Tính các mốc thời gian theo phút
  const shiftEndTimeInMinutes = endHour * 60 + endMinute;
  const earliestLeaveTimeInMinutes =
    shiftEndTimeInMinutes - EARLY_TOLERANCE_MINUTES;

  // Tính số phút về sớm
  const minutesEarly =
    checkOutTimeInMinutes < earliestLeaveTimeInMinutes
      ? earliestLeaveTimeInMinutes - checkOutTimeInMinutes
      : 0;

  // Tính số phút tăng ca
  const minutesOvertime =
    checkOutTimeInMinutes > shiftEndTimeInMinutes
      ? checkOutTimeInMinutes - shiftEndTimeInMinutes
      : 0;

  return {
    isEarlyLeave: minutesEarly > 0,
    isOvertime: minutesOvertime >= OVERTIME_THRESHOLD_MINUTES,
    minutesEarly,
    minutesOvertime,
  };
};

/**
 * Kiểm tra có thể check-in sớm không
 * @param {Date} currentTime - Thời gian hiện tại
 * @param {Object} shiftInfo - Thông tin shift
 * @returns {Object} { canCheckIn, earliestTime, message }
 */
export const canCheckInEarly = (currentTime, shiftInfo) => {
  if (shiftInfo?.isFlexible) {
    return { canCheckIn: true, earliestTime: null, message: null };
  }

  const EARLY_CHECKIN_MINUTES = SHIFT_CONFIG.EARLY_CHECKIN_MINUTES;
  const startTime = shiftInfo?.startTime || SHIFT_CONFIG.DEFAULT_START_TIME;
  const [startHour, startMinute] = startTime.split(":").map(Number);

  // Sử dụng GMT+7 để so sánh (tránh lỗi timezone khi deploy)
  const { hour: currentHour, minute: currentMinute } =
    getTimeInGMT7(currentTime);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const workStartInMinutes = startHour * 60 + startMinute;
  const earliestCheckInTime = workStartInMinutes - EARLY_CHECKIN_MINUTES;

  if (currentTimeInMinutes < earliestCheckInTime) {
    const earliestHour = Math.floor(earliestCheckInTime / 60);
    const earliestMin = earliestCheckInTime % 60;
    return {
      canCheckIn: false,
      earliestTime: `${earliestHour}:${earliestMin
        .toString()
        .padStart(2, "0")}`,
      message: `Chưa đến giờ chấm công (${
        shiftInfo.shiftName
      }). Vui lòng chấm công sau ${earliestHour}:${earliestMin
        .toString()
        .padStart(2, "0")}.`,
    };
  }

  return { canCheckIn: true, earliestTime: null, message: null };
};

// ============================================================================
// PHOTO UTILITIES
// ============================================================================

/**
 * Upload photo và trả về URL hoặc error message
 * @param {Buffer} photoBuffer - Buffer của ảnh
 * @param {string} folder - Thư mục trên Cloudinary
 * @returns {Promise<Object>} { success, url, error }
 */
export const uploadPhoto = async (photoBuffer, folder = "attendance") => {
  try {
    const result = await uploadToCloudinary(photoBuffer, folder);
    return { success: true, url: result.url, error: null };
  } catch (error) {
    return { success: false, url: null, error: error.message };
  }
};

/**
 * Thêm photo URL vào notes
 * @param {string} existingNotes - Notes hiện tại
 * @param {string} photoUrl - URL của ảnh
 * @param {string} type - 'checkin' | 'checkout'
 * @returns {string}
 */
export const addPhotoToNotes = (existingNotes, photoUrl, type = "checkin") => {
  const photoTag =
    type === "checkin" ? `[Ảnh: ${photoUrl}]` : `[Ảnh check-out: ${photoUrl}]`;
  return existingNotes ? `${existingNotes}\n${photoTag}` : photoTag;
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

/**
 * Build attendance record response
 * @param {Object} doc - Attendance document
 * @returns {Object|null}
 */
export const buildAttendanceRecordResponse = (doc) => {
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
    role: populatedUser?.role || "N/A",
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

/**
 * Format department từ user object
 * @param {Object|string} department - Department object hoặc string
 * @returns {string}
 */
export const formatDepartment = (department) => {
  if (!department) return "N/A";
  if (typeof department === "object" && department.name) {
    return department.name;
  }
  return department.toString();
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate location coordinates
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @returns {Object} { valid, message }
 */
export const validateLocation = (latitude, longitude) => {
  if (latitude === undefined || longitude === undefined) {
    return {
      valid: false,
      message: "Vui lòng cung cấp vị trí (latitude và longitude)",
    };
  }

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return { valid: false, message: "Vị trí không hợp lệ" };
  }

  return { valid: true, message: null };
};

/**
 * Validate GPS accuracy
 * @param {number} accuracy - Độ chính xác GPS (mét)
 * @returns {Object} { valid, message }
 */
export const validateGPSAccuracy = (accuracy) => {
  if (accuracy && accuracy > ATTENDANCE_CONFIG.GPS_ACCURACY_THRESHOLD) {
    return {
      valid: false,
      message: "Vị trí không chính xác. Vui lòng bật GPS và thử lại.",
    };
  }
  return { valid: true, message: null };
};

/**
 * Validate minimum work hours for checkout
 * @param {number} hoursWorked - Số giờ đã làm việc
 * @param {Object} shiftInfo - Thông tin shift
 * @returns {Object} { valid, minRequired, remainingMinutes, message }
 */
export const validateWorkHours = (hoursWorked, shiftInfo) => {
  let minWorkHours = ATTENDANCE_CONFIG.MIN_WORK_HOURS;

  if (!shiftInfo.isFlexible && shiftInfo.startTime && shiftInfo.endTime) {
    const [startH, startM] = shiftInfo.startTime.split(":").map(Number);
    const [endH, endM] = shiftInfo.endTime.split(":").map(Number);
    const shiftDurationMinutes =
      endH * 60 +
      endM -
      (startH * 60 + startM) -
      (shiftInfo.breakDuration || 0);
    const shiftDurationHours = shiftDurationMinutes / 60;

    // Dùng 50% thay vì 25% để hợp lý hơn
    // Ca 8h → min 4h, Ca 4h → min 2h
    minWorkHours = Math.max(
      ATTENDANCE_CONFIG.MIN_WORK_HOURS,
      Math.floor(shiftDurationHours * 0.5)
    );
  }

  if (hoursWorked < minWorkHours) {
    const remainingMinutes = Math.ceil((minWorkHours - hoursWorked) * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const timeStr =
      hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

    return {
      valid: false,
      minRequired: minWorkHours,
      remainingMinutes,
      message: `Bạn cần làm việc ít nhất ${minWorkHours} giờ (${shiftInfo.shiftName}). Vui lòng chờ thêm ${timeStr} nữa.`,
    };
  }

  return {
    valid: true,
    minRequired: minWorkHours,
    remainingMinutes: 0,
    message: null,
  };
};

// ============================================================================
// ATTENDANCE BUSINESS LOGIC
// ============================================================================

/**
 * Process check-in
 * @param {string} userId - User ID
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @param {number} accuracy - Độ chính xác GPS
 * @param {Buffer|null} photoFile - Photo buffer
 * @returns {Promise<Object>} { success, data, error }
 */
export const processCheckIn = async (
  userId,
  latitude,
  longitude,
  accuracy,
  photoFile
) => {
  try {
    // Validate location
    const locationValidation = validateLocation(latitude, longitude);
    if (!locationValidation.valid) {
      return { success: false, data: null, error: locationValidation.message };
    }

    // Validate GPS accuracy
    const accuracyValidation = validateGPSAccuracy(accuracy);
    if (!accuracyValidation.valid) {
      return { success: false, data: null, error: accuracyValidation.message };
    }

    // Find valid branch
    const branchResult = await validateAndFindBranch(latitude, longitude);
    if (!branchResult.valid) {
      return { success: false, data: null, error: branchResult.message };
    }

    const now = new Date();
    const dateOnly = getDateOnly(now);

    // Chặn chấm công vào cuối tuần (Thứ Bảy và Chủ Nhật) nếu config không cho phép
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Kiểm tra ENABLE_WEEKEND_CHECKIN từ env hoặc mặc định false
    const enableWeekendCheckin = process.env.ENABLE_WEEKEND_CHECKIN === "true";

    if (isWeekend && !enableWeekendCheckin) {
      const dayName = dayOfWeek === 0 ? "Chủ Nhật" : "Thứ Bảy";
      return {
        success: false,
        data: null,
        error: `Không thể chấm công vào ${dayName}. Hệ thống chỉ cho phép chấm công từ Thứ Hai đến Thứ Sáu.`,
        code: "WEEKEND_NOT_ALLOWED",
      };
    }

    // Chặn chấm công nếu hôm nay đang trong thời gian nghỉ đã được duyệt
    try {
      const { RequestModel } = await import("../requests/request.model.js");
      const leaveTypes = [
        "leave",
        "sick",
        "unpaid",
        "compensatory",
        "maternity",
      ];

      const approvedLeave = await RequestModel.findOne({
        userId,
        status: "approved",
        type: { $in: leaveTypes },
        startDate: { $lte: dateOnly },
        endDate: { $gte: dateOnly },
      }).select("_id type startDate endDate");

      if (approvedLeave) {
        return {
          success: false,
          data: null,
          error:
            "Bạn đang trong thời gian nghỉ đã được duyệt, không thể chấm công trong những ngày này.",
          code: "ON_LEAVE",
        };
      }
    } catch (leaveCheckError) {
      // Nếu lỗi khi kiểm tra đơn nghỉ, log nhưng không block chấm công
      // để tránh gây gián đoạn nếu module requests gặp sự cố
      // console.warn("[attendance] leave check failed", leaveCheckError);
    }

    // Get schedule and shift info
    const schedule = await getUserSchedule(userId, dateOnly);
    const shiftInfo = await getShiftInfo(schedule);

    // Check if can check-in early
    if (!shiftInfo.isFlexible) {
      const earlyCheck = canCheckInEarly(now, shiftInfo);
      if (!earlyCheck.canCheckIn) {
        return {
          success: false,
          data: null,
          error: earlyCheck.message,
          code: "TOO_EARLY",
        };
      }
    }

    // Use findOneAndUpdate for atomic upsert to prevent race condition
    // This prevents duplicate records even with concurrent requests
    const isLate = checkLateStatus(now, shiftInfo);

    // Upload photo BEFORE database operation
    let photoNotes = "";
    if (photoFile) {
      try {
        const uploadResult = await uploadToCloudinary(
          photoFile,
          `attendance/${userId}/${dateOnly.toISOString().split("T")[0]}`
        );
        photoNotes = `[Ảnh: ${uploadResult.secure_url}]`;
      } catch (uploadError) {}
    }

    const attendance = await AttendanceModel.findOneAndUpdate(
      { userId, date: dateOnly },
      {
        $setOnInsert: {
          userId,
          date: dateOnly,
          checkIn: now,
          locationId: branchResult.branch._id,
          status: isLate ? "late" : "present",
          notes: photoNotes,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // If checkIn already exists and is earlier than now, user already checked in
    if (attendance.checkIn && attendance.checkIn.getTime() < now.getTime()) {
      return {
        success: false,
        data: null,
        error: "Bạn đã chấm công vào hôm nay rồi.",
        code: "ALREADY_CHECKED_IN",
      };
    }

    // Emit real-time update to user and admins
    try {
      const attendanceData = {
        _id: attendance._id.toString(),
        userId: attendance.userId.toString(),
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workHours: attendance.workHours,
        locationId: attendance.locationId?.toString(),
        action: "check-in",
      };
      emitAttendanceUpdate(userId, attendanceData);
      emitAttendanceUpdateToAdmins(attendanceData);
    } catch (socketError) {
      console.error(
        "[attendance] Error emitting check-in update:",
        socketError
      );
      // Don't fail if socket emit fails
    }

    const statusMsg = attendance.status === "late" ? " (Đi muộn)" : "";
    const message = `Chấm công thành công!${statusMsg} (${shiftInfo.shiftName})`;

    return {
      success: true,
      data: {
        checkInTime: formatTime(attendance.checkIn),
        checkInDate: formatDateLabel(attendance.date),
        location: branchResult.branch.name,
        distance: `${branchResult.distance}m`,
        shiftName: shiftInfo.shiftName,
        shiftTime: `${shiftInfo.startTime} - ${shiftInfo.endTime}`,
        status: attendance.status,
      },
      error: null,
      message,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        data: null,
        error: "Bạn đã chấm công vào hôm nay rồi.",
      };
    }
    return {
      success: false,
      data: null,
      error: "Có lỗi xảy ra khi chấm công. Vui lòng thử lại.",
    };
  }
};

/**
 * Process check-out
 * @param {string} userId - User ID
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @param {number} accuracy - Độ chính xác GPS
 * @param {Buffer|null} photoFile - Photo buffer
 * @returns {Promise<Object>} { success, data, error }
 */
export const processCheckOut = async (
  userId,
  latitude,
  longitude,
  accuracy,
  photoFile
) => {
  try {
    // Validate location
    const locationValidation = validateLocation(latitude, longitude);
    if (!locationValidation.valid) {
      return { success: false, data: null, error: locationValidation.message };
    }

    // Validate GPS accuracy
    const accuracyValidation = validateGPSAccuracy(accuracy);
    if (!accuracyValidation.valid) {
      return { success: false, data: null, error: accuracyValidation.message };
    }

    // Find valid branch
    const branchResult = await validateAndFindBranch(latitude, longitude);
    if (!branchResult.valid) {
      return {
        success: false,
        data: null,
        error: `Bạn cách văn phòng gần nhất ${branchResult.distance}m. Vui lòng đến gần hơn (trong vòng ${MAX_DISTANCE}m) để check-out.`,
      };
    }

    const now = new Date();
    const dateOnly = getDateOnly(now);

    // Chặn check-out vào cuối tuần (Thứ Bảy và Chủ Nhật) nếu config không cho phép
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const enableWeekendCheckin = process.env.ENABLE_WEEKEND_CHECKIN === "true";

    if (isWeekend && !enableWeekendCheckin) {
      const dayName = dayOfWeek === 0 ? "Chủ Nhật" : "Thứ Bảy";
      return {
        success: false,
        data: null,
        error: `Không thể check-out vào ${dayName}. Hệ thống chỉ cho phép chấm công từ Thứ Hai đến Thứ Sáu.`,
        code: "WEEKEND_NOT_ALLOWED",
      };
    }

    // Find attendance record
    const attendance = await AttendanceModel.findOne({
      userId,
      date: dateOnly,
    });

    if (!attendance || !attendance.checkIn) {
      return {
        success: false,
        data: null,
        error: "Bạn chưa check-in hôm nay. Vui lòng check-in trước.",
        code: "NOT_CHECKED_IN",
      };
    }

    if (attendance.checkOut) {
      return {
        success: false,
        data: null,
        error: "Bạn đã check-out hôm nay rồi.",
        code: "ALREADY_CHECKED_OUT",
      };
    }

    // Get schedule and shift info
    const schedule = await getUserSchedule(userId, dateOnly);
    const shiftInfo = await getShiftInfo(schedule);

    // Validate work hours
    const checkInTime = new Date(attendance.checkIn);
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60);
    const workHoursValidation = validateWorkHours(hoursWorked, shiftInfo);

    if (!workHoursValidation.valid) {
      return {
        success: false,
        data: {
          hoursWorked: Math.floor(hoursWorked * 100) / 100,
          minRequired: workHoursValidation.minRequired,
          remainingMinutes: workHoursValidation.remainingMinutes,
          shiftName: shiftInfo.shiftName,
        },
        error: workHoursValidation.message,
        code: "INSUFFICIENT_WORK_HOURS",
      };
    }

    // Process check-out
    attendance.checkOut = now;
    const checkOutInfo = checkEarlyLeaveOrOvertime(now, shiftInfo);

    let additionalNote = "";
    if (checkOutInfo.isEarlyLeave) {
      additionalNote = `\n[Về sớm ${checkOutInfo.minutesEarly} phút - ${shiftInfo.shiftName}]`;
    } else if (checkOutInfo.isOvertime) {
      additionalNote = `\n[Tăng ca ${checkOutInfo.minutesOvertime} phút - ${shiftInfo.shiftName}]`;
    }

    // Upload photo if provided
    if (photoFile) {
      const photoResult = await uploadPhoto(photoFile, "attendance/checkouts");
      if (photoResult.success) {
        attendance.notes =
          addPhotoToNotes(attendance.notes, photoResult.url, "checkout") +
          additionalNote;
      } else if (additionalNote) {
        attendance.notes = attendance.notes
          ? `${attendance.notes}${additionalNote}`
          : additionalNote.trim();
      }
    } else if (additionalNote) {
      attendance.notes = attendance.notes
        ? `${attendance.notes}${additionalNote}`
        : additionalNote.trim();
    }

    attendance.calculateWorkHours();
    await attendance.save();

    // Emit real-time update to user and admins
    try {
      const attendanceData = {
        _id: attendance._id.toString(),
        userId: attendance.userId.toString(),
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workHours: attendance.workHours,
        locationId: attendance.locationId?.toString(),
        action: "check-out",
      };
      emitAttendanceUpdate(userId, attendanceData);
      emitAttendanceUpdateToAdmins(attendanceData);
    } catch (socketError) {
      console.error(
        "[attendance] Error emitting check-out update:",
        socketError
      );
      // Don't fail if socket emit fails
    }

    const workHours = attendance.workHours
      ? `${Math.floor(attendance.workHours)}h ${Math.round(
          (attendance.workHours % 1) * 60
        )}m`
      : "0h";

    // Create message
    let message = `Check-out thành công! (${shiftInfo.shiftName})`;
    if (checkOutInfo.isEarlyLeave) {
      message = `Check-out thành công! Về sớm ${checkOutInfo.minutesEarly} phút (${shiftInfo.shiftName})`;
    } else if (checkOutInfo.isOvertime) {
      message = `Check-out thành công! Tăng ca ${checkOutInfo.minutesOvertime} phút (${shiftInfo.shiftName})`;
    }

    return {
      success: true,
      data: {
        checkOutTime: formatTime(attendance.checkOut),
        checkOutDate: formatDateLabel(attendance.date),
        workHours,
        location: branchResult.branch.name,
        distance: `${branchResult.distance}m`,
        shiftName: shiftInfo.shiftName,
        shiftTime: `${shiftInfo.startTime} - ${shiftInfo.endTime}`,
        isEarlyLeave: checkOutInfo.isEarlyLeave,
        isOvertime: checkOutInfo.isOvertime,
        minutesEarly: checkOutInfo.minutesEarly,
        minutesOvertime: checkOutInfo.minutesOvertime,
      },
      error: null,
      message,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: "Có lỗi xảy ra khi check-out. Vui lòng thử lại.",
    };
  }
};
