import mongoose from "mongoose";
import dotenv from "dotenv";
import { PayrollRecordModel } from "../modules/payroll/payroll.model.js";
import { User } from "../modules/users/user.model.js";

dotenv.config();

const departments = [
  "Phòng IT",
  "Phòng Nhân sự",
  "Phòng Kế toán",
  "Phòng Marketing",
  "Phòng Kinh doanh",
  "Phòng Vận hành",
  "Phòng Hành chính",
];

const positions = [
  "Developer",
  "Designer",
  "Tester",
  "Manager",
  "Team Lead",
  "Specialist",
  "Staff",
  "Senior",
  "Junior",
];

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomElement = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

const generatePayrollRecord = (user, index) => {
  const workDays = getRandomInt(18, 22); // 18-22 ngày làm việc
  const totalDays = 22; // Tổng ngày làm việc trong tháng
  const overtimeHours = getRandomInt(0, 20); // 0-20 giờ tăng ca
  const leaveDays = totalDays - workDays; // Ngày nghỉ
  const lateDays = getRandomInt(0, 3); // 0-3 ngày đi muộn

  // Lương cơ bản từ 10-30 triệu
  const baseSalary = getRandomInt(10, 30) * 1000000;
  
  // Lương tăng ca: 150k/giờ
  const overtimePay = overtimeHours * 150000;
  
  // Thưởng: 0-5 triệu
  const bonus = getRandomInt(0, 5) * 1000000;
  
  // Khấu trừ: 100k-500k nếu có đi muộn
  const deductions = lateDays > 0 ? lateDays * getRandomInt(100, 500) * 1000 : 0;

  const totalSalary = baseSalary + overtimePay + bonus - deductions;

  // Random status
  const statusOptions = ["pending", "approved", "paid"];
  const status = getRandomElement(statusOptions);

  const department = getRandomElement(departments);
  const position = getRandomElement(positions);

  return {
    userId: user._id,
    month: "2025-12",
    periodStart: new Date("2025-11-30T17:00:00.000Z"),
    periodEnd: new Date("2025-12-30T17:00:00.000Z"),
    workDays,
    totalDays,
    overtimeHours,
    leaveDays,
    lateDays,
    baseSalary,
    overtimePay,
    bonus,
    deductions,
    totalSalary,
    status,
    department,
    position,
    employeeId: user.employeeId || `EMP${String(index + 1).padStart(3, "0")}`,
    approvedBy: status !== "pending" ? user._id : undefined,
    approvedAt: status !== "pending" ? new Date("2025-12-01T17:00:00.000Z") : undefined,
    paidAt: status === "paid" ? new Date("2025-12-05T17:00:00.000Z") : undefined,
  };
};

const seedPayroll = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    console.log("📋 Fetching users...");
    const users = await User.find().limit(60).lean();
    
    if (users.length === 0) {
      console.log("❌ No users found in database. Please seed users first.");
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users`);

    // Delete existing payroll records for December 2025
    console.log("🗑️  Deleting existing payroll records for December 2025...");
    const deleteResult = await PayrollRecordModel.deleteMany({ month: "2025-12" });
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing records`);

    // Generate payroll records
    console.log("📝 Generating 60 payroll records...");
    const payrollRecords = users.slice(0, 60).map((user, index) => 
      generatePayrollRecord(user, index)
    );

    // Insert records
    console.log("💾 Inserting payroll records...");
    const inserted = await PayrollRecordModel.insertMany(payrollRecords);
    console.log(`✅ Successfully inserted ${inserted.length} payroll records`);

    // Show summary
    const summary = {
      total: inserted.length,
      pending: inserted.filter(r => r.status === "pending").length,
      approved: inserted.filter(r => r.status === "approved").length,
      paid: inserted.filter(r => r.status === "paid").length,
      totalSalary: inserted.reduce((sum, r) => sum + r.totalSalary, 0),
    };

    console.log("\n📊 Summary:");
    console.log(`   Total records: ${summary.total}`);
    console.log(`   Pending: ${summary.pending}`);
    console.log(`   Approved: ${summary.approved}`);
    console.log(`   Paid: ${summary.paid}`);
    console.log(`   Total salary: ${(summary.totalSalary / 1000000).toFixed(2)} triệu VNĐ`);

    console.log("\n✨ Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding payroll:", error);
    process.exit(1);
  }
};

seedPayroll();
