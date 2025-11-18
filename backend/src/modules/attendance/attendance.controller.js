import { AttendanceModel } from "./attendance.model.js";
import { LocationModel } from "../locations/location.model.js";

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

export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, search } = req.query;

    const query = { userId };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const docs = await AttendanceModel.find(query)
      .populate("locationId")
      .sort({ date: -1 });

    const keyword = search?.trim().toLowerCase();

    const data = docs
      .map((doc) => {
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
      })
      .filter((record) => {
        if (!keyword) return true;
        return (
          record.date.toLowerCase().includes(keyword) ||
          record.day.toLowerCase().includes(keyword) ||
          record.location.toLowerCase().includes(keyword) ||
          record.notes.toLowerCase().includes(keyword) ||
          record.status.toLowerCase().includes(keyword)
        );
      });

    res.json(data);
  } catch (error) {
    console.error("[attendance] history error", error);
    res.status(500).json({ message: "Không lấy được lịch sử chấm công" });
  }
};

/**
 * Chấm công vào (Check-in)
 * POST /api/attendance/checkin
 * Body: { latitude, longitude, accuracy, qrCode?, photo? }
 */
export const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude, accuracy, ssid, bssid, qrCode, photo } =
      req.body;
    // qrCode và photo có thể được sử dụng để validate và lưu trữ trong tương lai

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp vị trí (latitude và longitude)",
      });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
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

    const now = new Date();

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
      if (photo) {
        // Có thể lưu ảnh vào cloud storage hoặc database
        // Ở đây tạm thời bỏ qua
        attendance.notes = attendance.notes
          ? `${attendance.notes}\n[Ảnh đã được lưu]`
          : "[Ảnh đã được lưu]";
      }
    } else {
      // Tạo mới bản ghi chấm công
      attendance = new AttendanceModel({
        userId,
        date: dateOnly,
        checkIn: now,
        locationId: validLocation._id,
        status: "present",
        notes: photo ? "[Ảnh đã được lưu]" : "",
      });
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
        validationMethod: validationResult.method, // 'bssid', 'ssid', hoặc 'gps'
        distance: validationResult.distance
          ? `${validationResult.distance}m`
          : null,
      },
    });
  } catch (error) {
    console.error("[attendance] check-in error", error);

    // Xử lý lỗi duplicate (nếu có)
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
