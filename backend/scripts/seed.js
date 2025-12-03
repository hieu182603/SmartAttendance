import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/modules/users/user.model.js';
import { ShiftModel } from '../src/modules/shifts/shift.model.js';
import { LocationModel } from '../src/modules/locations/location.model.js';
import { BranchModel } from '../src/modules/branches/branch.model.js';
import { DepartmentModel } from '../src/modules/departments/department.model.js';
import { AttendanceModel } from '../src/modules/attendance/attendance.model.js';
import { RequestModel } from '../src/modules/requests/request.model.js';
import { ReportModel } from '../src/modules/reports/report.model.js';
import { LogModel } from '../src/modules/logs/log.model.js';
import { PayrollRecordModel } from '../src/modules/payroll/payroll.model.js';
import { PerformanceReviewModel } from '../src/modules/performance/performance.model.js';
import { CalendarEventModel } from '../src/modules/calendar/calendar.model.js';
import { EmployeeScheduleModel } from '../src/modules/schedule/schedule.model.js';
import { SystemConfigModel } from '../src/modules/config/config.model.js';
import { EmployeeShiftAssignmentModel } from '../src/modules/shifts/employeeShiftAssignment.model.js';
import { RequestTypeModel } from '../src/modules/requests/request-type.model.js';
import { NotificationModel } from '../src/modules/notifications/notification.model.js';
import { hashPassword } from '../src/utils/bcrypt.util.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartattendance';

// Helper function để random trong khoảng
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
    try {
        // Kết nối database
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected successfully\n');

        // Xóa data cũ
        console.log('🗑️  Clearing old data...');
        await UserModel.deleteMany({});
        await ShiftModel.deleteMany({});
        await LocationModel.deleteMany({});
        await BranchModel.deleteMany({});
        await DepartmentModel.deleteMany({});
        await AttendanceModel.deleteMany({});
        await RequestModel.deleteMany({});
        await ReportModel.deleteMany({});
        await LogModel.deleteMany({});
        await PayrollRecordModel.deleteMany({});
        await PerformanceReviewModel.deleteMany({});
        await CalendarEventModel.deleteMany({});
        await EmployeeScheduleModel.deleteMany({});
        await SystemConfigModel.deleteMany({});
        await EmployeeShiftAssignmentModel.deleteMany({});
        await RequestTypeModel.deleteMany({});
        await NotificationModel.deleteMany({});

        // Xóa collection UserShift nếu tồn tại
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            const userShiftCollection = collections.find(col => col.name.toLowerCase() === 'usershifts' || col.name.toLowerCase() === 'usershift');
            if (userShiftCollection) {
                await db.collection(userShiftCollection.name).drop();
                console.log('✅ Deleted UserShift collection');
            }
        } catch (error) {
            // Collection không tồn tại, bỏ qua
            console.log('ℹ️  UserShift collection not found, skipping...');
        }

        console.log('✅ Old data cleared\n');

        // ========== 1. TẠO SHIFTS (Ca làm việc) ==========
        console.log('📅 Creating shifts...');
        const shifts = await ShiftModel.insertMany([
            {
                name: 'Full time',
                startTime: '08:00',
                endTime: '17:00',
                breakDuration: 60,
                isFlexible: false,
                description: 'Ca làm việc cả ngày từ 8h-17h',
                isActive: true,
            },
        ]);
        console.log(`✅ Created ${shifts.length} shifts\n`);

        // ========== 1.5. TẠO REQUEST TYPES (Loại yêu cầu) ==========
        console.log('📋 Creating request types...');
        const requestTypes = [
            { value: 'leave', label: 'Nghỉ phép', description: 'Nghỉ phép năm', sortOrder: 0, isActive: true, isSystem: true },
            { value: 'sick', label: 'Nghỉ ốm', description: 'Nghỉ ốm', sortOrder: 1, isActive: true, isSystem: true },
            { value: 'unpaid', label: 'Nghỉ không lương', description: 'Nghỉ không lương', sortOrder: 2, isActive: true, isSystem: true },
            { value: 'compensatory', label: 'Nghỉ bù', description: 'Nghỉ bù', sortOrder: 3, isActive: true, isSystem: true },
            { value: 'maternity', label: 'Nghỉ thai sản', description: 'Nghỉ thai sản', sortOrder: 4, isActive: true, isSystem: true },
            { value: 'overtime', label: 'Tăng ca', description: 'Yêu cầu làm thêm giờ', sortOrder: 5, isActive: true, isSystem: true },
            { value: 'remote', label: 'Làm từ xa', description: 'Làm việc từ xa', sortOrder: 6, isActive: true, isSystem: true },
            { value: 'late', label: 'Đi muộn', description: 'Yêu cầu đi muộn', sortOrder: 7, isActive: true, isSystem: true },
            { value: 'correction', label: 'Sửa công', description: 'Yêu cầu sửa chấm công', sortOrder: 8, isActive: true, isSystem: true },
            { value: 'other', label: 'Yêu cầu khác', description: 'Các yêu cầu khác', sortOrder: 9, isActive: true, isSystem: true },
        ];
        const createdRequestTypes = await RequestTypeModel.insertMany(requestTypes);
        console.log(`✅ Created ${createdRequestTypes.length} request types\n`);

        // ========== 2. TẠO LOCATIONS (Địa điểm) ==========
        console.log('📍 Creating locations...');
        const locations = await LocationModel.insertMany([
            {
                name: 'Trụ sở chính Hà Nội',
                address: '123 Đường Láng, Đống Đa, Hà Nội',
                latitude: 21.0285,
                longitude: 105.8542,
                radius: 100,
                isActive: true,
                description: 'Văn phòng chính tại Hà Nội',
            },
            {
                name: 'Chi nhánh TP.HCM',
                address: '456 Nguyễn Huệ, Quận 1, TP.HCM',
                latitude: 10.7769,
                longitude: 106.7009,
                radius: 150,
                isActive: true,
                description: 'Chi nhánh tại Thành phố Hồ Chí Minh',
            },
            {
                name: 'Văn phòng Đà Nẵng',
                address: '789 Đường Bạch Đằng, Hải Châu, Đà Nẵng',
                latitude: 16.0544,
                longitude: 108.2022,
                radius: 80,
                isActive: true,
                description: 'Văn phòng tại Đà Nẵng',
            },
            {
                name: 'Văn phòng Cần Thơ',
                address: '321 Đường Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ',
                latitude: 10.0452,
                longitude: 105.7469,
                radius: 100,
                isActive: true,
                description: 'Văn phòng tại Cần Thơ',
            },
            {
                name: 'Văn phòng Hải Phòng',
                address: '654 Đường Lạch Tray, Ngô Quyền, Hải Phòng',
                latitude: 20.8449,
                longitude: 106.6881,
                radius: 90,
                isActive: true,
                description: 'Văn phòng tại Hải Phòng',
            },
        ]);
        console.log(`✅ Created ${locations.length} locations\n`);

        // ========== 2.5. TẠO BRANCHES (Chi nhánh) ==========
        console.log('🏢 Creating branches...');
        const branches = await BranchModel.insertMany([
            {
                name: 'Trụ sở chính Hà Nội',
                code: 'HQ',
                address: '123 Đường Láng, Đống Đa, Hà Nội',
                latitude: 21.0285,
                longitude: 105.8542,
                city: 'Hà Nội',
                country: 'Việt Nam',
                phone: '0241234567',
                email: 'hq@smartattendance.com',
                managerId: null, // Sẽ gán sau khi tạo users
                establishedDate: new Date('2020-01-01'),
                status: 'active',
                timezone: 'GMT+7',
            },
            {
                name: 'Chi nhánh TP.HCM',
                code: 'HCM',
                address: '456 Nguyễn Huệ, Quận 1, TP.HCM',
                latitude: 10.7769,
                longitude: 106.7009,
                city: 'TP.HCM',
                country: 'Việt Nam',
                phone: '0281234567',
                email: 'hcm@smartattendance.com',
                managerId: null,
                establishedDate: new Date('2021-06-01'),
                status: 'active',
                timezone: 'GMT+7',
            },
            {
                name: 'Chi nhánh Đà Nẵng',
                code: 'DN',
                address: '789 Đường Bạch Đằng, Hải Châu, Đà Nẵng',
                latitude: 16.0544,
                longitude: 108.2022,
                city: 'Đà Nẵng',
                country: 'Việt Nam',
                phone: '0236123456',
                email: 'danang@smartattendance.com',
                managerId: null,
                establishedDate: new Date('2022-03-01'),
                status: 'active',
                timezone: 'GMT+7',
            },
            {
                name: 'Chi nhánh Cần Thơ',
                code: 'CT',
                address: '321 Đường Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ',
                latitude: 10.0452,
                longitude: 105.7469,
                city: 'Cần Thơ',
                country: 'Việt Nam',
                phone: '0292123456',
                email: 'cantho@smartattendance.com',
                managerId: null,
                establishedDate: new Date('2022-08-01'),
                status: 'active',
                timezone: 'GMT+7',
            },
            {
                name: 'Chi nhánh Hải Phòng',
                code: 'HP',
                address: '654 Đường Lạch Tray, Ngô Quyền, Hải Phòng',
                latitude: 20.8449,
                longitude: 106.6881,
                city: 'Hải Phòng',
                country: 'Việt Nam',
                phone: '0225123456',
                email: 'haiphong@smartattendance.com',
                managerId: null,
                establishedDate: new Date('2023-01-01'),
                status: 'active',
                timezone: 'GMT+7',
            },
        ]);
        console.log(`✅ Created ${branches.length} branches\n`);

        // ========== 2.6. TẠO DEPARTMENTS (Phòng ban) ==========
        console.log('📁 Creating departments...');
        const departments = await DepartmentModel.insertMany([
            {
                name: 'Phòng Phát triển',
                code: 'DEV',
                description: 'Phòng ban phát triển phần mềm và công nghệ',
                branchId: branches[0]._id, // HQ
                managerId: null, // Sẽ gán sau
                budget: 5000000000,
                status: 'active',
            },
            {
                name: 'Phòng Thiết kế',
                code: 'DESIGN',
                description: 'Phòng ban thiết kế UI/UX và sáng tạo',
                branchId: branches[0]._id,
                managerId: null,
                budget: 2000000000,
                status: 'active',
            },
            {
                name: 'Phòng Marketing',
                code: 'MKT',
                description: 'Phòng ban marketing và truyền thông',
                branchId: branches[0]._id,
                managerId: null,
                budget: 3000000000,
                status: 'active',
            },
            {
                name: 'Phòng Kinh doanh',
                code: 'SALES',
                description: 'Phòng ban kinh doanh và bán hàng',
                branchId: branches[1]._id, // HCM
                managerId: null,
                budget: 4000000000,
                status: 'active',
            },
            {
                name: 'Phòng Nhân sự',
                code: 'HR',
                description: 'Phòng ban quản lý nhân sự',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1500000000,
                status: 'active',
            },
            {
                name: 'Phòng Tài chính',
                code: 'FINANCE',
                description: 'Phòng ban tài chính và kế toán',
                branchId: branches[0]._id,
                managerId: null,
                budget: 2500000000,
                status: 'active',
            },
            {
                name: 'Phòng Vận hành',
                code: 'OPS',
                description: 'Phòng ban vận hành và quản lý hệ thống',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1800000000,
                status: 'active',
            },
            {
                name: 'Phòng Hỗ trợ',
                code: 'SUPPORT',
                description: 'Phòng ban hỗ trợ khách hàng',
                branchId: branches[1]._id,
                managerId: null,
                budget: 1200000000,
                status: 'active',
            },
            {
                name: 'Phòng QA',
                code: 'QA',
                description: 'Phòng ban kiểm thử chất lượng',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1500000000,
                status: 'active',
            },
            {
                name: 'Phòng Sản phẩm',
                code: 'PRODUCT',
                description: 'Phòng ban quản lý sản phẩm',
                branchId: branches[0]._id,
                managerId: null,
                budget: 2200000000,
                status: 'active',
            },
        ]);
        console.log(`✅ Created ${departments.length} departments\n`);

        // ========== 3. TẠO USERS (Người dùng) - 150 users ==========
        console.log('👥 Creating users...');
        const hashedPassword = await hashPassword('password123');

        const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh'];
        const lastNames = ['Văn', 'Thị', 'Minh', 'Hồng', 'Anh', 'Linh', 'Dũng', 'Hùng', 'Lan', 'Hương', 'Tuấn', 'Hải', 'Nam', 'Phương', 'Quang'];
        const middleNames = ['Văn', 'Thị', 'Minh', 'Hồng', 'Anh', 'Linh', 'Dũng', 'Hùng', 'Lan', 'Hương'];

        const users = [];

        // Super Admin, Admin, HR Manager, Manager
        users.push({
            email: 'superadmin@smartattendance.com',
            password: hashedPassword,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            phone: '0900000000',
            department: null, // Super Admin không thuộc phòng ban cụ thể
            branch: branches[0]._id, // HQ
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'admin@smartattendance.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
            phone: '0901234567',
            department: departments.find(d => d.code === 'DEV')._id,
            branch: branches[0]._id, // HQ
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'hr@smartattendance.com',
            password: hashedPassword,
            name: 'HR Manager',
            role: 'HR_MANAGER',
            phone: '0901234568',
            department: departments.find(d => d.code === 'HR')._id,
            branch: branches[0]._id, // HQ
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'manager@smartattendance.com',
            password: hashedPassword,
            name: 'Manager',
            role: 'MANAGER',
            phone: '0901234569',
            department: departments.find(d => d.code === 'PRODUCT')._id,
            branch: branches[0]._id, // HQ
            isVerified: true,
            isActive: true,
        });

        // Tạo 146 employees (tổng 150 users: 4 admins/managers + 146 employees)
        // Map để track số lần xuất hiện của mỗi lastName (để thêm số thứ tự nếu trùng)
        const lastNameCountMap = new Map();
        // Set để track các tên đầy đủ đã tạo (để hạn chế trùng tên)
        const usedFullNames = new Set();

        for (let i = 1; i <= 180; i++) {
            let firstName, middleName, lastName, name;
            let attempts = 0;
            const maxAttempts = 50; // Giới hạn số lần thử để tránh vòng lặp vô hạn

            // Tạo tên mới cho đến khi không trùng hoặc đạt max attempts
            do {
                firstName = firstNames[randomInt(0, firstNames.length - 1)];
                middleName = middleNames[randomInt(0, middleNames.length - 1)];
                lastName = lastNames[randomInt(0, lastNames.length - 1)];

                // Kiểm tra xem lastName này đã xuất hiện chưa
                let finalLastName = lastName;
                if (lastNameCountMap.has(lastName)) {
                    // Nếu lastName trùng, tăng số đếm và thêm số thứ tự vào sau lastName
                    const count = lastNameCountMap.get(lastName) + 1;
                    lastNameCountMap.set(lastName, count);
                    finalLastName = `${lastName} ${count}`;
                } else {
                    // Nếu không trùng, đánh dấu là đã xuất hiện lần đầu
                    lastNameCountMap.set(lastName, 0);
                }

                // Tên đầy đủ: firstName + middleName + lastName (có thể có số thứ tự)
                name = `${firstName} ${middleName} ${finalLastName}`;
                attempts++;
            } while (usedFullNames.has(name) && attempts < maxAttempts);

            // Đánh dấu tên này đã được sử dụng
            usedFullNames.add(name);

            const selectedDepartment = departments[randomInt(0, departments.length - 1)];
            const selectedBranch = branches[randomInt(0, branches.length - 1)]._id;
            // Phone number format: 090xxxxxxx (7 số cuối)
            const phoneNumber = String(1000000 + i - 1).slice(-7);
            const phone = `090${phoneNumber}`;

            users.push({
                email: `employee${i}@smartattendance.com`,
                password: hashedPassword,
                name: name,
                role: 'EMPLOYEE',
                phone: phone,
                department: selectedDepartment._id,
                branch: selectedBranch,
                isVerified: true,
                isActive: Math.random() > 0.1, // 90% active
            });
        }

        const createdUsers = await UserModel.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users\n`);

        // Gán managerId cho branches và departments
        const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
        const hrUser = createdUsers.find((u) => u.role === 'HR_MANAGER');
        const managerUser = createdUsers.find((u) => u.role === 'MANAGER');
        const employeeUsers = createdUsers.filter((u) => u.role === 'EMPLOYEE');

        // Gán giám đốc chi nhánh
        await BranchModel.findByIdAndUpdate(branches[0]._id, { managerId: adminUser._id }); // HQ
        await BranchModel.findByIdAndUpdate(branches[1]._id, { managerId: managerUser._id }); // HCM

        // Gán trưởng phòng
        await DepartmentModel.findByIdAndUpdate(departments.find(d => d.code === 'DEV')._id, { managerId: adminUser._id });
        await DepartmentModel.findByIdAndUpdate(departments.find(d => d.code === 'HR')._id, { managerId: hrUser._id });
        await DepartmentModel.findByIdAndUpdate(departments.find(d => d.code === 'PRODUCT')._id, { managerId: managerUser._id });
        console.log('✅ Assigned managers to branches and departments\n');

        // ========== 3.5. GÁN DEFAULT SHIFT VÀ TẠO EMPLOYEE SHIFT ASSIGNMENTS ==========
        console.log('📋 Assigning default shifts and creating shift assignments...');
        const defaultShift = shifts[0]; // Full time shift

        // Gán defaultShiftId cho tất cả employees
        await UserModel.updateMany(
            { role: 'EMPLOYEE', isActive: true },
            { defaultShiftId: defaultShift._id }
        );
        console.log(`✅ Assigned default shift "${defaultShift.name}" to all employees\n`);

        // Tạo EmployeeShiftAssignment records cho tất cả employees
        const assignments = employeeUsers.map(employee => ({
            userId: employee._id,
            shiftId: defaultShift._id,
            pattern: 'all',
            effectiveFrom: employee.createdAt || new Date(),
            effectiveTo: null,
            priority: 1,
            isActive: true,
            notes: 'Default shift assignment from seed',
        }));

        const createdAssignments = await EmployeeShiftAssignmentModel.insertMany(assignments);
        console.log(`✅ Created ${createdAssignments.length} employee shift assignments\n`);

        // ========== 4. TẠO ATTENDANCES (Chấm công) - 6 tháng ==========
        console.log('⏰ Creating attendances...');
        // Đảm bảo có data từ tháng 12/2025 (tháng hiện tại) và các tháng gần đây
        // Base date: cuối tháng 12/2025 để đảm bảo luôn có data tháng 12/2025
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Đảm bảo luôn có data tháng 12/2025: đặt base date là cuối tháng 12/2025
        const december2025 = new Date(2025, 11, 31); // Tháng 12/2025 (index 11 = tháng 12)
        december2025.setHours(0, 0, 0, 0);
        
        // Sử dụng ngày cuối tháng 12/2025 làm base date để đảm bảo có data tháng 12/2025
        // Nếu hiện tại đã qua 31/12/2025, dùng today; nếu không dùng 31/12/2025
        const seedBaseDate = today > december2025 ? today : december2025;

        const attendances = [];
        const monthsToGenerate = 6; // 6 tháng (bao gồm tháng 12)
        const daysPerMonth = 22; // ~22 ngày làm việc/tháng (trừ cuối tuần)

        for (let monthOffset = 0; monthOffset < monthsToGenerate; monthOffset++) {
            const monthDate = new Date(seedBaseDate);
            monthDate.setMonth(monthDate.getMonth() - monthOffset);
            monthDate.setDate(1); // Bắt đầu từ ngày 1

            for (let day = 1; day <= daysPerMonth; day++) {
                const date = new Date(monthDate);
                date.setDate(day);

                // Bỏ qua cuối tuần (0 = CN, 6 = T7)
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;

                // Một số nhân viên có thể nghỉ (10% chance)
                for (const employee of employeeUsers) {
                    if (Math.random() < 0.1) continue; // 10% nghỉ

                    // Random check-in time: 7:30 - 9:00
                    const checkInHour = randomInt(7, 8);
                    const checkInMinute = checkInHour === 7 ? randomInt(30, 59) : randomInt(0, 30);
                    const checkIn = new Date(date);
                    checkIn.setHours(checkInHour, checkInMinute, 0, 0);

                    // Random check-out time: 17:00 - 19:00
                    const checkOutHour = randomInt(17, 18);
                    const checkOutMinute = randomInt(0, 59);
                    const checkOut = new Date(date);
                    checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);

                    const location = locations.find((loc) => loc._id.equals(employee.branch));

                    // Tính status
                    let status = 'present';
                    const lateTime = new Date(date);
                    lateTime.setHours(8, 30, 0, 0);
                    if (checkIn > lateTime) {
                        status = 'late';
                    }

                    attendances.push({
                        userId: employee._id,
                        date: date,
                        checkIn: checkIn,
                        checkOut: checkOut,
                        status: status,
                        locationId: location?._id,
                    });
                }
            }
        }

        const createdAttendances = await AttendanceModel.insertMany(attendances);
        console.log(`✅ Created ${createdAttendances.length} attendance records\n`);

        // ========== 5. TẠO REQUESTS (Yêu cầu) - 25 requests ==========
        console.log('📝 Creating requests...');
        const requestTypeValues = ['leave', 'overtime', 'remote', 'other'];
        const requestStatuses = ['pending', 'approved', 'rejected'];
        const reasons = [
            'Nghỉ phép năm',
            'Nghỉ ốm',
            'Nghỉ việc gia đình',
            'Làm thêm giờ dự án gấp',
            'Làm việc từ xa',
            'Đi công tác',
            'Nghỉ lễ',
            'Nghỉ không lương',
            'Nghỉ thai sản',
            'Làm thêm cuối tuần',
        ];

        const requests = [];
        for (let i = 0; i < 150; i++) {
            const employee = employeeUsers[randomInt(0, employeeUsers.length - 1)];
            const type = requestTypeValues[randomInt(0, requestTypeValues.length - 1)];
            const status = requestStatuses[randomInt(0, requestStatuses.length - 1)];

            const startDate = new Date(seedBaseDate);
            startDate.setDate(startDate.getDate() - randomInt(1, 180)); // Tăng lên 180 ngày (6 tháng)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + randomInt(0, 5));

            const request = {
                userId: employee._id,
                type: type,
                startDate: startDate,
                endDate: endDate,
                reason: reasons[randomInt(0, reasons.length - 1)],
                status: status,
            };

            if (status === 'approved') {
                request.approvedBy = Math.random() > 0.5 ? adminUser._id : hrUser._id;
                request.approvedAt = new Date(startDate);
                request.approvedAt.setDate(request.approvedAt.getDate() - 1);
            } else if (status === 'rejected') {
                request.rejectionReason = 'Không đủ lý do chính đáng hoặc không phù hợp với quy định công ty';
            }

            requests.push(request);
        }

        const createdRequests = await RequestModel.insertMany(requests);
        console.log(`✅ Created ${createdRequests.length} requests\n`);

        // ========== 5.5. TẠO NOTIFICATIONS (Thông báo) ==========
        console.log('🔔 Creating notifications...');
        const notifications = [];

        // Tạo notifications cho các requests đã được approve/reject
        for (const request of createdRequests) {
            if (request.status === 'approved' && request.approvedBy) {
                const approvedDate = request.approvedAt || new Date(request.createdAt);
                approvedDate.setHours(approvedDate.getHours() + 1);

                notifications.push({
                    userId: request.userId,
                    type: 'request_approved',
                    title: 'Yêu cầu đã được duyệt',
                    message: `Yêu cầu ${request.type === 'leave' ? 'nghỉ phép' : request.type === 'overtime' ? 'tăng ca' : 'làm từ xa'} của bạn đã được duyệt.`,
                    relatedEntityType: 'request',
                    relatedEntityId: request._id,
                    isRead: Math.random() > 0.7, // 30% đã đọc
                    readAt: Math.random() > 0.7 ? new Date(approvedDate.getTime() + 3600000) : null,
                    createdAt: approvedDate,
                });
            } else if (request.status === 'rejected' && request.approvedBy) {
                const rejectedDate = request.approvedAt || new Date(request.createdAt);
                rejectedDate.setHours(rejectedDate.getHours() + 1);

                notifications.push({
                    userId: request.userId,
                    type: 'request_rejected',
                    title: 'Yêu cầu đã bị từ chối',
                    message: `Yêu cầu ${request.type === 'leave' ? 'nghỉ phép' : request.type === 'overtime' ? 'tăng ca' : 'làm từ xa'} của bạn đã bị từ chối.`,
                    relatedEntityType: 'request',
                    relatedEntityId: request._id,
                    isRead: Math.random() > 0.6, // 40% đã đọc
                    readAt: Math.random() > 0.6 ? new Date(rejectedDate.getTime() + 3600000) : null,
                    createdAt: rejectedDate,
                });
            }
        }

        // Tạo một số system notifications
        for (let i = 0; i < 50; i++) {
            const employee = employeeUsers[randomInt(0, employeeUsers.length - 1)];
            const notificationDate = new Date(seedBaseDate);
            notificationDate.setDate(notificationDate.getDate() - randomInt(1, 90)); // Tăng lên 90 ngày

            const systemMessages = [
                'Hệ thống sẽ bảo trì vào cuối tuần này',
                'Đã có bản cập nhật mới cho ứng dụng',
                'Nhắc nhở: Vui lòng cập nhật thông tin cá nhân',
                'Lịch làm việc tuần tới đã được cập nhật',
                'Nhắc nhở: Nộp báo cáo tuần trước 17:00 thứ 6',
            ];

            notifications.push({
                userId: employee._id,
                type: 'system',
                title: 'Thông báo hệ thống',
                message: systemMessages[randomInt(0, systemMessages.length - 1)],
                relatedEntityType: 'other',
                isRead: Math.random() > 0.5, // 50% đã đọc
                readAt: Math.random() > 0.5 ? new Date(notificationDate.getTime() + 1800000) : null,
                createdAt: notificationDate,
            });
        }

        const createdNotifications = await NotificationModel.insertMany(notifications);
        console.log(`✅ Created ${createdNotifications.length} notifications\n`);

        // ========== 6. TẠO REPORTS (Báo cáo) - Weekly & Monthly ==========
        console.log('📊 Creating reports...');
        const reports = [];

        // Weekly reports cho 24 tuần gần nhất (bao gồm tháng 12)
        for (let weekOffset = 0; weekOffset < 24; weekOffset++) {
            const weekStart = new Date(seedBaseDate);
            weekStart.setDate(weekStart.getDate() - (weekOffset * 7) - 6);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Thứ 2
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 4); // Thứ 6

            for (const employee of employeeUsers.slice(0, 15)) { // 15 nhân viên đầu
                const weekAttendances = createdAttendances.filter(
                    (a) => a.userId.equals(employee._id) && a.date >= weekStart && a.date <= weekEnd
                );

                if (weekAttendances.length === 0) continue;

                const presentDays = weekAttendances.filter((a) => a.status === 'present' || a.status === 'late').length;
                const lateDays = weekAttendances.filter((a) => a.status === 'late').length;
                const totalHours = weekAttendances.reduce((sum, a) => sum + (a.workHours || 0), 0);

                reports.push({
                    userId: employee._id,
                    type: 'weekly',
                    startDate: weekStart,
                    endDate: weekEnd,
                    totalDays: 5,
                    presentDays: presentDays,
                    absentDays: 5 - presentDays,
                    lateDays: lateDays,
                    totalHours: Math.round(totalHours * 100) / 100,
                    dailySummary: weekAttendances.map((a) => ({
                        date: a.date,
                        checkIn: a.checkIn,
                        checkOut: a.checkOut,
                        status: a.status,
                        workHours: a.workHours || 0,
                    })),
                });
            }
        }

        // Monthly reports cho 6 tháng gần nhất (bao gồm tháng 12)
        for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
            const monthStart = new Date(seedBaseDate);
            monthStart.setMonth(monthStart.getMonth() - monthOffset);
            monthStart.setDate(1);
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setDate(0); // Ngày cuối tháng

            for (const employee of employeeUsers.slice(0, 20)) { // 20 nhân viên đầu
                const monthAttendances = createdAttendances.filter(
                    (a) => a.userId.equals(employee._id) && a.date >= monthStart && a.date <= monthEnd
                );

                if (monthAttendances.length === 0) continue;

                const presentDays = monthAttendances.filter((a) => a.status === 'present' || a.status === 'late').length;
                const lateDays = monthAttendances.filter((a) => a.status === 'late').length;
                const totalHours = monthAttendances.reduce((sum, a) => sum + (a.workHours || 0), 0);
                const totalWorkingDays = 22; // ~22 ngày làm việc/tháng

                reports.push({
                    userId: employee._id,
                    type: 'monthly',
                    startDate: monthStart,
                    endDate: monthEnd,
                    totalDays: totalWorkingDays,
                    presentDays: presentDays,
                    absentDays: totalWorkingDays - presentDays,
                    lateDays: lateDays,
                    totalHours: Math.round(totalHours * 100) / 100,
                    dailySummary: monthAttendances.map((a) => ({
                        date: a.date,
                        checkIn: a.checkIn,
                        checkOut: a.checkOut,
                        status: a.status,
                        workHours: a.workHours || 0,
                    })),
                });
            }
        }

        const createdReports = await ReportModel.insertMany(reports);
        console.log(`✅ Created ${createdReports.length} reports\n`);


        // ========== 7. TẠO LOGS (Nhật ký) - Cho tất cả activities ==========
        console.log('📜 Creating logs...');
        const logs = [];
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Android 11; Mobile) AppleWebKit/537.36',
        ];
        const ipAddresses = ['192.168.1.', '10.0.0.', '172.16.0.'];

        // Logs cho tất cả check-in/check-out
        for (const attendance of createdAttendances) {
            const ip = ipAddresses[randomInt(0, ipAddresses.length - 1)] + randomInt(100, 255);
            const userAgent = userAgents[randomInt(0, userAgents.length - 1)];

            logs.push({
                userId: attendance.userId,
                action: 'checkin',
                entityType: 'attendance',
                entityId: attendance._id,
                ipAddress: ip,
                userAgent: userAgent,
                details: {
                    locationId: attendance.locationId?.toString(),
                    checkInTime: attendance.checkIn,
                },
                status: 'success',
                createdAt: attendance.checkIn,
            });

            if (attendance.checkOut) {
                logs.push({
                    userId: attendance.userId,
                    action: 'checkout',
                    entityType: 'attendance',
                    entityId: attendance._id,
                    ipAddress: ip,
                    userAgent: userAgent,
                    details: {
                        workHours: attendance.workHours,
                        checkOutTime: attendance.checkOut,
                    },
                    status: 'success',
                    createdAt: attendance.checkOut,
                });
            }
        }

        // Logs cho tất cả requests
        for (const request of createdRequests) {
            const ip = ipAddresses[randomInt(0, ipAddresses.length - 1)] + randomInt(100, 255);
            const userAgent = userAgents[randomInt(0, userAgents.length - 1)];

            logs.push({
                userId: request.userId,
                action: 'create_request',
                entityType: 'request',
                entityId: request._id,
                ipAddress: ip,
                userAgent: userAgent,
                details: {
                    type: request.type,
                    status: request.status,
                },
                status: 'success',
                createdAt: request.createdAt,
            });

            if (request.status === 'approved' && request.approvedBy) {
                logs.push({
                    userId: request.approvedBy,
                    action: 'approve_request',
                    entityType: 'request',
                    entityId: request._id,
                    ipAddress: ip,
                    userAgent: userAgent,
                    details: {
                        approvedFor: request.userId.toString(),
                    },
                    status: 'success',
                    createdAt: request.approvedAt,
                });
            } else if (request.status === 'rejected' && request.approvedBy) {
                logs.push({
                    userId: request.approvedBy,
                    action: 'reject_request',
                    entityType: 'request',
                    entityId: request._id,
                    ipAddress: ip,
                    userAgent: userAgent,
                    details: {
                        rejectedFor: request.userId.toString(),
                        reason: request.rejectionReason,
                    },
                    status: 'success',
                    createdAt: request.approvedAt,
                });
            }
        }

        // Logs cho login (mỗi user login 5-10 lần)
        for (const user of createdUsers) {
            const loginCount = randomInt(5, 10);
            for (let i = 0; i < loginCount; i++) {
                const loginDate = new Date(today);
                loginDate.setDate(loginDate.getDate() - randomInt(0, 30));
                loginDate.setHours(randomInt(7, 9), randomInt(0, 59), 0, 0);

                const ip = ipAddresses[randomInt(0, ipAddresses.length - 1)] + randomInt(100, 255);
                const userAgent = userAgents[randomInt(0, userAgents.length - 1)];

                logs.push({
                    userId: user._id,
                    action: 'login',
                    entityType: 'user',
                    entityId: user._id,
                    ipAddress: ip,
                    userAgent: userAgent,
                    status: 'success',
                    createdAt: loginDate,
                });
            }
        }

        // Một số failed logs (5%)
        const failedLogsCount = Math.floor(logs.length * 0.05);
        for (let i = 0; i < failedLogsCount; i++) {
            const randomLog = logs[randomInt(0, logs.length - 1)];
            randomLog.status = 'failed';
            randomLog.errorMessage = 'Connection timeout hoặc lỗi hệ thống';
        }

        const createdLogs = await LogModel.insertMany(logs);
        console.log(`✅ Created ${createdLogs.length} logs\n`);

        // ========== 8. TẠO PAYROLL RECORDS (Bảng lương chi tiết) ==========
        console.log('💰 Creating payroll records...');
        const payrollRecords = [];
        const positions = ['Senior Developer', 'Frontend Developer', 'Backend Developer', 'Marketing Manager', 'HR Specialist', 'Designer', 'QA Engineer', 'Product Manager'];

        // Tạo payroll records cho 6 tháng gần nhất
        // Tạo payroll cho 6 tháng gần nhất (bao gồm tháng 12)
        for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
            const monthDate = new Date(seedBaseDate);
            monthDate.setMonth(monthDate.getMonth() - monthOffset);
            const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

            const periodStart = new Date(monthDate);
            periodStart.setDate(1);
            const periodEnd = new Date(monthDate);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            periodEnd.setDate(0); // Ngày cuối tháng

            // Tạo payroll cho mỗi employee
            for (const employee of employeeUsers) { // Tất cả nhân viên
                const monthAttendances = createdAttendances.filter(
                    (a) => a.userId.equals(employee._id) &&
                        a.date >= periodStart && a.date <= periodEnd
                );

                if (monthAttendances.length === 0) continue;

                const workDays = monthAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
                const lateDays = monthAttendances.filter(a => a.status === 'late').length;
                const totalDays = 22; // ~22 ngày làm việc/tháng
                const leaveDays = totalDays - workDays;

                // Tính overtime hours từ attendance
                const overtimeHours = monthAttendances.reduce((sum, a) => {
                    if (a.workHours > 8) return sum + (a.workHours - 8);
                    return sum;
                }, 0);

                // Base salary theo department và vị trí
                const dept = departments.find(d => d._id.equals(employee.department));
                let baseSalary = 15000000; // Default
                if (dept?.code === 'DEV') baseSalary = 20000000 + randomInt(0, 10000000);
                else if (dept?.code === 'DESIGN') baseSalary = 18000000 + randomInt(0, 8000000);
                else if (dept?.code === 'MKT') baseSalary = 16000000 + randomInt(0, 9000000);
                else if (dept?.code === 'SALES') baseSalary = 17000000 + randomInt(0, 10000000);
                else baseSalary = 15000000 + randomInt(0, 5000000);

                const overtimePay = Math.round(overtimeHours * (baseSalary / (22 * 8)) * 1.5);
                const bonus = Math.random() > 0.7 ? randomInt(2000000, 5000000) : 0;
                const deductions = lateDays * 200000 + (Math.random() > 0.8 ? randomInt(100000, 500000) : 0);
                const totalSalary = baseSalary + overtimePay + bonus - deductions;

                const statuses = ['pending', 'approved', 'paid'];
                const status = statuses[randomInt(0, 2)];

                const payrollRecord = {
                    userId: employee._id,
                    month: monthStr,
                    periodStart: periodStart,
                    periodEnd: periodEnd,
                    workDays: workDays,
                    totalDays: totalDays,
                    overtimeHours: Math.round(overtimeHours * 10) / 10,
                    leaveDays: leaveDays,
                    lateDays: lateDays,
                    baseSalary: baseSalary,
                    overtimePay: overtimePay,
                    bonus: bonus,
                    deductions: deductions,
                    totalSalary: totalSalary,
                    status: status,
                    department: dept?.name || 'N/A',
                    position: positions[randomInt(0, positions.length - 1)],
                    employeeId: `EMP${String(createdUsers.indexOf(employee) + 1).padStart(3, '0')}`,
                };

                if (status === 'approved' || status === 'paid') {
                    payrollRecord.approvedBy = Math.random() > 0.5 ? adminUser._id : hrUser._id;
                    payrollRecord.approvedAt = new Date(periodEnd);
                    payrollRecord.approvedAt.setDate(payrollRecord.approvedAt.getDate() + 2);
                }

                if (status === 'paid') {
                    payrollRecord.paidAt = new Date(payrollRecord.approvedAt);
                    payrollRecord.paidAt.setDate(payrollRecord.paidAt.getDate() + randomInt(1, 5));
                }

                payrollRecords.push(payrollRecord);
            }
        }

        const createdPayrollRecords = await PayrollRecordModel.insertMany(payrollRecords);
        console.log(`✅ Created ${createdPayrollRecords.length} payroll records\n`);

        // ========== 9. TẠO PERFORMANCE REVIEWS (Đánh giá hiệu suất) ==========
        console.log('⭐ Creating performance reviews...');
        const performanceReviews = [];
        const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'];

        // Tạo reviews cho nhiều nhân viên hơn
        for (let i = 0; i < 150; i++) {
            const employee = employeeUsers[randomInt(0, employeeUsers.length - 1)];
            const reviewer = Math.random() > 0.5 ? adminUser : (Math.random() > 0.5 ? hrUser : managerUser);
            const period = periods[randomInt(0, periods.length - 1)];
            const status = Math.random() > 0.3 ? 'completed' : (Math.random() > 0.5 ? 'pending' : 'draft');

            const technical = randomInt(70, 95);
            const communication = randomInt(75, 95);
            const teamwork = randomInt(80, 95);
            const leadership = randomInt(60, 90);
            const problemSolving = randomInt(75, 95);

            const achievements = [
                'Hoàn thành xuất sắc các task được giao',
                'Đóng góp tích cực cho team',
                'Cải thiện đáng kể kỹ năng chuyên môn',
            ].slice(0, randomInt(1, 3));

            const improvements = [
                'Cần cải thiện kỹ năng giao tiếp',
                'Nên tham gia nhiều hơn các hoạt động team',
            ].slice(0, randomInt(0, 2));

            const review = {
                employeeId: employee._id,
                reviewerId: reviewer._id,
                period: period,
                reviewDate: (() => {
                    const d = new Date(today);
                    d.setDate(d.getDate() - randomInt(1, 180));
                    return d;
                })(),
                categories: {
                    technical: technical,
                    communication: communication,
                    teamwork: teamwork,
                    leadership: leadership,
                    problemSolving: problemSolving,
                },
                achievements: achievements,
                improvements: improvements,
                comments: 'Nhân viên có tiềm năng phát triển tốt, cần tiếp tục nỗ lực.',
                status: status,
            };

            if (status === 'completed') {
                review.completedAt = new Date(review.reviewDate);
                review.completedAt.setDate(review.completedAt.getDate() + randomInt(1, 7));
            }

            performanceReviews.push(review);
        }

        const createdPerformanceReviews = await PerformanceReviewModel.insertMany(performanceReviews);
        console.log(`✅ Created ${createdPerformanceReviews.length} performance reviews\n`);

        // ========== 10. TẠO CALENDAR EVENTS (Sự kiện công ty) ==========
        console.log('📅 Creating calendar events...');
        const calendarEvents = [];

        const eventTypes = ['holiday', 'meeting', 'event', 'deadline', 'training'];
        const eventTitles = [
            'Họp tổng kết quý 4',
            'Ngày lễ Nhà giáo Việt Nam',
            'Deadline dự án ABC',
            'Team Building',
            'Đào tạo React Advanced',
            'Sinh nhật công ty',
            'Họp giao ban tuần',
            'Ngày Quốc khánh',
            'Hội thảo công nghệ',
            'Training Python',
        ];

        // Tạo events cho 6 tháng (3 tháng trước và 3 tháng tới)
        // Calendar events cho 6 tháng (3 tháng trước + 3 tháng sau từ seedBaseDate)
        for (let monthOffset = -3; monthOffset < 3; monthOffset++) {
            const monthDate = new Date(seedBaseDate);
            monthDate.setMonth(monthDate.getMonth() + monthOffset);

            // Tạo 5-8 events mỗi tháng
            for (let i = 0; i < randomInt(5, 8); i++) {
                const eventDate = new Date(monthDate);
                eventDate.setDate(randomInt(1, 28));

                const title = eventTitles[randomInt(0, eventTitles.length - 1)];
                const type = eventTypes[randomInt(0, eventTypes.length - 1)];
                const isAllDay = type === 'holiday' || Math.random() > 0.7;

                const startHour = randomInt(8, 14);
                const startMinute = randomInt(0, 1) * 30;
                const endHour = randomInt(15, 18);
                const endMinute = randomInt(0, 1) * 30;

                const event = {
                    title: title,
                    description: `Mô tả chi tiết cho sự kiện: ${title}`,
                    date: eventDate,
                    startTime: isAllDay ? '00:00' : `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
                    endTime: isAllDay ? '23:59' : `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
                    isAllDay: isAllDay,
                    type: type,
                    location: type === 'meeting' ? 'Phòng họp tầng 3' : (type === 'training' ? 'Phòng đào tạo' : undefined),
                    attendeeCount: type === 'meeting' ? randomInt(10, 50) : (type === 'event' ? randomInt(50, 200) : 0),
                    color: type === 'holiday' ? '#EF4444' : type === 'meeting' ? '#3B82F6' : type === 'event' ? '#10B981' : type === 'deadline' ? '#F59E0B' : '#8B5CF6',
                    visibility: 'public',
                    createdBy: Math.random() > 0.5 ? adminUser._id : hrUser._id,
                    isActive: true,
                };

                if (type === 'meeting' && event.attendeeCount > 0) {
                    const numAttendees = Math.min(event.attendeeCount, 10);
                    event.attendees = employeeUsers.slice(0, numAttendees).map(u => u._id);
                }

                calendarEvents.push(event);
            }
        }

        const createdCalendarEvents = await CalendarEventModel.insertMany(calendarEvents);
        console.log(`✅ Created ${createdCalendarEvents.length} calendar events\n`);

        // ========== 11. TẠO EMPLOYEE SCHEDULES (Lịch làm việc) ==========
        console.log('📋 Creating employee schedules...');
        const employeeSchedules = [];
        const scheduleStatuses = ['scheduled', 'completed', 'missed', 'off'];

        // Tạo schedule cho 3 tháng (90 ngày - từ 2 tháng trước đến 1 tháng sau seedBaseDate)
        for (let dayOffset = -60; dayOffset < 30; dayOffset++) {
            const scheduleDate = new Date(seedBaseDate);
            scheduleDate.setDate(scheduleDate.getDate() + dayOffset);

            // Bỏ qua cuối tuần
            const dayOfWeek = scheduleDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Vẫn tạo schedule nhưng status = 'off'
                for (const employee of employeeUsers) {
                    employeeSchedules.push({
                        userId: employee._id,
                        date: new Date(scheduleDate),
                        shiftId: shifts[0]._id,
                        shiftName: shifts[0].name,
                        startTime: shifts[0].startTime,
                        endTime: shifts[0].endTime,
                        status: 'off',
                        location: locations[0].name,
                    });
                }
                continue;
            }

            // Tạo schedule cho tất cả employees
            for (const employee of employeeUsers) {
                if (Math.random() < 0.05) continue; // 5% nghỉ

                const shift = shifts[0]; // Full time shift
                const status = scheduleDate < seedBaseDate ? (Math.random() > 0.1 ? 'completed' : 'missed') : 'scheduled';

                const schedule = {
                    userId: employee._id,
                    date: new Date(scheduleDate),
                    shiftId: shift._id,
                    shiftName: shift.name,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    status: status,
                    location: locations.find(loc => employee.branch?.toString() === loc._id.toString())?.name || locations[0].name,
                };

                // Liên kết với attendance nếu đã completed
                if (status === 'completed' && scheduleDate < seedBaseDate) {
                    const attendance = createdAttendances.find(
                        a => a.userId.equals(employee._id) &&
                            a.date.toDateString() === scheduleDate.toDateString()
                    );
                    if (attendance) {
                        schedule.attendanceId = attendance._id;
                    }
                }

                employeeSchedules.push(schedule);
            }
        }

        const createdEmployeeSchedules = await EmployeeScheduleModel.insertMany(employeeSchedules);
        console.log(`✅ Created ${createdEmployeeSchedules.length} employee schedules\n`);

        // ========== 12. TẠO SYSTEM CONFIGS (Cấu hình hệ thống) ==========
        console.log('⚙️  Creating system configs...');
        const systemConfigs = [
            {
                key: 'ATTENDANCE_LATE_TOLERANCE_MINUTES',
                category: 'attendance',
                value: 30,
                description: 'Số phút cho phép đi muộn (phút)',
                editableBy: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
                updatedBy: adminUser._id,
            },
            {
                key: 'ATTENDANCE_WORK_HOURS_PER_DAY',
                category: 'attendance',
                value: 8,
                description: 'Số giờ làm việc tiêu chuẩn mỗi ngày',
                editableBy: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
                updatedBy: adminUser._id,
            },
            {
                key: 'PAYROLL_OVERTIME_RATE',
                category: 'payroll',
                value: 1.5,
                description: 'Hệ số lương tăng ca (1.5 = 150%)',
                editableBy: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
                updatedBy: adminUser._id,
            },
            {
                key: 'PAYROLL_LATE_DEDUCTION_PER_DAY',
                category: 'payroll',
                value: 200000,
                description: 'Số tiền khấu trừ cho mỗi ngày đi muộn (VND)',
                editableBy: ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
                updatedBy: adminUser._id,
            },
            {
                key: 'GENERAL_COMPANY_NAME',
                category: 'general',
                value: 'Smart Attendance Company',
                description: 'Tên công ty',
                editableBy: ['SUPER_ADMIN', 'ADMIN'],
                updatedBy: adminUser._id,
            },
            {
                key: 'GENERAL_TIMEZONE',
                category: 'general',
                value: 'GMT+7',
                description: 'Múi giờ của công ty',
                editableBy: ['SUPER_ADMIN', 'ADMIN'],
                updatedBy: adminUser._id,
            },
            {
                key: 'NOTIFICATION_EMAIL_ENABLED',
                category: 'notification',
                value: true,
                description: 'Bật/tắt gửi email thông báo',
                editableBy: ['SUPER_ADMIN', 'ADMIN'],
                updatedBy: adminUser._id,
            },
            {
                key: 'SECURITY_SESSION_TIMEOUT_MINUTES',
                category: 'security',
                value: 30,
                description: 'Thời gian timeout phiên đăng nhập (phút)',
                editableBy: ['SUPER_ADMIN', 'ADMIN'],
                updatedBy: adminUser._id,
            },
        ];

        const createdSystemConfigs = await SystemConfigModel.insertMany(systemConfigs);
        console.log(`✅ Created ${createdSystemConfigs.length} system configs\n`);

        // ========== TỔNG KẾT ==========
        console.log('🎉 Seed completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - Shifts: ${shifts.length}`);
        console.log(`   - Request Types: ${createdRequestTypes.length}`);
        console.log(`   - Locations: ${locations.length}`);
        console.log(`   - Branches: ${branches.length}`);
        console.log(`   - Departments: ${departments.length}`);
        console.log(`   - Users: ${createdUsers.length}`);
        console.log(`   - Employee Shift Assignments: ${createdAssignments.length}`);
        console.log(`   - Attendances: ${createdAttendances.length}`);
        console.log(`   - Requests: ${createdRequests.length}`);
        console.log(`   - Notifications: ${createdNotifications.length}`);
        console.log(`   - Reports: ${createdReports.length}`);
        console.log(`   - Logs: ${createdLogs.length}`);
        console.log(`   - Payroll Records: ${createdPayrollRecords.length}`);
        console.log(`   - Performance Reviews: ${createdPerformanceReviews.length}`);
        console.log(`   - Calendar Events: ${createdCalendarEvents.length}`);
        console.log(`   - Employee Schedules: ${createdEmployeeSchedules.length}`);
        console.log(`   - System Configs: ${createdSystemConfigs.length}\n`);



        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
