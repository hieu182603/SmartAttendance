import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/modules/users/user.model.js';
import { hashPassword } from '../src/utils/bcrypt.util.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartattendance';

async function createTrialTestAccounts() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully\n');

        // Hash password cho test accounts
        const hashedPassword = await hashPassword('SmartAttendance@2026!');

        // Tạo trial accounts với thời gian expire khác nhau
        const trialUsers = [
            {
                email: 'trial.active@smartattendance.com',
                password: hashedPassword,
                name: 'Trial User Active',
                role: 'TRIAL',
                isTrial: true,
                trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày từ bây giờ
                isVerified: true,
                isActive: true,
            },
            {
                email: 'trial.expiring@smartattendance.com',
                password: hashedPassword,
                name: 'Trial User Expiring',
                role: 'TRIAL',
                isTrial: true,
                trialExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 ngày từ bây giờ
                isVerified: true,
                isActive: true,
            },
            {
                email: 'trial.expired@smartattendance.com',
                password: hashedPassword,
                name: 'Trial User Expired',
                role: 'TRIAL',
                isTrial: true,
                trialExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Hết hạn 1 ngày
                isVerified: true,
                isActive: true,
            },
            {
                email: 'trial.converted@smartattendance.com',
                password: hashedPassword,
                name: 'Trial User Converted',
                role: 'EMPLOYEE',
                isTrial: false,
                trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                trialConvertedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Chuyển đổi 2 ngày trước
                isVerified: true,
                isActive: true,
            }
        ];

        console.log('🧪 Creating trial test accounts...');

        // Check if accounts already exist, if not create them
        for (const userData of trialUsers) {
            const existingUser = await UserModel.findOne({ email: userData.email });
            if (existingUser) {
                console.log(`ℹ️  Account ${userData.email} already exists, skipping...`);
                continue;
            }

            await UserModel.create(userData);
            console.log(`✅ Created trial account: ${userData.email}`);
        }

        console.log('\n🎯 Trial Test Accounts Ready!');
        console.log('==============================');
        console.log('🔹 trial.active@smartattendance.com    - Trial đang active (7 ngày)');
        console.log('🔹 trial.expiring@smartattendance.com  - Trial sắp hết (2 ngày)');
        console.log('🔹 trial.expired@smartattendance.com   - Trial đã hết hạn');
        console.log('🔹 trial.converted@smartattendance.com - Đã chuyển đổi thành EMPLOYEE');
        console.log('');
        console.log('📝 Password for all accounts: SmartAttendance@2026!');
        console.log('==============================');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');

    } catch (error) {
        console.error('❌ Error creating trial test accounts:', error);
        process.exit(1);
    }
}

createTrialTestAccounts();
