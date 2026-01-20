/**
 * Payroll Configuration - Quy chuẩn tính lương
 * 
 * Hệ thống hỗ trợ nhiều chức vụ với mức lương khác nhau thông qua:
 * 1. Salary Matrix: Kết hợp Department + Position → Base Salary
 * 2. Department Default: Lương mặc định theo department (nếu không tìm thấy position)
 * 3. Position Default: Lương mặc định theo position (nếu không tìm thấy department)
 * 4. User Override: Ưu tiên baseSalary trong User model (nếu có)
 */

// ============================================================================
// SALARY MATRIX: Department + Position → Base Salary
// ============================================================================
/**
 * Ma trận lương: Kết hợp Department code và Position name
 * 
 * Logic lookup:
 * 1. Ưu tiên: SALARY_MATRIX[departmentCode][position] 
 * 2. Nếu không có position: SALARY_MATRIX[departmentCode]['DEFAULT']
 * 3. Nếu không có department: POSITION_DEFAULT_SALARY[position]
 * 4. Cuối cùng: DEPARTMENT_DEFAULT_SALARY[departmentCode] hoặc GLOBAL_DEFAULT_SALARY
 */
export const SALARY_MATRIX = {
    // Phòng Phát triển (DEV)
    DEV: {
        // Chức vụ cụ thể
        "Senior Developer": 30000000,
        "Tech Lead": 35000000,
        "Frontend Developer": 22000000,
        "Backend Developer": 22000000,
        "Full-stack Developer": 25000000,
        "Mobile Developer": 24000000,
        "DevOps Engineer": 26000000,
        "QA Engineer": 18000000,
        "Junior Developer": 15000000,
        // Lương mặc định cho department (nếu position không có trong list)
        DEFAULT: 20000000,
    },

    // Phòng Thiết kế (DESIGN)
    DESIGN: {
        "Senior Designer": 25000000,
        "UI/UX Designer": 22000000,
        "Graphic Designer": 20000000,
        "Product Designer": 24000000,
        "Creative Director": 30000000,
        "Junior Designer": 15000000,
        DEFAULT: 18000000,
    },

    // Phòng Marketing (MKT)
    MKT: {
        "Marketing Manager": 25000000,
        "Marketing Specialist": 18000000,
        "Content Creator": 16000000,
        "SEO Specialist": 17000000,
        "Social Media Manager": 19000000,
        "Brand Manager": 23000000,
        "Marketing Executive": 15000000,
        DEFAULT: 16000000,
    },

    // Phòng Kinh doanh (SALES)
    SALES: {
        "Sales Manager": 25000000,
        "Senior Sales Executive": 20000000,
        "Sales Executive": 18000000,
        "Account Manager": 22000000,
        "Business Development Manager": 24000000,
        "Sales Representative": 15000000,
        DEFAULT: 17000000,
    },

    // Phòng Nhân sự (HR)
    HR: {
        "HR Manager": 22000000,
        "HR Specialist": 17000000,
        "Recruiter": 15000000,
        "HR Generalist": 16000000,
        "Compensation & Benefits Specialist": 19000000,
        "Training & Development Specialist": 18000000,
        DEFAULT: 16000000,
    },

    // Phòng Tài chính (FINANCE)
    FINANCE: {
        "Finance Manager": 25000000,
        "Senior Accountant": 20000000,
        "Accountant": 17000000,
        "Financial Analyst": 19000000,
        "Auditor": 18000000,
        "Junior Accountant": 15000000,
        DEFAULT: 18000000,
    },

    // Phòng Vận hành (OPS)
    OPS: {
        "Operations Manager": 24000000,
        "Operations Specialist": 18000000,
        "Process Analyst": 17000000,
        "Operations Coordinator": 16000000,
        DEFAULT: 17000000,
    },

    // Phòng Ban khác (nếu có)
    OTHER: {
        DEFAULT: 15000000,
    },
};

// ============================================================================
// DEPARTMENT DEFAULT SALARY (Fallback nếu không tìm thấy position)
// ============================================================================
/**
 * Lương mặc định theo department (nếu position không match)
 */
export const DEPARTMENT_DEFAULT_SALARY = {
    DEV: 20000000,
    DESIGN: 18000000,
    MKT: 16000000,
    SALES: 17000000,
    HR: 16000000,
    FINANCE: 18000000,
    OPS: 17000000,
    OTHER: 15000000,
};

// ============================================================================
// POSITION DEFAULT SALARY (Fallback nếu không tìm thấy department)
// ============================================================================
/**
 * Lương mặc định theo position (nếu department không match)
 * Dùng khi position có trong hệ thống nhưng department code không match
 */
export const POSITION_DEFAULT_SALARY = {
    // Manager level
    "Manager": 22000000,
    "Senior Manager": 28000000,
    "Director": 35000000,

    // Developer positions
    "Senior Developer": 28000000,
    "Frontend Developer": 21000000,
    "Backend Developer": 21000000,

    // Other common positions
    "Administrator": 18000000,
    "Assistant": 12000000,
    "Intern": 5000000,
};

// ============================================================================
// GLOBAL DEFAULT SALARY
// ============================================================================
/**
 * Lương mặc định toàn cục (nếu không tìm thấy cả department và position)
 */
export const GLOBAL_DEFAULT_SALARY = 15000000;

// ============================================================================
// PAYROLL CALCULATION RULES
// ============================================================================

/**
 * Quy tắc tính lương
 */
export const PAYROLL_RULES = {
    // Số ngày làm việc chuẩn/tháng
    STANDARD_WORK_DAYS: 22,
    STANDARD_WORK_HOURS_PER_DAY: 8,

    // Tính lương theo ngày làm việc
    // Công thức: baseSalary * (workDays / STANDARD_WORK_DAYS)
    CALCULATE_BY_WORK_DAYS: true,

    // Lương làm thêm giờ
    OVERTIME: {
        // Hệ số nhân (1.5 = 150%)
        MULTIPLIER: 1.5,
        // Hệ số cho ngày cuối tuần
        WEEKEND_MULTIPLIER: 2,
        // Hệ số cho ngày lễ
        HOLIDAY_MULTIPLIER: 3,
        // Công thức: overtimeHours * (baseSalary / (STANDARD_WORK_DAYS * STANDARD_WORK_HOURS_PER_DAY)) * MULTIPLIER
    },

    // Khấu trừ (Deductions)
    DEDUCTIONS: {
        // Đi muộn (mỗi lần)
        LATE_ARRIVAL: 200000,
        // Nghỉ không phép
        UNAUTHORIZED_ABSENCE: {
            // Số tiền khấu trừ = baseSalary / STANDARD_WORK_DAYS * số ngày nghỉ
            PER_DAY: true, // Tính theo ngày
        },
    },

    // Thưởng (Bonus)
    BONUS: {
        // Thưởng chuyên cần (không đi muộn, không nghỉ)
        ATTENDANCE: {
            ENABLED: true,
            AMOUNT: 1000000, // 1 triệu
            REQUIREMENTS: {
                NO_LATE_DAYS: true,
                NO_ABSENCE: true,
                MIN_WORK_DAYS: 22,
            },
        },
        // Thưởng hiệu suất
        PERFORMANCE: {
            ENABLED: false, // Tạm tắt, sẽ enable khi có performance module
            // Tính theo performance rating
            RATING_MULTIPLIER: {
                EXCELLENT: 0.2, // 20% baseSalary
                GOOD: 0.1, // 10% baseSalary
                AVERAGE: 0.05, // 5% baseSalary
            },
        },
    },

    // Bảo hiểm & Thuế (tạm tắt, sẽ enable khi cần)
    INSURANCE_TAX: {
        ENABLED: false,
        // Bảo hiểm xã hội (BHXH)
        SOCIAL_INSURANCE: {
            PERCENTAGE: 0.08, // 8% lương cơ bản
            MAX_BASE: 23840000, // Mức lương tối đa tính BHXH
        },
        // Bảo hiểm y tế (BHYT)
        HEALTH_INSURANCE: {
            PERCENTAGE: 0.015, // 1.5%
        },
        // Bảo hiểm thất nghiệp (BHTN)
        UNEMPLOYMENT_INSURANCE: {
            PERCENTAGE: 0.01, // 1%
        },
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Lấy lương cơ bản từ config
 * @param {string} departmentCode - Mã phòng ban (VD: 'DEV', 'DESIGN')
 * @param {string} position - Tên chức vụ (VD: 'Senior Developer')
 * @returns {number} Base salary
 */
export function getBaseSalaryFromConfig(departmentCode, position) {
    // Normalize department code to uppercase
    const deptCode = departmentCode?.toUpperCase() || "OTHER";

    // Normalize position (trim whitespace and lowercase for case-insensitive matching)
    const pos = position?.trim() || "";
    const normalizedPos = pos.toLowerCase();

    // Helper function to find matching key in object (case-insensitive)
    const findMatchingKey = (obj, searchKey) => {
        if (!obj) return null;
        const normalizedSearch = searchKey.toLowerCase();
        return Object.keys(obj).find(key => key.toLowerCase() === normalizedSearch);
    };

    // 1. Ưu tiên: SALARY_MATRIX[departmentCode][position] - case-insensitive
    if (pos) {
        const matchingPosition = findMatchingKey(SALARY_MATRIX[deptCode], pos);
        if (matchingPosition && SALARY_MATRIX[deptCode][matchingPosition]) {
            return SALARY_MATRIX[deptCode][matchingPosition];
        }
    }

    // 2. Nếu không có position cụ thể, dùng DEFAULT của department
    if (SALARY_MATRIX[deptCode] && SALARY_MATRIX[deptCode].DEFAULT) {
        return SALARY_MATRIX[deptCode].DEFAULT;
    }

    // 3. Nếu không có department trong matrix, thử POSITION_DEFAULT_SALARY - case-insensitive
    if (pos) {
        const matchingPosKey = findMatchingKey(POSITION_DEFAULT_SALARY, pos);
        if (matchingPosKey && POSITION_DEFAULT_SALARY[matchingPosKey]) {
            return POSITION_DEFAULT_SALARY[matchingPosKey];
        }
    }

    // 4. Dùng DEPARTMENT_DEFAULT_SALARY
    if (DEPARTMENT_DEFAULT_SALARY[deptCode]) {
        return DEPARTMENT_DEFAULT_SALARY[deptCode];
    }

    // 5. Cuối cùng: GLOBAL_DEFAULT_SALARY
    return GLOBAL_DEFAULT_SALARY;
}

