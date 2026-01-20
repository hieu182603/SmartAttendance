/**
 * Migration Script: Backfill positionKey for existing SalaryMatrix records
 * 
 * This script:
 * 1. Finds all SalaryMatrix documents where positionKey is null/undefined
 * 2. Sets positionKey to normalized position value (trimmed and lowercased)
 * 3. Updates each document
 * 4. Rebuilds the partial unique index
 * 
 * Usage: node src/scripts/backfill-position-key.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartattendance';

// Define schema inline to avoid circular dependencies
const salaryMatrixSchema = new mongoose.Schema(
    {
        departmentCode: { type: String, required: true },
        position: { type: String, required: true },
        positionKey: { type: String },
        baseSalary: { type: Number, required: true },
        notes: { type: String },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

const SalaryMatrix = mongoose.model('SalaryMatrix', salaryMatrixSchema);

async function backfillPositionKey() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all records where positionKey is missing
        console.log('\n🔍 Finding records with missing positionKey...');
        const recordsToUpdate = await SalaryMatrix.find({
            $or: [
                { positionKey: null },
                { positionKey: { $exists: false } },
                { positionKey: '' }
            ]
        });

        console.log(`📊 Found ${recordsToUpdate.length} records to update`);

        if (recordsToUpdate.length === 0) {
            console.log('✨ No records need updating. All positionKeys are already set.');
            await mongoose.disconnect();
            return;
        }

        // Update each record
        let successCount = 0;
        let errorCount = 0;

        console.log('\n🔄 Updating records...');
        for (const record of recordsToUpdate) {
            try {
                const normalizedPosition = record.position ? record.position.trim().toLowerCase() : null;

                if (!normalizedPosition) {
                    console.warn(`⚠️  Skipping record ${record._id}: position is empty`);
                    errorCount++;
                    continue;
                }

                record.positionKey = normalizedPosition;
                await record.save();

                successCount++;
                console.log(`✅ Updated ${record._id}: ${record.departmentCode} - ${record.position} -> positionKey: "${normalizedPosition}"`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating record ${record._id}:`, error.message);
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   Total records found: ${recordsToUpdate.length}`);
        console.log(`   Successfully updated: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);

        // Rebuild the partial unique index
        console.log('\n🔨 Rebuilding partial unique index...');
        try {
            await SalaryMatrix.collection.dropIndex('departmentCode_1_positionKey_1');
            console.log('   Dropped existing index');
        } catch (error) {
            console.log('   No existing index to drop (this is OK)');
        }

        await SalaryMatrix.collection.createIndex(
            { departmentCode: 1, positionKey: 1 },
            { unique: true, partialFilterExpression: { isActive: true } }
        );
        console.log('✅ Rebuilt partial unique index on { departmentCode: 1, positionKey: 1 }');

        console.log('\n✨ Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the migration
backfillPositionKey();
