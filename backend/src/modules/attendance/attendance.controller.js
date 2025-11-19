import { AttendanceModel } from "./attendance.model.js";
import { LocationModel } from "../locations/location.model.js";
import { google } from "googleapis";
import stream from "stream";

// Google Drive setup: use service account JSON path in env GOOGLE_APPLICATION_CREDENTIALS
// and optionally target folder in env DRIVE_FOLDER_ID. If not provided, folderId can be set manually.
const driveAuth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

async function uploadBufferToDrive(
  buffer,
  filename,
  mimeType,
  folderId = null
) {
  const client = await driveAuth.getClient();
  const drive = google.drive({ version: "v3", auth: client });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: folderId ? [folderId] : undefined,
      mimeType,
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: "id, name",
  });

  return res.data; // { id, name }
}

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
    // If request is multipart/form-data (via multer), small fields are in req.body and file in req.file
    const {
      latitude: latRaw,
      longitude: lonRaw,
      accuracy,
      ssid,
      bssid,
      qrCode,
    } = req.body || {};
    const photoFile = req.file || null; // multer will populate req.file when upload.single('photo') used

    // Convert numeric inputs
    const latitude = latRaw !== undefined ? Number(latRaw) : undefined;
    const longitude = lonRaw !== undefined ? Number(lonRaw) : undefined;
    // qrCode và photo có thể được sử dụng để validate và lưu trữ trong tương lai

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
      if (photoFile) {
        try {
          const folderId =
            process.env.DRIVE_FOLDER_ID || "1TAx6V0Ut8a4Q91bH-5-doVNGKvwuxlfL"; // default to provided link id
          const uploaded = await uploadBufferToDrive(
            photoFile.buffer,
            photoFile.originalname || `checkin-${Date.now()}.jpg`,
            photoFile.mimetype || "image/jpeg",
            folderId
          );
          attendance.notes = attendance.notes
            ? `${attendance.notes}\n[Ảnh đã được lưu: ${uploaded.id}]`
            : `[Ảnh đã được lưu: ${uploaded.id}]`;
        } catch (e) {
          console.error("Upload to Drive failed:", e);
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
        notes: photoFile ? `[Ảnh đã được lưu]` : "",
      });

      if (photoFile) {
        try {
          const folderId =
            process.env.DRIVE_FOLDER_ID || "1TAx6V0Ut8a4Q91bH-5-doVNGKvwuxlfL";
          const uploaded = await uploadBufferToDrive(
            photoFile.buffer,
            photoFile.originalname || `checkin-${Date.now()}.jpg`,
            photoFile.mimetype || "image/jpeg",
            folderId
          );
          attendance.notes = attendance.notes
            ? `${attendance.notes}\n[Ảnh đã được lưu: ${uploaded.id}]`
            : `[Ảnh đã được lưu: ${uploaded.id}]`;
        } catch (e) {
          console.error("Upload to Drive failed:", e);
          attendance.notes = attendance.notes
            ? `${attendance.notes}\n[Ảnh lưu thất bại]`
            : "[Ảnh lưu thất bại]";
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
