import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import { DepartmentModel } from "../departments/department.model.js";
import { BranchModel } from "../branches/branch.model.js";
import { canManageRole } from "../../config/roles.config.js";
import { SystemConfigModel } from "../config/config.model.js";
import { ROLE_PERMISSIONS, PERMISSIONS } from "../../config/permissions.config.js";
import { invalidatePermissionCache } from "../../middleware/permission.middleware.js";
import { canAccessUserTenant, TenantAccessError } from "../../utils/tenantCompany.util.js";
import { redisDel } from "../../config/redis.js";
import {
  applyBankAccountToUser,
  BANK_ACCOUNT_MODES,
  canRevealBankAccountForRequester,
  prepareBankAccountForStorage,
} from "../../utils/userResponse.util.js";

const ROLE_PERMISSION_CONFIG_KEY = "SECURITY_ROLE_PERMISSIONS";

export class UserService {
  static async getRolePermissions() {
    const base = {};
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      base[role] = [...perms];
    }

    const doc = await SystemConfigModel.findOne({ key: ROLE_PERMISSION_CONFIG_KEY }).lean();
    if (!doc || typeof doc.value !== "object" || doc.value == null) {
      return base;
    }

    const merged = { ...base };
    for (const [role, perms] of Object.entries(doc.value)) {
      if (Array.isArray(perms)) {
        merged[role] = Array.from(new Set(perms.filter((p) => typeof p === "string")));
      }
    }

    return merged;
  }

  static async updateRolePermissions(nextRolePerms, updatedBy) {
    const allowedRoles = new Set(Object.keys(ROLE_PERMISSIONS));
    const allowedPermissions = new Set(Object.values(PERMISSIONS));

    const normalized = {};
    for (const [role, perms] of Object.entries(nextRolePerms)) {
      if (!allowedRoles.has(role)) continue;
      if (!Array.isArray(perms)) continue;
      normalized[role] = Array.from(
        new Set(perms.filter((perm) => typeof perm === "string" && allowedPermissions.has(perm)))
      );
    }

    const merged = await UserService.getRolePermissions();
    for (const role of Object.keys(merged)) {
      if (normalized[role]) {
        merged[role] = normalized[role];
      }
    }

    await SystemConfigModel.findOneAndUpdate(
      { key: ROLE_PERMISSION_CONFIG_KEY },
      {
        $set: {
          key: ROLE_PERMISSION_CONFIG_KEY,
          category: "security",
          value: merged,
          description: "Role permission overrides for backend authorization",
          editableBy: ["SUPER_ADMIN", "ADMIN"],
          updatedBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    invalidatePermissionCache();
    return merged;
  }

  /**
   * Cập nhật thông tin user
   */
  static async updateUser(userId, updateData) {
    // Chỉ cho phép cập nhật các field được phép
    const allowedFields = [
      "name",
      "phone",
      "address",
      "birthday",
      "avatar",
      "avatarUrl",
      "bankAccount",
      "bankName",
      "taxId",
      "healthInsuranceId",
    ];

    const updateFields = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Chuyển đổi birthday từ string sang Date nếu có
        if (field === "birthday" && updateData[field]) {
          updateFields[field] = new Date(updateData[field]);
        } else if (field === "bankAccount") {
          const prepared = prepareBankAccountForStorage(updateData[field]);
          if (prepared !== undefined) {
            updateFields[field] = prepared;
          }
        } else {
          updateFields[field] = updateData[field];
        }
      }
    }

    // Đồng bộ avatar và avatarUrl
    if (updateFields.avatar && !updateFields.avatarUrl) {
      updateFields.avatarUrl = updateFields.avatar;
    }
    if (updateFields.avatarUrl && !updateFields.avatar) {
      updateFields.avatar = updateFields.avatarUrl;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu để cập nhật");
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return applyBankAccountToUser(user, BANK_ACCOUNT_MODES.REVEAL);
  }

  /**
   * Lấy thông tin user theo ID
   */
  static async getUserById(userId) {
    const user = await UserModel.findById(userId)
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return applyBankAccountToUser(user, BANK_ACCOUNT_MODES.REVEAL);
  }

  /**
   * Đổi mật khẩu
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    return { message: "Đổi mật khẩu thành công" };
  }

  static async getAllUsers(options = {}, companyId = null) {
    const {
      page,
      limit,
      search = "",
      role = "",
      department = "",
      shift = "",
      isActive
    } = options;

    const query = {};
    if (companyId) query.companyId = companyId;

    // Search filter - tìm kiếm theo name, email
    // Note: Không thể search trực tiếp trên department vì nó là ObjectId reference
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];

      // Nếu muốn search theo tên phòng ban, tìm trong Department model trước
      try {
        const deptSearchFilter = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } }
          ]
        };
        if (companyId) deptSearchFilter.companyId = companyId;
        const departments = await DepartmentModel.find(deptSearchFilter).select('_id');

        if (departments.length > 0) {
          const departmentIds = departments.map(d => d._id);
          query.$or.push({ department: { $in: departmentIds } });
        }
      } catch (err) {
        // Nếu có lỗi khi tìm department, bỏ qua
        console.warn('[UserService] Error searching departments:', err.message);
      }
    }

    // Role filter
    if (role && role !== "all") {
      query.role = role;
    }

    // Department filter - department có thể là ObjectId hoặc tên phòng ban
    if (department && department !== "all") {
      // Kiểm tra xem department có phải là ObjectId hợp lệ không
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        // Nếu không phải ObjectId, tìm Department theo name hoặc code
        try {
          const deptLookup = {
            $or: [
              { name: { $regex: department, $options: "i" } },
              { code: { $regex: department, $options: "i" } }
            ]
          };
          if (companyId) deptLookup.companyId = companyId;
          const dept = await DepartmentModel.findOne(deptLookup).select('_id');

          if (dept) {
            query.department = dept._id;
          } else {
            // Nếu không tìm thấy, set query để không trả về kết quả nào
            query.department = null;
          }
        } catch (err) {
          console.warn('[UserService] Error finding department:', err.message);
          query.department = null;
        }
      }
    }

    // Shift filter
    if (shift && shift !== "all") {
      if (mongoose.Types.ObjectId.isValid(shift)) {
        query.defaultShiftId = shift;
      } else {
        // Nếu không phải ObjectId, có thể là "none" để lọc nhân viên chưa có ca
        if (shift === "none" || shift === "null") {
          query.$or = [
            { defaultShiftId: null },
            { defaultShiftId: { $exists: false } }
          ];
        }
      }
    }

    // Status filter
    if (isActive !== undefined) {
      if (isActive === "true" || isActive === true) {
        query.isActive = true;
      } else if (isActive === "false" || isActive === false) {
        query.isActive = false;
      }
    }

    // Nếu có page và limit thì dùng server-side pagination
    // Nếu không có thì trả về tất cả (cho client-side pagination)
    let users, total;

    if (page !== undefined && limit !== undefined) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const skip = (pageNum - 1) * limitNum;

      [users, total] = await Promise.all([
        UserModel.find(query)
          .select("-password -otp -otpExpires")
          .populate("branch", "name address")
          .populate("department", "name code")
          .populate("defaultShiftId", "name startTime endTime")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        UserModel.countDocuments(query)
      ]);

      return {
        users: users.map((user) => applyBankAccountToUser(user, BANK_ACCOUNT_MODES.MASKED)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } else {
      // Trả về tất cả users (cho client-side pagination)
      [users, total] = await Promise.all([
        UserModel.find(query)
          .select("-password -otp -otpExpires")
          .populate("branch", "name address")
          .populate("department", "name code")
          .populate("defaultShiftId", "name startTime endTime")
          .sort({ createdAt: -1 }),
        UserModel.countDocuments(query)
      ]);

      // Trả về format phù hợp với frontend (frontend expect result.users || result)
      return {
        users: users.map((user) => applyBankAccountToUser(user, BANK_ACCOUNT_MODES.MASKED)),
        pagination: {
          total,
          totalPages: 1
        }
      };
    }
  }

  static async getUserByIdForAdmin(userId, requester = null) {
    const user = await UserModel.findById(userId)
      .select("-password -otp -otpExpires")
      .populate("branch", "name address")
      .populate("department", "name code")
      .populate("defaultShiftId", "name startTime endTime breakDuration isFlexible description");

    if (!user) {
      throw new Error("User not found");
    }

    if (requester && !canAccessUserTenant(requester, user)) {
      throw new TenantAccessError();
    }

    const bankAccountMode = canRevealBankAccountForRequester(requester)
      ? BANK_ACCOUNT_MODES.REVEAL
      : BANK_ACCOUNT_MODES.MASKED;

    return applyBankAccountToUser(user, bankAccountMode);
  }

  static async updateUserByAdmin(userId, updateData, currentUserRole = null, requester = null) {
    const allowedFields = [
      "name",
      "email",
      "phone",
      "role",
      "department",
      "position",
      "branch",
      "defaultShiftId",
      "isActive",
      "avatar",
      "avatarUrl",
      "taxId"
    ];

    const updateFields = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        // Xử lý đặc biệt cho defaultShiftId: empty string -> null
        if (field === "defaultShiftId") {
          updateFields[field] = updateData[field] === "" || updateData[field] === null ? null : updateData[field];
        } else {
          updateFields[field] = updateData[field];
        }
      }
    }

    // Đồng bộ avatar và avatarUrl
    if (updateFields.avatar && !updateFields.avatarUrl) {
      updateFields.avatarUrl = updateFields.avatar;
    }
    if (updateFields.avatarUrl && !updateFields.avatar) {
      updateFields.avatar = updateFields.avatarUrl;
    }

    if (Object.keys(updateFields).length === 0) {
      throw new Error("Không có dữ liệu để cập nhật");
    }

    // Kiểm tra phân quyền role assignment nếu có thay đổi role
    if (updateFields.role && currentUserRole) {
      // Use centralized role hierarchy check
      if (!canManageRole(currentUserRole, updateFields.role)) {
        throw new Error(`Bạn không có quyền phân quyền role ${updateFields.role}`);
      }
    }

    // Validate email format nếu có thay đổi email
    if (updateFields.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateFields.email)) {
        throw new Error("Email không hợp lệ");
      }
    }

    // Validate phone format nếu có thay đổi phone
    if (updateFields.phone && updateFields.phone.trim().length > 0) {
      const phoneRegex = /^[0-9]{10,11}$/;
      const cleanPhone = updateFields.phone.replace(/\s/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        throw new Error("Số điện thoại phải có 10-11 chữ số");
      }
      updateFields.phone = cleanPhone;
    }

    // Lấy target user trước khi resolve department/branch để biết tenant scope
    const currentUser = await UserModel.findById(userId)
      .select("defaultShiftId companyId")
      .lean();
    if (!currentUser) {
      throw new Error("User not found");
    }
    if (requester && !canAccessUserTenant(requester, currentUser)) {
      throw new TenantAccessError();
    }
    const tenantCompanyId = currentUser?.companyId ?? null;

    // Convert department từ string (code/name) sang ObjectId nếu cần
    if (updateFields.department !== undefined) {
      // Nếu là string rỗng hoặc null, set thành null để xóa department
      if (updateFields.department === null || (typeof updateFields.department === "string" && updateFields.department.trim() === "")) {
        updateFields.department = null;
      } else if (updateFields.department) {
        // Kiểm tra xem có phải là ObjectId hợp lệ không
        if (mongoose.Types.ObjectId.isValid(updateFields.department)) {
          // Đã là ObjectId hợp lệ, convert sang ObjectId type để Mongoose xử lý đúng reference
          updateFields.department = new mongoose.Types.ObjectId(updateFields.department);
        } else {
          // Không phải ObjectId, tìm Department theo name hoặc code (fallback cho các API khác)
          const searchValue = String(updateFields.department).trim().toUpperCase();
          const deptLookup = {
            $or: [
              { name: { $regex: new RegExp(`^${String(updateFields.department).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { code: searchValue }
            ],
            status: "active"
          };
          if (tenantCompanyId) deptLookup.companyId = tenantCompanyId;
          const department = await DepartmentModel.findOne(deptLookup).select("_id");

          if (!department) {
            throw new Error(`Không tìm thấy phòng ban với mã/tên: ${updateFields.department}`);
          }
          updateFields.department = department._id;
        }
      }
    }

    // Convert branch từ string (code/name) sang ObjectId nếu cần
    if (updateFields.branch !== undefined) {
      // Nếu là string rỗng hoặc null, set thành null để xóa branch
      if (updateFields.branch === null || (typeof updateFields.branch === "string" && updateFields.branch.trim() === "")) {
        updateFields.branch = null;
      } else if (updateFields.branch) {
        // Kiểm tra xem có phải là ObjectId hợp lệ không
        if (mongoose.Types.ObjectId.isValid(updateFields.branch)) {
          // Đã là ObjectId hợp lệ, convert sang ObjectId type để Mongoose xử lý đúng reference
          updateFields.branch = new mongoose.Types.ObjectId(updateFields.branch);
        } else {
          // Không phải ObjectId, tìm Branch theo name hoặc code (fallback cho các API khác)
          const searchValue = String(updateFields.branch).trim().toUpperCase();
          const branchLookup = {
            $or: [
              { name: { $regex: new RegExp(`^${String(updateFields.branch).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
              { code: searchValue }
            ],
            status: "active"
          };
          if (tenantCompanyId) branchLookup.companyId = tenantCompanyId;
          const branch = await BranchModel.findOne(branchLookup).select("_id");

          if (!branch) {
            throw new Error(`Không tìm thấy chi nhánh với mã/tên: ${updateFields.branch}`);
          }
          updateFields.branch = branch._id;
        }
      }
    }

    // Validate name nếu có thay đổi
    if (updateFields.name !== undefined) {
      if (!updateFields.name || updateFields.name.trim().length === 0) {
        throw new Error("Tên không được để trống");
      }
      if (updateFields.name.trim().length < 2) {
        throw new Error("Tên phải có ít nhất 2 ký tự");
      }
      updateFields.name = updateFields.name.trim();
    }

    // Validate role nếu có thay đổi
    if (updateFields.role) {
      const validRoles = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"];
      if (!validRoles.includes(updateFields.role)) {
        throw new Error("Role không hợp lệ");
      }
    }

    const oldDefaultShiftId = currentUser?.defaultShiftId?.toString();
    const newDefaultShiftId = updateFields.defaultShiftId?.toString();

    // Nếu có thay đổi defaultShiftId, có 2 cách xử lý:
    // 1. Nếu muốn full time (tất cả các ngày) → cập nhật defaultShiftId và vô hiệu hóa assignments
    // 2. Nếu muốn assignment mới (theo pattern) → tạo assignment mới
    // Đối với màn quản lý nhân viên hiện tại: coi đây là ca làm việc mặc định (full time) → dùng cách 1
    if (updateFields.defaultShiftId !== undefined && oldDefaultShiftId !== newDefaultShiftId) {
      if (newDefaultShiftId) {
        try {
          const { shiftAssignmentService } = await import('../shifts/shiftAssignment.service.js');
          // Gán ca làm việc full time cho nhân viên (sử dụng defaultShiftId)
          await shiftAssignmentService.assignShiftToUser(userId.toString(), newDefaultShiftId, {
            isFullTime: true,
          });
        } catch (assignmentError) {
          console.error(`[UserService] Error creating assignment for user ${userId}:`, assignmentError);
          // Nếu tạo assignment thất bại, vẫn tiếp tục cập nhật defaultShiftId bên dưới
        }
      } else {
        // Nếu xóa defaultShiftId (set về null/empty), vô hiệu hóa tất cả assignments
        try {
          const { EmployeeShiftAssignmentModel } = await import('../shifts/employeeShiftAssignment.model.js');
          await EmployeeShiftAssignmentModel.updateMany(
            { userId: userId.toString(), isActive: true },
            { $set: { isActive: false } }
          );
        } catch (assignmentError) {
          console.error(`[UserService] Error deactivating assignments for user ${userId}:`, assignmentError);
        }
      }
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpires").populate("branch", "name address").populate("department", "name code").populate("defaultShiftId");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Bật/tắt chế độ chấm công remote cho nhân viên (Admin/HR)
   */
  static async setRemoteStatus(userId, isRemote, approvedBy = null) {
    const update = {
      isRemote: !!isRemote,
      remoteApprovedBy: isRemote ? approvedBy : null,
    };

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    // Invalidate cache để isUserRemote() lấy giá trị mới ngay
    try {
      await redisDel(`user_remote:${userId}`);
    } catch (err) {
      console.warn("[UserService] Không thể xóa cache user_remote:", err.message);
    }

    return user;
  }

  /**
   * Cập nhật avatar cho user
   */
  static async updateAvatar(userId, avatarUrl) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarUrl, avatarUrl } },
      { new: true, runValidators: true }
    )
      .select("-password -otp -otpExpires")
      .populate("department", "name code")
      .populate("branch", "name address");

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  /**
   * Tạo user mới bởi admin
   */
  static async createUserByAdmin(userData, adminRole, companyId = null) {
    const { email, password, name, role, department, position, branch, phone, taxId, defaultShiftId, isActive = true } = userData;

    // Validate required fields
    if (!email || !password || !name || !role) {
      throw new Error("Email, password, name và role là bắt buộc");
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Email không hợp lệ");
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    // Validate name length
    if (normalizedName.length < 2) {
      throw new Error("Tên phải có ít nhất 2 ký tự");
    }

    // Validate role - không cho phép tạo user với role TRIAL
    const validRoles = ["SUPER_ADMIN", "ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"];
    if (!validRoles.includes(role)) {
      throw new Error("Role không hợp lệ. Chỉ được phép tạo user với role: SUPER_ADMIN, ADMIN, HR_MANAGER, MANAGER, EMPLOYEE");
    }

    // Check if admin can assign this role
    if (!canManageRole(adminRole, role)) {
      throw new Error("Bạn không có quyền phân quyền này");
    }

    // Check if email already exists
    const existed = await UserModel.findOne({ email: normalizedEmail });
    if (existed) {
      throw new Error("Email đã được đăng ký");
    }

    // Validate department if provided (scope theo tenant để tránh gán chéo công ty)
    if (department) {
      const deptFilter = { _id: department };
      if (companyId) deptFilter.companyId = companyId;
      const deptExists = await DepartmentModel.findOne(deptFilter);
      if (!deptExists) {
        throw new Error("Phòng ban không tồn tại");
      }
    }

    // Validate branch if provided (scope theo tenant để tránh gán chéo công ty)
    if (branch) {
      const branchFilter = { _id: branch };
      if (companyId) branchFilter.companyId = companyId;
      const branchExists = await BranchModel.findOne(branchFilter);
      if (!branchExists) {
        throw new Error("Chi nhánh không tồn tại");
      }
    }

    // Validate phone if provided
    if (phone && phone.trim().length > 0) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        throw new Error("Số điện thoại phải có 10-11 chữ số");
      }
    }

    // Create user
    const user = await UserModel.create({
      email: normalizedEmail,
      password,
      name: normalizedName,
      role,
      department: department || null,
      position: position ? position.trim() : null,
      branch: branch || null,
      phone: phone ? phone.trim() : null,
      taxId: taxId ? taxId.trim() : null,
      defaultShiftId: defaultShiftId || null,
      isActive,
      isVerified: true, // Admin created users are automatically verified
      ...(companyId ? { companyId } : {}),
    });

    return user;
  }

  /**
   * Chuẩn hóa row dữ liệu từ Excel/CSV dựa trên fuzzy matching tiêu đề cột.
   * Giúp import thành công ngay cả khi các cột bị xáo trộn vị trí hoặc đổi tên tiếng Việt/Anh.
   */
  static normalizeRow(row) {
    const normalized = {
      name: "",
      email: "",
      password: "",
      role: "",
      department: "",
      branch: "",
      position: "",
      phone: "",
      taxId: ""
    };

    const HEADER_MAPPINGS = {
      name: ["name", "họ tên", "ho ten", "họ và tên", "ho va ten", "full name", "fullname", "tên", "ten", "nhân viên", "nhan vien"],
      email: ["email", "thư điện tử", "thu dien tu", "mail", "địa chỉ email", "dia chi email"],
      password: ["password", "mật khẩu", "mat khau", "pass", "pwd"],
      role: ["role", "vai trò", "vai tro", "chức vụ hệ thống", "chuc vu he thong", "phân quyền", "phan quyen"],
      department: ["department", "phòng ban", "phong ban", "phòng", "phong", "bộ phận", "bo phan"],
      branch: ["branch", "chi nhánh", "chi nhanh", "văn phòng", "van phong", "cơ sở", "co so"],
      position: ["position", "chức vụ", "chuc vu", "vị trí", "vi tri", "vị trí làm việc", "vi tri lam viec", "chức danh", "chuc danh"],
      phone: ["phone", "số điện thoại", "so dien thoai", "sđt", "sdt", "điện thoại", "dien thoai", "mobile", "tel"],
      taxId: ["taxid", "mã số thuế", "ma so thue", "mst", "tax id", "tax_id"]
    };

    const removeAccents = (str) => {
      if (!str || typeof str !== 'string') return '';
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
    };

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = removeAccents(key);
      
      let matchedField = null;
      for (const [field, synonyms] of Object.entries(HEADER_MAPPINGS)) {
        const matchFound = synonyms.some(syn => {
          const cleanSyn = removeAccents(syn);
          return cleanKey === cleanSyn || cleanKey.includes(cleanSyn) || cleanSyn.includes(cleanKey);
        });
        
        if (matchFound) {
          matchedField = field;
          break;
        }
      }

      if (matchedField) {
        normalized[matchedField] = value !== undefined && value !== null ? String(value).trim() : "";
      }
    }

    return normalized;
  }

  /**
   * Bulk import users từ array rows (parsed từ CSV/Excel)
   * Mỗi row được chuẩn hóa thông qua normalizeRow
   * department/branch có thể là tên (string) — sẽ tự lookup ID
   */
  static async bulkImportUsers(rows, adminRole, companyId = null) {
    // Pre-load departments và branches trong cùng tenant để tránh N+1 queries
    const tenantScope = companyId ? { companyId } : {};
    const [allDepts, allBranches] = await Promise.all([
      DepartmentModel.find(tenantScope, "_id name").lean(),
      BranchModel.find(tenantScope, "_id name").lean(),
    ]);

    const deptMap = Object.fromEntries(
      allDepts.map(d => [d.name.trim().toLowerCase(), d._id])
    );
    const branchMap = Object.fromEntries(
      allBranches.map(b => [b.name.trim().toLowerCase(), b._id])
    );

    const results = { created: [], failed: [] };

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const row = UserService.normalizeRow(rawRow);
      const rowNum = i + 2; // 1-indexed + header row

      try {
        const { name, email, password, role, department, branch, position, phone, taxId } = row;

        if (!name || !email || !password || !role) {
          results.failed.push({ row: rowNum, email: email || '', reason: 'Thiếu name, email, password hoặc role (đã được fuzzy-matched)' });
          continue;
        }

        // Resolve department/branch name → ObjectId
        let deptId = null;
        if (department && department.trim()) {
          const key = department.trim().toLowerCase();
          deptId = mongoose.Types.ObjectId.isValid(department)
            ? department
            : deptMap[key] || null;
          if (!deptId) {
            results.failed.push({ row: rowNum, email, reason: `Không tìm thấy phòng ban: "${department}"` });
            continue;
          }
        }

        let branchId = null;
        if (branch && branch.trim()) {
          const key = branch.trim().toLowerCase();
          branchId = mongoose.Types.ObjectId.isValid(branch)
            ? branch
            : branchMap[key] || null;
          if (!branchId) {
            results.failed.push({ row: rowNum, email, reason: `Không tìm thấy chi nhánh: "${branch}"` });
            continue;
          }
        }

        const user = await UserService.createUserByAdmin(
          { email, password, name, role, department: deptId, branch: branchId, position, phone, taxId },
          adminRole,
          companyId
        );

        results.created.push({ row: rowNum, email: user.email, name: user.name });
      } catch (err) {
        results.failed.push({ row: rowNum, email: row.email || '', reason: err.message });
      }
    }

    return results;
  }
}

