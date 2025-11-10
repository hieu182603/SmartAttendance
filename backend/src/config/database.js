import mongoose from "mongoose";

/**
 * Kết nối MongoDB database
 * @returns {Promise<void>}
 */
export async function connectDatabase() {
    try {
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
        console.log(`🔌 Connecting to MongoDB: ${maskedUri}`);

        await mongoose.connect(MONGO_URI);
        
        // Log database info
        const dbName = mongoose.connection.db.databaseName;
        const host = mongoose.connection.host;
        console.log(`✅ MongoDB connected successfully`);
        console.log(`   📊 Database: ${dbName}`);
        console.log(`   🌐 Host: ${host}`);
        console.log(`   📦 Collections: ${(await mongoose.connection.db.listCollections().toArray()).map(c => c.name).join(', ') || 'None (empty database)'}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
}

/**
 * Đóng kết nối database
 * @returns {Promise<void>}
 */
export async function disconnectDatabase() {
    try {
        await mongoose.disconnect();
        console.log("✅ MongoDB disconnected");
    } catch (error) {
        console.error("❌ MongoDB disconnection error:", error);
        throw error;
    }
}

