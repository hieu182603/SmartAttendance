import mongoose from 'mongoose';
import { UserModel } from '../src/modules/users/user.model.js';

/**
 * Migration script to add trial-related fields to existing users
 * Run this script once after updating the user model
 */

async function migrateTrialFields() {
    try {
        // Connect to database
        const MONGO_URI = process.env.MONGO_URI?.trim();
        await mongoose.connect(MONGO_URI);
        console.log('Connected to database');

        // Update all existing users to add trial fields
        const result = await UserModel.updateMany(
            {},
            {
                $set: {
                    isTrial: false,
                    trialExpiresAt: null,
                    trialConvertedAt: null,
                }
            }
        );

        console.log(`Migration completed. Updated ${result.modifiedCount} users.`);

        // Disconnect
        await mongoose.disconnect();
        console.log('Disconnected from database');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateTrialFields();
