import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

// Import models
const { UserModel } = await import("../src/modules/users/user.model.js");
const { connectDatabase } = await import("../src/config/database.js");

async function migrateFaceData() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDatabase();
    console.log("✅ Database connected successfully");

    // Find users without faceData field or with null faceData
    const usersToMigrate = await UserModel.find({
      $or: [
        { faceData: { $exists: false } },
        { faceData: null },
      ],
    });

    console.log(`📋 Found ${usersToMigrate.length} users to migrate...`);

    if (usersToMigrate.length === 0) {
      console.log("✅ No users need migration. All users already have faceData initialized.");
      process.exit(0);
    }

    // Initialize faceData for each user
    let migratedCount = 0;
    for (const user of usersToMigrate) {
      try {
        user.faceData = {
          isRegistered: false,
          embeddings: [],
          registeredAt: null,
          faceImages: [],
          lastVerifiedAt: null,
        };
        await user.save();
        migratedCount++;
        console.log(`✅ Migrated user: ${user.email || user._id}`);
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user._id}:`, error.message);
      }
    }

    console.log(`\n✅ Migration complete! Migrated ${migratedCount} out of ${usersToMigrate.length} users.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateFaceData();











