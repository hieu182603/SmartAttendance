import mongoose from "mongoose";
import dotenv from "dotenv";
import { PAYROLL_RULES } from "../src/config/payroll.config.js";
import { roundSalary, calculateActualBaseSalary } from "../src/modules/payroll/payroll.service.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartattendance";

/**
 * Migration script để tính lại actualBaseSalary cho các PayrollRecord cũ
 * 
 * Script này sẽ:
 * 1. Tìm tất cả PayrollRecord không có actualBaseSalary (null/undefined)
 * 2. Tính lại actualBaseSalary = baseSalary * (workDays / STANDARD_WORK_DAYS)
 * 3. Cập nhật vào database
 * 
 * Usage: node scripts/migrateActualBaseSalary.js
 */
async function migrateActualBaseSalary() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected successfully\n");

    // Import model
    const { PayrollRecordModel } = await import(
      "../src/modules/payroll/payroll.model.js"
    );

    console.log("📋 Finding payroll records without actualBaseSalary...");

    // Tìm tất cả records không có actualBaseSalary hoặc actualBaseSalary === null
    const recordsToMigrate = await PayrollRecordModel.find({
      $or: [
        { actualBaseSalary: { $exists: false } },
        { actualBaseSalary: null },
        { actualBaseSalary: undefined },
      ],
    }).lean();

    console.log(
      `Found ${recordsToMigrate.length} records to migrate\n`
    );

    if (recordsToMigrate.length === 0) {
      console.log("✅ No records need migration. All records already have actualBaseSalary.");
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log("🔄 Starting migration...\n");

    for (const record of recordsToMigrate) {
      try {
        const { _id, baseSalary, workDays, totalDays } = record;

        // Validate data
        if (
          baseSalary === null ||
          baseSalary === undefined ||
          workDays === null ||
          workDays === undefined ||
          totalDays === null ||
          totalDays === undefined
        ) {
          console.warn(
            `⚠️  Skipping record ${_id}: Missing required fields (baseSalary: ${baseSalary}, workDays: ${workDays}, totalDays: ${totalDays})`
          );
          skipCount++;
          continue;
        }

        // Tính lại actualBaseSalary using the same logic as runtime (calculateActualBaseSalary)
        // This ensures consistent rounding to thousands (precision = 1000)
        const actualBaseSalary = calculateActualBaseSalary(baseSalary, workDays);

        // Cập nhật record
        await PayrollRecordModel.updateOne(
          { _id },
          {
            $set: {
              actualBaseSalary,
            },
          }
        );

        successCount++;

        // Log progress mỗi 50 records
        if (successCount % 50 === 0) {
          console.log(`  ✅ Migrated ${successCount}/${recordsToMigrate.length} records...`);
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Record ${record._id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ Error migrating record ${record._id}:`, error.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} records`);
    console.log(`⚠️  Skipped: ${skipCount} records (missing data)`);
    console.log(`❌ Errors: ${errorCount} records`);

    if (errors.length > 0) {
      console.log("\n❌ Error details:");
      errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }

    console.log("\n✅ Migration completed!");

    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const remainingRecords = await PayrollRecordModel.countDocuments({
      $or: [
        { actualBaseSalary: { $exists: false } },
        { actualBaseSalary: null },
        { actualBaseSalary: undefined },
      ],
    });

    if (remainingRecords === 0) {
      console.log("✅ All records now have actualBaseSalary!");
    } else {
      console.warn(
        `⚠️  Warning: ${remainingRecords} records still missing actualBaseSalary`
      );
    }

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.error("Stack trace:", error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateActualBaseSalary();

