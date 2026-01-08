import mongoose from "mongoose";

/**
 * Kết nối MongoDB database
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
    // Sử dụng giá trị từ env, nếu trống hoặc undefined thì dùng default
    const MONGO_URI = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017/smartattendance";

    // Validate connection string format
    if (!MONGO_URI.startsWith("mongodb://") && !MONGO_URI.startsWith("mongodb+srv://")) {
        throw new Error(`Invalid MONGO_URI format. Must start with "mongodb://" or "mongodb+srv://". Current value: "${MONGO_URI}"`);
    }

    // Log connection info (ẩn password)
    const maskedUri = MONGO_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, (match, srv, user, pass) => {
        return `mongodb${srv || ''}://${user}:****@`;
    });

    await mongoose.connect(MONGO_URI);

    // Database connected successfully
}

/**
 * Đóng kết nối database
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
    await mongoose.disconnect();
}

