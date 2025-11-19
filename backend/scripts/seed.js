import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { UserModel } from '../src/modules/users/user.model.js';
import { ShiftModel } from '../src/modules/shifts/shift.model.js';
import { LocationModel } from '../src/modules/locations/location.model.js';
import { AttendanceModel } from '../src/modules/attendance/attendance.model.js';
import { RequestModel } from '../src/modules/requests/request.model.js';
import { ReportModel } from '../src/modules/reports/report.model.js';
import { LogModel } from '../src/modules/logs/log.model.js';
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
        await AttendanceModel.deleteMany({});
        await RequestModel.deleteMany({});
        await ReportModel.deleteMany({});
        await LogModel.deleteMany({});
        console.log('✅ Old data cleared\n');

        // ========== 1. TẠO SHIFTS (Ca làm việc) ==========
        console.log('📅 Creating shifts...');
        const shifts = await ShiftModel.insertMany([
            {
                name: 'Ca sáng',
                startTime: '08:00',
                endTime: '17:00',
                breakDuration: 60,
                isFlexible: false,
                description: 'Ca làm việc buổi sáng từ 8h-17h',
                isActive: true,
            },
            {
                name: 'Ca chiều',
                startTime: '13:00',
                endTime: '22:00',
                breakDuration: 60,
                isFlexible: false,
                description: 'Ca làm việc buổi chiều từ 13h-22h',
                isActive: true,
            },
            {
                name: 'Ca đêm',
                startTime: '22:00',
                endTime: '06:00',
                breakDuration: 30,
                isFlexible: false,
                description: 'Ca làm việc đêm từ 22h-6h sáng hôm sau',
                isActive: true,
            },
            {
                name: 'Ca linh hoạt',
                startTime: '09:00',
                endTime: '18:00',
                breakDuration: 60,
                isFlexible: true,
                description: 'Ca làm việc linh hoạt, nhân viên tự chọn giờ',
                isActive: true,
            },
            {
                name: 'Ca part-time sáng',
                startTime: '08:00',
                endTime: '12:00',
                breakDuration: 0,
                isFlexible: false,
                description: 'Ca làm việc bán thời gian buổi sáng',
                isActive: true,
            },
            {
                name: 'Ca part-time chiều',
                startTime: '13:00',
                endTime: '17:00',
                breakDuration: 0,
                isFlexible: false,
                description: 'Ca làm việc bán thời gian buổi chiều',
                isActive: true,
            },
        ]);
        console.log(`✅ Created ${shifts.length} shifts\n`);

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

        // ========== 3. TẠO USERS (Người dùng) - 30 users ==========
        console.log('👥 Creating users...');
        const hashedPassword = await hashPassword('password123');

        const departments = ['Development', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support', 'QA', 'Product'];
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
            department: 'Executive',
            branch: locations[0]._id,
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'admin@smartattendance.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
            phone: '0901234567',
            department: 'IT',
            branch: locations[0]._id,
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'hr@smartattendance.com',
            password: hashedPassword,
            name: 'HR Manager',
            role: 'HR_MANAGER',
            phone: '0901234568',
            department: 'HR',
            branch: locations[0]._id,
            isVerified: true,
            isActive: true,
        });

        users.push({
            email: 'manager@smartattendance.com',
            password: hashedPassword,
            name: 'Manager',
            role: 'MANAGER',
            phone: '0901234569',
            department: 'Product',
            branch: locations[0]._id,
            isVerified: true,
            isActive: true,
        });

        // Tạo 27 employees
        for (let i = 1; i <= 27; i++) {
            const firstName = firstNames[randomInt(0, firstNames.length - 1)];
            const lastName = lastNames[randomInt(0, lastNames.length - 1)];
            const middleName = middleNames[randomInt(0, middleNames.length - 1)];
            const name = `${firstName} ${middleName} ${lastName} ${i}`;
            const department = departments[randomInt(0, departments.length - 1)];
            const branch = locations[randomInt(0, locations.length - 1)]._id;
            const phone = `090${String(1000000 + i).slice(1)}`;

            users.push({
                email: `employee${i}@smartattendance.com`,
                password: hashedPassword,
                name: name,
                role: 'EMPLOYEE',
                phone: phone,
                department: department,
                branch: branch,
                isVerified: true,
                isActive: Math.random() > 0.1, // 90% active
            });
        }

        const createdUsers = await UserModel.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users\n`);

        const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
        const hrUser = createdUsers.find((u) => u.role === 'HR_MANAGER');
        const employeeUsers = createdUsers.filter((u) => u.role === 'EMPLOYEE');

        // ========== 4. TẠO ATTENDANCES (Chấm công) - 3 tháng ==========
        console.log('⏰ Creating attendances...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendances = [];
        const monthsToGenerate = 3; // 3 tháng
        const daysPerMonth = 22; // ~22 ngày làm việc/tháng (trừ cuối tuần)

        for (let monthOffset = 0; monthOffset < monthsToGenerate; monthOffset++) {
            const monthDate = new Date(today);
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
        const requestTypes = ['leave', 'overtime', 'remote', 'other'];
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
        for (let i = 0; i < 25; i++) {
            const employee = employeeUsers[randomInt(0, employeeUsers.length - 1)];
            const type = requestTypes[randomInt(0, requestTypes.length - 1)];
            const status = requestStatuses[randomInt(0, requestStatuses.length - 1)];

            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - randomInt(1, 60));
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

        // ========== 6. TẠO REPORTS (Báo cáo) - Weekly & Monthly ==========
        console.log('📊 Creating reports...');
        const reports = [];

        // Weekly reports cho 12 tuần gần nhất
        for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
            const weekStart = new Date(today);
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

        // Monthly reports cho 3 tháng gần nhất
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            const monthStart = new Date(today);
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

        // ========== TỔNG KẾT ==========
        console.log('🎉 Seed completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - Shifts: ${shifts.length}`);
        console.log(`   - Locations: ${locations.length}`);
        console.log(`   - Users: ${createdUsers.length}`);
        console.log(`   - Attendances: ${createdAttendances.length}`);
        console.log(`   - Requests: ${createdRequests.length}`);
        console.log(`   - Reports: ${createdReports.length}`);
        console.log(`   - Logs: ${createdLogs.length}\n`);



        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
