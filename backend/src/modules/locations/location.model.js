import mongoose from "mongoose";

/**
 * Schema cho Location (Địa điểm chấm công)
 */
const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      default: 100, // bán kính cho phép (đơn vị: mét)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Danh sách BSSID (MAC address) của các WiFi access point hợp lệ tại địa điểm này
    allowedBSSIDs: [
      {
        type: String,
        trim: true,
        uppercase: true, // Lưu dạng uppercase để so sánh dễ dàng
      },
    ],
    // SSID của WiFi (tên mạng WiFi)
    allowedSSIDs: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// Tạo index để tối ưu truy vấn theo vị trí
locationSchema.index({ latitude: 1, longitude: 1 });

/*
 * Kiểm tra xem người dùng có ở trong bán kính cho phép của địa điểm không
 * @param {Number} userLat - Vĩ độ người dùng
 * @param {Number} userLng - Kinh độ người dùng
 * @returns {Boolean}
 */

locationSchema.methods.isWithinRadius = function (userLat, userLng) {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371e3; // Bán kính Trái Đất (mét)
  const φ1 = toRad(this.latitude);
  const φ2 = toRad(userLat);
  const Δφ = toRad(userLat - this.latitude);
  const Δλ = toRad(userLng - this.longitude);

  // Công thức Haversine tính khoảng cách giữa 2 tọa độ
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Khoảng cách (mét)

  return distance <= this.radius; // true nếu trong bán kính cho phép
};

/**
 * Kiểm tra xem BSSID có trong danh sách được phép không
 * @param {String} bssid - BSSID (MAC address) của WiFi
 * @returns {Boolean}
 */
locationSchema.methods.isBSSIDAllowed = function (bssid) {
  if (!bssid || !this.allowedBSSIDs || this.allowedBSSIDs.length === 0) {
    return false; // Nếu không có BSSID hoặc không có whitelist, trả về false
  }
  const normalizedBSSID = String(bssid)
    .trim()
    .toUpperCase()
    .replace(/[:-]/g, "");
  return this.allowedBSSIDs.some(
    (allowed) => allowed.replace(/[:-]/g, "") === normalizedBSSID
  );
};

/**
 * Kiểm tra xem SSID có trong danh sách được phép không
 * @param {String} ssid - SSID (tên mạng WiFi)
 * @returns {Boolean}
 */
locationSchema.methods.isSSIDAllowed = function (ssid) {
  if (!ssid || !this.allowedSSIDs || this.allowedSSIDs.length === 0) {
    return false; // Nếu không có SSID hoặc không có whitelist, trả về false
  }
  const normalizedSSID = String(ssid).trim();
  return this.allowedSSIDs.some((allowed) => allowed.trim() === normalizedSSID);
};

/**
 * Kiểm tra vị trí kết hợp GPS và BSSID/SSID
 * @param {Number} userLat - Vĩ độ người dùng
 * @param {Number} userLng - Kinh độ người dùng
 * @param {String} bssid - BSSID (MAC address) của WiFi (optional)
 * @param {String} ssid - SSID (tên mạng WiFi) (optional)
 * @returns {Object} { isValid: Boolean, method: String, distance?: Number }
 */
locationSchema.methods.validateLocation = function (
  userLat,
  userLng,
  bssid = null,
  ssid = null
) {
  // Ưu tiên kiểm tra BSSID nếu có (chính xác nhất)
  if (bssid && this.isBSSIDAllowed(bssid)) {
    return {
      isValid: true,
      method: "bssid",
      message: "Xác thực bằng BSSID thành công",
    };
  }

  // Kiểm tra SSID nếu có
  if (ssid && this.isSSIDAllowed(ssid)) {
    return {
      isValid: true,
      method: "ssid",
      message: "Xác thực bằng SSID thành công",
    };
  }

  // Fallback: kiểm tra GPS
  const isWithinGPS = this.isWithinRadius(userLat, userLng);
  if (isWithinGPS) {
    // Tính khoảng cách
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371e3;
    const φ1 = toRad(this.latitude);
    const φ2 = toRad(userLat);
    const Δφ = toRad(userLat - this.latitude);
    const Δλ = toRad(userLng - this.longitude);
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      isValid: true,
      method: "gps",
      distance: Math.round(distance),
      message: "Xác thực bằng GPS thành công",
    };
  }

  return {
    isValid: false,
    method: "none",
    message: "Vị trí không hợp lệ",
  };
};

// locationSchema.methods.isWithinRadius = function (userLat, userLng) {
//   // 1 độ vĩ độ ~ 111.32 km
//   // 1 độ kinh độ ~ 111.32 km * cos(latitude)
//   const latDiff = (userLat - this.latitude) * 111.32 * 1000; // mét
//   const lngDiff = (userLng - this.longitude) * 111.32 * 1000 * Math.cos(this.latitude * Math.PI / 180);

//   // Tính khoảng cách phẳng giữa 2 điểm
//   const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2);

//   // So sánh với bán kính
//   return distance <= this.radius;
// };

// Hook kiểm tra hợp lệ trước khi lưu
locationSchema.pre("save", function (next) {
  if (this.latitude < -90 || this.latitude > 90) {
    return next(new Error("Latitude phải nằm trong khoảng -90 đến 90"));
  }
  if (this.longitude < -180 || this.longitude > 180) {
    return next(new Error("Longitude phải nằm trong khoảng -180 đến 180"));
  }
  next();
});

export const LocationModel = mongoose.model("Location", locationSchema);
