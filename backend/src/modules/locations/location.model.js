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
