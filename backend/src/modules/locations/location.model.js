import mongoose from "mongoose";

/**
 * Schema cho Location (Địa điểm chấm công)
 */
const locationSchema = new mongoose.Schema(
    {
        // TODO: Thêm các fields cần thiết
        // Ví dụ:
        // name: { type: String, required: true },
        // address: { type: String, required: true },
        // latitude: { type: Number, required: true },
        // longitude: { type: Number, required: true },
        // radius: { type: Number, default: 100 }, // Bán kính cho phép (mét)
        // isActive: { type: Boolean, default: true },
        // description: { type: String }
    },
    { timestamps: true }
);

// TODO: Thêm indexes nếu cần
// locationSchema.index({ latitude: 1, longitude: 1 });

// TODO: Thêm methods nếu cần
// locationSchema.methods.isWithinRadius = function(lat, lng) {
//     // Logic kiểm tra có trong bán kính cho phép không
// };

// TODO: Thêm pre-save/post-save hooks nếu cần
// locationSchema.pre('save', async function (next) {
//     // Logic trước khi lưu
//     next();
// });

export const LocationModel = mongoose.model("Location", locationSchema);

