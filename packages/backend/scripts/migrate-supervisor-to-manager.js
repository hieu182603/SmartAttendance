/**
 * One-time migration: convert legacy SUPERVISOR users to MANAGER.
 * Run: node packages/backend/scripts/migrate-supervisor-to-manager.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/modules/users/user.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartattendance';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const result = await UserModel.updateMany(
    { role: 'SUPERVISOR' },
    { $set: { role: 'MANAGER' } },
  );
  console.log(`Migrated ${result.modifiedCount} user(s) from SUPERVISOR → MANAGER`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
