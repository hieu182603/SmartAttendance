import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CompanyModel } from '../src/modules/company/company.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { ShiftModel } from '../src/modules/shifts/shift.model.js';
// import { LocationModel } from '../src/modules/locations/location.model.js'; // Commented out - locations module not found
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
import { LeaveTypeModel } from '../src/modules/leave/leave-type.model.js';
import { DEFAULT_LEAVE_TYPES } from '../src/modules/leave/leave-type.defaults.js';
import { NotificationModel } from '../src/modules/notifications/notification.model.js';
import { FeatureToggleModel, DEFAULT_FEATURES } from '../src/modules/feature-toggle/featureToggle.model.js';
import { SalaryMatrixModel } from '../src/modules/payroll/salary-matrix.model.js';
import { SalaryHistoryModel } from '../src/modules/payroll/salary-history.model.js';
import { OrderModel } from '../src/modules/billing/order.model.js';
import { AiUsageEventModel } from '../src/modules/ai-billing/aiUsageEvent.model.js';
import { AiInvoiceModel, generateInvoiceCode } from '../src/modules/ai-billing/aiInvoice.model.js';
import { PLAN_CONFIG } from '@smartattendance/shared';
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
        await CompanyModel.deleteMany({});
        await UserModel.deleteMany({});
        await ShiftModel.deleteMany({});
        // await LocationModel.deleteMany({}); // Commented out - locations module not found
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
        await LeaveTypeModel.deleteMany({});
        await NotificationModel.deleteMany({});
        await FeatureToggleModel.deleteMany({});
        await SalaryMatrixModel.deleteMany({});
        await SalaryHistoryModel.deleteMany({});
        await OrderModel.deleteMany({});
        await AiUsageEventModel.deleteMany({});
        await AiInvoiceModel.deleteMany({});

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

        // ========== 0. TẠO COMPANY (Công ty mặc định) ==========
        console.log('🏭 Creating default company...');
        const company = await CompanyModel.create({
            name: 'SmartAttendance Demo Corp',
            slug: 'smartattendance-demo',
            email: 'contact@smartattendance.com',
            phone: '0241234567',
            plan: 'premium',
            maxUsers: 999999,
            isActive: true,
        });
        const companyId = company._id;
        console.log(`✅ Created company: ${company.name}\n`);

        // ========== 1. TẠO SHIFTS (Ca làm việc) ==========
        console.log('📅 Creating shifts...');
        const shifts = await ShiftModel.insertMany([
            {
                companyId,
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
            { companyId, value: 'leave', label: 'Nghỉ phép', description: 'Nghỉ phép năm', sortOrder: 0, isActive: true, isSystem: true },
            { companyId, value: 'sick', label: 'Nghỉ ốm', description: 'Nghỉ ốm', sortOrder: 1, isActive: true, isSystem: true },
            { companyId, value: 'unpaid', label: 'Nghỉ không lương', description: 'Nghỉ không lương', sortOrder: 2, isActive: true, isSystem: true },
            { companyId, value: 'compensatory', label: 'Nghỉ bù', description: 'Nghỉ bù', sortOrder: 3, isActive: true, isSystem: true },
            { companyId, value: 'maternity', label: 'Nghỉ thai sản', description: 'Nghỉ thai sản', sortOrder: 4, isActive: true, isSystem: true },
            { companyId, value: 'overtime', label: 'Tăng ca', description: 'Yêu cầu làm thêm giờ', sortOrder: 5, isActive: true, isSystem: true },
            { companyId, value: 'remote', label: 'Làm từ xa', description: 'Làm việc từ xa', sortOrder: 6, isActive: true, isSystem: true },
            { companyId, value: 'late', label: 'Đi muộn', description: 'Yêu cầu đi muộn', sortOrder: 7, isActive: true, isSystem: true },
            { companyId, value: 'correction', label: 'Sửa công', description: 'Yêu cầu sửa chấm công', sortOrder: 8, isActive: true, isSystem: true },
            { companyId, value: 'other', label: 'Yêu cầu khác', description: 'Các yêu cầu khác', sortOrder: 9, isActive: true, isSystem: true },
            { companyId, value: 'off_site', label: 'Remote work', description: 'Làm việc ngoài trụ sở', sortOrder: 10, isActive: true, isSystem: true },


        ];
        const createdRequestTypes = await RequestTypeModel.insertMany(requestTypes);
        console.log(`✅ Created ${createdRequestTypes.length} request types\n`);

        // ========== 1.6. TẠO LEAVE TYPES (Loại phép — HR quản lý) ==========
        console.log('🏖️  Creating leave types...');
        const createdLeaveTypes = await LeaveTypeModel.insertMany(
            DEFAULT_LEAVE_TYPES.map((t) => ({ ...t, companyId }))
        );
        console.log(`✅ Created ${createdLeaveTypes.length} leave types\n`);

        // ========== 2. TẠO LOCATIONS (Địa điểm) ==========
        console.log('📍 Skipping locations creation (locations module not found)...');
        const locations = []; // Empty array as locations are not used
        console.log(`✅ Skipped locations creation\n`);

        // ========== 2.5. TẠO BRANCHES (Chi nhánh) ==========
        console.log('🏢 Creating branches...');
        const branches = await BranchModel.insertMany([
            {
                companyId,
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
                companyId,
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
                companyId,
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
                companyId,
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
                companyId,
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
                companyId,
                name: 'Phòng Phát triển',
                code: 'DEV',
                description: 'Phòng ban phát triển phần mềm',
                branchId: branches[0]._id, // HQ
                managerId: null, // Sẽ gán sau
                budget: 5000000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Thiết kế',
                code: 'DESIGN',
                description: 'Phòng ban thiết kế UI/UX và sáng tạo',
                branchId: branches[0]._id,
                managerId: null,
                budget: 2000000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Marketing',
                code: 'MKT',
                description: 'Phòng ban marketing và truyền thông',
                branchId: branches[0]._id,
                managerId: null,
                budget: 3000000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Kinh doanh',
                code: 'SALES',
                description: 'Phòng ban kinh doanh và bán hàng',
                branchId: branches[1]._id, // HCM
                managerId: null,
                budget: 4000000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Nhân sự',
                code: 'HR',
                description: 'Phòng ban quản lý nhân sự',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1500000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Tài chính',
                code: 'FINANCE',
                description: 'Phòng ban tài chính và kế toán',
                branchId: branches[0]._id,
                managerId: null,
                budget: 2500000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Vận hành',
                code: 'OPS',
                description: 'Phòng ban vận hành và quản lý hệ thống',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1800000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng Hỗ trợ',
                code: 'SUPPORT',
                description: 'Phòng ban hỗ trợ khách hàng',
                branchId: branches[1]._id,
                managerId: null,
                budget: 1200000000,
                status: 'active',
            },
            {
                companyId,
                name: 'Phòng QA',
                code: 'QA',
                description: 'Phòng ban kiểm thử chất lượng',
                branchId: branches[0]._id,
                managerId: null,
                budget: 1500000000,
                status: 'active',
            },
            {
                companyId,
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

        // ========== 3. TẠO USERS (Người dùng) - 191 users ==========
        console.log('👥 Creating users...');
        const hashedPassword = await hashPassword('SmartAttendance@2026!');

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

        // Trưởng phòng (MANAGER) cho từng phòng ban — email manager.<dept>@...
        const deptManagerData = [
            { name: 'Manager Phát triển', email: 'manager.dev@smartattendance.com', deptCode: 'DEV', phone: '0902000001' },
            { name: 'Manager Thiết kế', email: 'manager.design@smartattendance.com', deptCode: 'DESIGN', phone: '0902000002' },
            { name: 'Manager Marketing', email: 'manager.mkt@smartattendance.com', deptCode: 'MKT', phone: '0902000003' },
            { name: 'Manager Kinh doanh', email: 'manager.sales@smartattendance.com', deptCode: 'SALES', phone: '0902000004' },
            { name: 'Manager Tài chính', email: 'manager.finance@smartattendance.com', deptCode: 'FINANCE', phone: '0902000005' },
            { name: 'Manager Vận hành', email: 'manager.ops@smartattendance.com', deptCode: 'OPS', phone: '0902000006' },
            { name: 'Manager QA', email: 'manager.qa@smartattendance.com', deptCode: 'QA', phone: '0902000007' },
            { name: 'Manager Hỗ trợ', email: 'manager.support@smartattendance.com', deptCode: 'SUPPORT', phone: '0902000008' },
        ];

        deptManagerData.forEach((deptManager) => {
            const department = departments.find(d => d.code === deptManager.deptCode);
            if (department) {
                users.push({
                    email: deptManager.email,
                    password: hashedPassword,
                    name: deptManager.name,
                    role: 'MANAGER',
                    phone: deptManager.phone,
                    department: department._id,
                    branch: department.branchId,
                    isVerified: true,
                    isActive: true,
                });
            }
        });

        // Tạo 180 employees (tổng users: admins/managers + dept managers + employees)
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
                // employee1 always active for deterministic E2E tests; rest 90% active
                isActive: i === 1 ? true : Math.random() > 0.1,
            });
        }

        // Add companyId to all non-SUPER_ADMIN users
        for (const u of users) {
            if (u.role !== 'SUPER_ADMIN') u.companyId = companyId;
        }

        const createdUsers = await UserModel.insertMany(users);
        console.log(`✅ Created ${createdUsers.length} users\n`);

        // Gán managerId cho branches và departments
        const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
        const hrUser = createdUsers.find((u) => u.role === 'HR_MANAGER');
        const managerUser = createdUsers.find((u) => u.role === 'MANAGER');
        const employeeUsers = createdUsers.filter((u) => u.role === 'EMPLOYEE');

        // Gán giám đốc chi nhánh
        const deptManagersByCode = Object.fromEntries(
            deptManagerData.map((dm) => {
                const user = createdUsers.find((u) => u.email === dm.email);
                return [dm.deptCode, user];
            }).filter(([, user]) => user)
        );

        await BranchModel.findByIdAndUpdate(branches[0]._id, { managerId: adminUser._id }); // HQ
        await BranchModel.findByIdAndUpdate(branches[1]._id, { managerId: managerUser._id }); // HCM
        await BranchModel.findByIdAndUpdate(branches[2]._id, { managerId: deptManagersByCode.OPS?._id || managerUser._id }); // Đà Nẵng
        await BranchModel.findByIdAndUpdate(branches[3]._id, { managerId: deptManagersByCode.SALES?._id || managerUser._id }); // Cần Thơ
        await BranchModel.findByIdAndUpdate(branches[4]._id, { managerId: deptManagersByCode.FINANCE?._id || adminUser._id }); // Hải Phòng

        // Gán trưởng phòng (dept managers)
        for (const dm of deptManagerData) {
            const dept = departments.find((d) => d.code === dm.deptCode);
            const mgr = createdUsers.find((u) => u.email === dm.email);
            if (dept && mgr) {
                await DepartmentModel.findByIdAndUpdate(dept._id, { managerId: mgr._id });
            }
        }
        await DepartmentModel.findByIdAndUpdate(departments.find(d => d.code === 'HR')._id, { managerId: hrUser._id });
        await DepartmentModel.findByIdAndUpdate(departments.find(d => d.code === 'PRODUCT')._id, { managerId: managerUser._id });
        console.log('✅ Assigned branch & department managers\n');

        // ========== 3.5. GÁN DEFAULT SHIFT VÀ TẠO EMPLOYEE SHIFT ASSIGNMENTS ==========
        console.log('📋 Assigning default shifts and creating shift assignments...');
        const defaultShift = shifts[0]; // Full time shift

        // Gán defaultShiftId cho tất cả employees
        await UserModel.updateMany(
            { role: { $in: ['EMPLOYEE'] }, isActive: true },
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

        // ========== 4. TẠO ATTENDANCES (Chấm công) - dải cố định 01/01/2026 → 12/03/2026 ==========
        console.log('⏰ Creating attendances for fixed range 2026-01-01 → 2026-03-12...');

        const attendances = [];

        const startDate = new Date(2026, 0, 1); // 01/01/2026
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(2026, 2, 12); // 12/03/2026
        endDate.setHours(0, 0, 0, 0);

        // Seed base date dùng cho các phần còn lại (requests, reports, events, ...)
        const seedBaseDate = new Date(endDate);
        const today = new Date(seedBaseDate);
        today.setHours(0, 0, 0, 0);

        for (
            const date = new Date(startDate);
            date <= endDate;
            date.setDate(date.getDate() + 1)
        ) {
            const dayOfWeek = date.getDay();
            // Chỉ chấm công từ Thứ 2 đến Thứ 6 (1–5), Thứ 7/CN nghỉ
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            for (const employee of employeeUsers) {
                // Mặc định tất cả nhân viên active đều có chấm công mỗi ngày làm việc
                if (!employee.isActive) continue;

                // Check-in 07:55–08:15 (một chút random, nhưng luôn đi làm)
                const checkInHour = 8;
                const checkInMinute = randomInt(0, 20) - 5; // từ -5 đến +15 phút quanh 8:00
                const checkIn = new Date(date);
                checkIn.setHours(
                    checkInHour,
                    Math.min(Math.max(0, checkInMinute), 59),
                    0,
                    0
                );

                // Check-out 17:00–18:00
                const checkOutHour = randomInt(17, 18);
                const checkOutMinute = randomInt(0, 59);
                const checkOut = new Date(date);
                checkOut.setHours(checkOutHour, checkOutMinute, 0, 0);

                // Tính status (có thể có một ít ngày đi muộn nhưng vẫn đi làm)
                let status = 'present';
                const lateTime = new Date(date);
                lateTime.setHours(8, 30, 0, 0);
                if (checkIn > lateTime) {
                    status = 'late';
                }

                const msWorked = checkOut - checkIn;
                const workHours = Math.max(0, Math.round((msWorked / 3600000) * 100) / 100);

                attendances.push({
                    userId: employee._id,
                    date: new Date(date),
                    checkIn,
                    checkOut,
                    workHours,
                    status,
                    // Không gắn location vì seed hiện không tạo locations thực tế
                    locationId: undefined,
                });
            }
        }

        const createdAttendances = await AttendanceModel.insertMany(attendances);
        console.log(`✅ Created ${createdAttendances.length} attendance records\n`);

        // ========== 5. TẠO REQUESTS (Yêu cầu) - 25 requests ==========
        console.log('📝 Creating requests...');
        const mainRequestTypes = ['leave', 'overtime', 'remote', 'other'];
        const extraRequestTypes = ['sick', 'compensatory', 'correction'];
        const pickRequestType = () => {
            if (Math.random() < 0.3) {
                return extraRequestTypes[randomInt(0, extraRequestTypes.length - 1)];
            }
            return mainRequestTypes[randomInt(0, mainRequestTypes.length - 1)];
        };
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
            const type = pickRequestType();
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
                    companyId,
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

        // Phiếu lương cố định cho tài khoản demo (employee1, HR, manager) — trang "Phiếu lương của tôi"
        const demoPayslipMonths = ['2026-01', '2026-02', '2026-03'];
        const demoPayslipAccounts = [
            {
                user: createdUsers.find((u) => u.email === 'employee1@smartattendance.com'),
                department: 'Phòng Phát triển',
                position: 'Developer',
            },
            {
                user: createdUsers.find((u) => u.email === 'hr@smartattendance.com'),
                department: 'Phòng Nhân sự',
                position: 'HR Specialist',
            },
            {
                user: createdUsers.find((u) => u.email === 'manager@smartattendance.com'),
                department: 'Phòng Sản phẩm',
                position: 'Product Manager',
            },
        ];
        let demoPayslipUpserts = 0;
        for (const { user, department, position } of demoPayslipAccounts) {
            if (!user) continue;
            for (const monthStr of demoPayslipMonths) {
                const [year, monthNum] = monthStr.split('-').map(Number);
                const periodStart = new Date(year, monthNum - 1, 1);
                const periodEnd = new Date(year, monthNum, 0);
                const baseSalary = 18000000;
                const overtimePay = 1500000;
                const bonus = 1000000;
                const deductions = 500000;
                const grossSalary = baseSalary + overtimePay + bonus - deductions;
                const netSalary = Math.max(0, Math.round(grossSalary * 0.9));
                const result = await PayrollRecordModel.updateOne(
                    { companyId, userId: user._id, month: monthStr },
                    {
                        $setOnInsert: {
                            companyId,
                            userId: user._id,
                            month: monthStr,
                            periodStart,
                            periodEnd,
                            workDays: 20,
                            totalDays: 22,
                            overtimeHours: 8,
                            leaveDays: 2,
                            lateDays: 0,
                            baseSalary,
                            actualBaseSalary: baseSalary,
                            salarySource: 'SALARY_MATRIX',
                            overtimePay,
                            bonus,
                            deductions,
                            grossSalary,
                            netSalary,
                            totalSalary: netSalary,
                            department,
                            position,
                            employeeId: user.employeeId || `EMP${String(createdUsers.indexOf(user) + 1).padStart(3, '0')}`,
                            status: 'paid',
                            approvedBy: adminUser._id,
                            approvedAt: periodEnd,
                            paidAt: periodEnd,
                        },
                    },
                    { upsert: true }
                );
                if (result.upsertedCount > 0) demoPayslipUpserts++;
            }
        }
        if (demoPayslipUpserts > 0) {
            console.log(`✅ Ensured ${demoPayslipUpserts} demo payslips (employee1, HR, manager)\n`);
        }

        // ========== 9. TẠO PERFORMANCE REVIEWS (Đánh giá hiệu suất) ==========
        console.log('⭐ Creating performance reviews...');
        const performanceReviews = [];
        const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'];

        // Unique compound index (employeeId, period) → dedupe to avoid E11000
        const reviewedPairs = new Set();
        const maxReviews = Math.min(150, employeeUsers.length * periods.length);

        // Tạo reviews cho nhiều nhân viên hơn
        for (let attempts = 0; performanceReviews.length < maxReviews && attempts < maxReviews * 10; attempts++) {
            const employee = employeeUsers[randomInt(0, employeeUsers.length - 1)];
            const reviewer = Math.random() > 0.5 ? adminUser : (Math.random() > 0.5 ? hrUser : managerUser);
            const period = periods[randomInt(0, periods.length - 1)];

            const pairKey = `${employee._id}_${period}`;
            if (reviewedPairs.has(pairKey)) continue;
            reviewedPairs.add(pairKey);
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
                        location: locations[0]?.name || 'Default Location',
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
                    location: (locations.find(loc => employee.branch?.toString() === loc._id.toString()) || locations[0])?.name || 'Default Location',
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

        // ========== 13. TẠO FEATURE TOGGLES ==========
        console.log('🎚️  Creating feature toggles...');
        const featureToggleDocs = DEFAULT_FEATURES.map((f) => ({ ...f }));
        const faceRecognitionToggle = featureToggleDocs.find((f) => f.featureKey === 'face_recognition');
        if (faceRecognitionToggle) {
            faceRecognitionToggle.companyOverrides = [{ companyId, enabled: false }];
            faceRecognitionToggle.updatedBy = adminUser._id;
        }
        const createdFeatureToggles = await FeatureToggleModel.insertMany(featureToggleDocs);
        console.log(`✅ Created ${createdFeatureToggles.length} feature toggles\n`);

        // ========== 14. TẠO SALARY MATRIX ==========
        console.log('📊 Creating salary matrix...');
        const salaryMatrixBands = {
            DEV: [
                { position: 'Senior Developer', baseSalary: 28000000 },
                { position: 'Frontend Developer', baseSalary: 22000000 },
                { position: 'Backend Developer', baseSalary: 24000000 },
            ],
            DESIGN: [
                { position: 'Designer', baseSalary: 20000000 },
                { position: 'Senior Designer', baseSalary: 24000000 },
            ],
            MKT: [
                { position: 'Marketing Manager', baseSalary: 22000000 },
                { position: 'Marketing Specialist', baseSalary: 16000000 },
            ],
            SALES: [
                { position: 'Sales Manager', baseSalary: 24000000 },
                { position: 'Sales Executive', baseSalary: 17000000 },
            ],
            HR: [
                { position: 'HR Specialist', baseSalary: 16000000 },
                { position: 'HR Manager', baseSalary: 20000000 },
            ],
            FINANCE: [
                { position: 'Accountant', baseSalary: 15000000 },
                { position: 'Finance Manager', baseSalary: 22000000 },
            ],
            OPS: [
                { position: 'Operations Specialist', baseSalary: 15000000 },
                { position: 'Operations Manager', baseSalary: 20000000 },
            ],
            SUPPORT: [
                { position: 'Support Specialist', baseSalary: 14000000 },
            ],
            QA: [
                { position: 'QA Engineer', baseSalary: 18000000 },
                { position: 'QA Lead', baseSalary: 22000000 },
            ],
            PRODUCT: [
                { position: 'Product Manager', baseSalary: 25000000 },
            ],
        };
        const salaryMatrixRows = [];
        for (const [departmentCode, positionsForDept] of Object.entries(salaryMatrixBands)) {
            for (const { position, baseSalary } of positionsForDept) {
                salaryMatrixRows.push({
                    companyId,
                    departmentCode,
                    position,
                    positionKey: position.toLowerCase(),
                    baseSalary,
                    isActive: true,
                    createdBy: hrUser._id,
                    updatedBy: hrUser._id,
                });
            }
        }
        const createdSalaryMatrix = await SalaryMatrixModel.insertMany(salaryMatrixRows);
        console.log(`✅ Created ${createdSalaryMatrix.length} salary matrix entries\n`);

        // ========== 15. TẠO SALARY HISTORY ==========
        console.log('📈 Creating salary history...');
        const employee1 = createdUsers.find((u) => u.email === 'employee1@smartattendance.com');
        const managerDev = createdUsers.find((u) => u.email === 'manager.dev@smartattendance.com');
        const managerMkt = createdUsers.find((u) => u.email === 'manager.mkt@smartattendance.com');
        const managerSales = createdUsers.find((u) => u.email === 'manager.sales@smartattendance.com');

        const salaryHistoryRows = [];
        if (employee1) {
            const hireDate = new Date(seedBaseDate);
            hireDate.setMonth(hireDate.getMonth() - 6);
            salaryHistoryRows.push({
                companyId,
                userId: employee1._id,
                oldSalary: null,
                newSalary: 15000000,
                effectiveDate: hireDate,
                reason: 'Lương khởi điểm khi vào làm',
                changedBy: hrUser._id,
            });
            const raiseDate = new Date(seedBaseDate);
            raiseDate.setMonth(raiseDate.getMonth() - 2);
            salaryHistoryRows.push({
                companyId,
                userId: employee1._id,
                oldSalary: 15000000,
                newSalary: 18000000,
                effectiveDate: raiseDate,
                reason: 'Tăng lương định kỳ',
                changedBy: hrUser._id,
            });
        }
        if (managerDev) {
            const eff = new Date(seedBaseDate);
            eff.setMonth(eff.getMonth() - 4);
            salaryHistoryRows.push({
                companyId,
                userId: managerDev._id,
                oldSalary: 25000000,
                newSalary: 28000000,
                effectiveDate: eff,
                reason: 'Điều chỉnh lương quản lý',
                changedBy: adminUser._id,
            });
        }
        if (managerMkt) {
            const eff = new Date(seedBaseDate);
            eff.setMonth(eff.getMonth() - 3);
            salaryHistoryRows.push({
                companyId,
                userId: managerMkt._id,
                oldSalary: 20000000,
                newSalary: 22000000,
                effectiveDate: eff,
                reason: 'Tăng lương theo KPI',
                changedBy: hrUser._id,
            });
        }
        if (managerSales) {
            const eff = new Date(seedBaseDate);
            eff.setMonth(eff.getMonth() - 5);
            salaryHistoryRows.push({
                companyId,
                userId: managerSales._id,
                oldSalary: 22000000,
                newSalary: 24000000,
                effectiveDate: eff,
                reason: 'Điều chỉnh lương vùng',
                changedBy: hrUser._id,
            });
        }
        const createdSalaryHistory = await SalaryHistoryModel.insertMany(salaryHistoryRows);
        console.log(`✅ Created ${createdSalaryHistory.length} salary history records\n`);

        // ========== 16. TẠO BILLING ORDERS ==========
        console.log('🧾 Creating billing orders...');
        const orderSpecs = [
            { orderCode: 100001, plan: 'premium', billingCycle: 'yearly', status: 'paid' },
            { orderCode: 100002, plan: 'standard', billingCycle: 'monthly', status: 'paid' },
            { orderCode: 100003, plan: 'premium', billingCycle: 'monthly', status: 'pending' },
            { orderCode: 100004, plan: 'starter', billingCycle: 'monthly', status: 'cancelled' },
        ];
        const billingOrders = orderSpecs.map((spec) => {
            const paidAt = spec.status === 'paid' ? new Date(seedBaseDate) : undefined;
            if (paidAt) paidAt.setDate(paidAt.getDate() - randomInt(5, 60));
            return {
                orderCode: spec.orderCode,
                companyId,
                plan: spec.plan,
                billingCycle: spec.billingCycle,
                amount: PLAN_CONFIG[spec.plan][spec.billingCycle],
                status: spec.status,
                paymentMethod: spec.status === 'paid' ? 'payos' : 'payos',
                paidAt,
                processedBy: spec.status === 'paid' ? adminUser._id : undefined,
                processedAt: paidAt,
                customerName: company.name,
                customerEmail: company.email,
                customerPhone: company.phone,
                companyName: company.name,
                employeeCount: 180,
                billingMonths: spec.billingCycle === 'yearly' ? 12 : 1,
            };
        });
        const createdOrders = await OrderModel.insertMany(billingOrders);
        console.log(`✅ Created ${createdOrders.length} billing orders\n`);

        // ========== 17. TẠO AI USAGE EVENTS & INVOICES ==========
        console.log('🤖 Creating AI usage events and invoices...');
        const aiOperations = ['qa', 'rewrite', 'general', 'embedding', 'intent_detect'];
        const aiModels = ['gpt-4o-mini', 'text-embedding-3-small'];
        const aiUsageUserIds = [
            employee1?._id,
            adminUser._id,
            employeeUsers[1]?._id,
            employeeUsers[2]?._id,
            employeeUsers[5]?._id,
        ].filter(Boolean);

        const aiUsageEvents = [];
        // Tháng 0–4 = T01–T05/2026 (khớp kỳ mặc định trên UI)
        for (let i = 0; i < 80; i++) {
            const eventDate = new Date(2026, randomInt(0, 4), randomInt(1, 28));
            eventDate.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
            const operation = aiOperations[randomInt(0, aiOperations.length - 1)];
            const userRef = aiUsageUserIds[randomInt(0, aiUsageUserIds.length - 1)];
            const promptTokens = randomInt(100, 2000);
            const completionTokens = operation === 'embedding' ? 0 : randomInt(50, 800);
            const totalTokens = promptTokens + completionTokens;
            const estimatedCostVnd = randomInt(500, 15000);

            aiUsageEvents.push({
                companyId,
                userId: userRef.toString(),
                service: 'rag',
                operation,
                model: operation === 'embedding' ? aiModels[1] : aiModels[0],
                promptTokens,
                completionTokens,
                totalTokens,
                estimatedCostUsd: estimatedCostVnd / 25000,
                estimatedCostVnd,
                estimated: true,
                createdAt: eventDate,
            });
        }
        const createdAiUsageEvents = await AiUsageEventModel.insertMany(aiUsageEvents);
        console.log(`✅ Created ${createdAiUsageEvents.length} AI usage events`);

        const buildMonthPeriod = (year, monthIndex) => {
            const periodStart = new Date(year, monthIndex, 1);
            const periodEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
            return { periodStart, periodEnd };
        };

        const aggregateUsageForPeriod = (periodStart, periodEnd) => {
            const inPeriod = createdAiUsageEvents.filter(
                (e) => e.createdAt >= periodStart && e.createdAt <= periodEnd
            );
            const breakdownMap = new Map();
            let totalTokens = 0;
            let amountVnd = 0;
            for (const e of inPeriod) {
                totalTokens += e.totalTokens || 0;
                amountVnd += e.estimatedCostVnd || 0;
                const prev = breakdownMap.get(e.operation) || { operation: e.operation, tokens: 0, costVnd: 0 };
                prev.tokens += e.totalTokens || 0;
                prev.costVnd += e.estimatedCostVnd || 0;
                breakdownMap.set(e.operation, prev);
            }
            return {
                breakdown: Array.from(breakdownMap.values()),
                totalTokens,
                amountVnd: Math.max(amountVnd, 10000),
            };
        };

        const jan2026 = buildMonthPeriod(2026, 0);
        const feb2026 = buildMonthPeriod(2026, 1);
        const mar2026 = buildMonthPeriod(2026, 2);
        const apr2026 = buildMonthPeriod(2026, 3);
        const may2026 = buildMonthPeriod(2026, 4);

        const janAgg = aggregateUsageForPeriod(jan2026.periodStart, jan2026.periodEnd);
        const febAgg = aggregateUsageForPeriod(feb2026.periodStart, feb2026.periodEnd);
        const marAgg = aggregateUsageForPeriod(mar2026.periodStart, mar2026.periodEnd);
        const aprAgg = aggregateUsageForPeriod(apr2026.periodStart, apr2026.periodEnd);
        const mayAgg = aggregateUsageForPeriod(may2026.periodStart, may2026.periodEnd);

        const aiInvoices = [
            {
                invoiceCode: generateInvoiceCode(),
                companyId,
                ...jan2026,
                status: 'paid',
                totalTokens: janAgg.totalTokens,
                breakdown: janAgg.breakdown,
                amountVnd: janAgg.amountVnd,
                customerEmail: company.email,
                issuedAt: new Date(2026, 1, 5),
                dueAt: new Date(2026, 1, 15),
                paidAt: new Date(2026, 1, 12),
                processedBy: adminUser._id,
            },
            {
                invoiceCode: generateInvoiceCode() + 1,
                companyId,
                ...feb2026,
                status: 'issued',
                totalTokens: febAgg.totalTokens,
                breakdown: febAgg.breakdown,
                amountVnd: febAgg.amountVnd,
                customerEmail: company.email,
                issuedAt: new Date(2026, 2, 5),
                dueAt: new Date(2026, 2, 20),
            },
            {
                invoiceCode: generateInvoiceCode() + 2,
                companyId,
                ...mar2026,
                status: 'issued',
                totalTokens: marAgg.totalTokens,
                breakdown: marAgg.breakdown,
                amountVnd: marAgg.amountVnd,
                customerEmail: company.email,
                issuedAt: new Date(2026, 3, 5),
                dueAt: new Date(2026, 3, 20),
            },
            {
                invoiceCode: generateInvoiceCode() + 3,
                companyId,
                ...apr2026,
                status: 'issued',
                totalTokens: aprAgg.totalTokens,
                breakdown: aprAgg.breakdown,
                amountVnd: aprAgg.amountVnd,
                customerEmail: company.email,
                issuedAt: new Date(2026, 4, 5),
                dueAt: new Date(2026, 4, 20),
            },
            {
                invoiceCode: generateInvoiceCode() + 4,
                companyId,
                ...may2026,
                status: 'draft',
                totalTokens: mayAgg.totalTokens,
                breakdown: mayAgg.breakdown,
                amountVnd: mayAgg.amountVnd,
                customerEmail: company.email,
            },
        ];
        const createdAiInvoices = await AiInvoiceModel.insertMany(aiInvoices);
        console.log(`✅ Created ${createdAiInvoices.length} AI invoices\n`);

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
        console.log(`   - System Configs: ${createdSystemConfigs.length}`);
        console.log(`   - Feature Toggles: ${createdFeatureToggles.length}`);
        console.log(`   - Salary Matrix: ${createdSalaryMatrix.length}`);
        console.log(`   - Salary History: ${createdSalaryHistory.length}`);
        console.log(`   - Billing Orders: ${createdOrders.length}`);
        console.log(`   - AI Usage Events: ${createdAiUsageEvents.length}`);
        console.log(`   - AI Invoices: ${createdAiInvoices.length}\n`);



        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
