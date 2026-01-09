import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/modules/users/user.model.js';
import { BranchModel } from '../src/modules/branches/branch.model.js';
import { DepartmentModel } from '../src/modules/departments/department.model.js';
import { hashPassword } from '../src/utils/bcrypt.util.js';

dotenv.config();

// Use local MongoDB for seeding scripts
const MONGO_URI = 'mongodb://127.0.0.1:27017/smartattendance';

/**
 * Script tạo SUPERVISOR cho từng phòng ban
 * Mỗi phòng ban sẽ có 1-2 SUPERVISOR tùy theo size
 */
async function createSupervisors() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully\n');

        // Lấy tất cả departments và branches
        const departments = await DepartmentModel.find({ status: 'active' }).populate('branchId');
        const branches = await BranchModel.find({});

        console.log(`📁 Found ${departments.length} active departments\n`);

        // Mẫu tên cho SUPERVISOR
        const supervisorTemplates = [
            { firstName: 'Trần', middleName: 'Minh', lastName: 'Huy', title: 'Senior' },
            { firstName: 'Lê', middleName: 'Thị', lastName: 'Lan', title: 'Lead' },
            { firstName: 'Phạm', middleName: 'Văn', lastName: 'Đức', title: 'Principal' },
            { firstName: 'Hoàng', middleName: 'Minh', lastName: 'Anh', title: 'Tech Lead' },
            { firstName: 'Vũ', middleName: 'Thị', lastName: 'Mai', title: 'Team Lead' },
            { firstName: 'Nguyễn', middleName: 'Minh', lastName: 'Tuấn', title: 'Senior Lead' },
            { firstName: 'Đặng', middleName: 'Thị', lastName: 'Hương', title: 'Group Lead' },
            { firstName: 'Bùi', middleName: 'Văn', lastName: 'Quang', title: 'Senior' },
        ];

        const hashedPassword = await hashPassword('password123');
        const supervisors = [];
        let supervisorCount = 0;

        console.log('👥 Creating SUPERVISOR for each department...\n');

        for (let i = 0; i < departments.length; i++) {
            const department = departments[i];
            const branch = department.branchId;

            // Số lượng SUPERVISOR cho mỗi department (1-2)
            const numSupervisors = department.code === 'DEV' || department.code === 'PRODUCT' ? 2 : 1;

            for (let j = 0; j < numSupervisors; j++) {
                const template = supervisorTemplates[(i * 2 + j) % supervisorTemplates.length];

                // Tạo email: supervisor.{dept_code}.{number}@{domain}
                const emailNumber = j + 1;
                const email = `supervisor.${department.code.toLowerCase()}.${emailNumber}@smartattendance.com`;

                // Tên đầy đủ với title
                const fullName = `${template.title} ${template.firstName} ${template.middleName} ${template.lastName}`;

                // Số điện thoại
                const phoneNumber = String(2000000 + supervisorCount + 1).slice(-7);
                const phone = `091${phoneNumber}`;

                const supervisor = {
                    email,
                    password: hashedPassword,
                    name: fullName,
                    role: 'SUPERVISOR',
                    phone,
                    department: department._id,
                    branch: branch._id,
                    isVerified: true,
                    isActive: true,
                    position: `Supervisor - ${department.name}`,
                    notes: `Giám sát viên phòng ${department.name}`
                };

                supervisors.push(supervisor);
                supervisorCount++;

                console.log(`  ✅ Created SUPERVISOR: ${fullName} (${email}) - ${department.name}`);
            }
        }

        // Insert supervisors vào database
        if (supervisors.length > 0) {
            const createdSupervisors = await UserModel.insertMany(supervisors);
            console.log(`\n✅ Successfully created ${createdSupervisors.length} SUPERVISOR accounts\n`);

            // Hiển thị tóm tắt
            console.log('📊 SUPERVISOR Summary:');
            const supervisorByDept = {};
            createdSupervisors.forEach(sup => {
                const deptId = sup.department.toString();
                if (!supervisorByDept[deptId]) {
                    supervisorByDept[deptId] = [];
                }
                supervisorByDept[deptId].push(sup);
            });

            for (const dept of departments) {
                const deptSupervisors = supervisorByDept[dept._id.toString()] || [];
                console.log(`  📁 ${dept.name} (${dept.code}): ${deptSupervisors.length} supervisor(s)`);
                deptSupervisors.forEach(sup => {
                    console.log(`    • ${sup.name} - ${sup.email}`);
                });
            }

            console.log('\n🔐 Default password for all SUPERVISOR accounts: password123');
            console.log('📧 All SUPERVISOR accounts are verified and active');
        }

    } catch (error) {
        console.error('❌ Error creating SUPERVISOR:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Chạy script trực tiếp
createSupervisors().catch(console.error);

export { createSupervisors };
