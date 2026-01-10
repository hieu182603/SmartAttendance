import { z } from "zod";
import { SalaryMatrixModel } from "./salary-matrix.model.js";
import { UserModel } from "../users/user.model.js";
import { logActivity } from "../../utils/logger.util.js";

const createSalaryMatrixSchema = z.object({
  departmentCode: z.string().min(1, "Mã phòng ban không được để trống"),
  position: z.string().min(1, "Chức vụ không được để trống"),
  baseSalary: z.number().min(0, "Lương phải >= 0"),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSalaryMatrixSchema = z.object({
  baseSalary: z.number().min(0, "Lương phải >= 0").optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateUserBaseSalarySchema = z.object({
  baseSalary: z
    .union([z.number().min(0, "Lương phải >= 0"), z.null()])
    .optional(),
});

export const getSalaryMatrix = async (req, res) => {
  try {
    const { departmentCode, position, isActive, page = 1, limit = 100 } = req.query;

    const query = {};
    if (departmentCode) {
      query.departmentCode = departmentCode.toUpperCase();
    }
    if (position) {
      query.position = { $regex: position, $options: "i" };
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      SalaryMatrixModel.find(query)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({ departmentCode: 1, position: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SalaryMatrixModel.countDocuments(query),
    ]);

    res.json({
      records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[payroll] get salary matrix error", error);
    res.status(500).json({ message: "Không lấy được danh sách ma trận lương" });
  }
};

export const getSalaryMatrixById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await SalaryMatrixModel.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy ma trận lương" });
    }

    res.json({ data: record });
  } catch (error) {
    console.error("[payroll] get salary matrix by id error", error);
    res.status(500).json({ message: "Không lấy được chi tiết ma trận lương" });
  }
};

export const createSalaryMatrix = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const parse = createSalaryMatrixSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.flatten();
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const data = parse.data;
    data.departmentCode = data.departmentCode.toUpperCase();

    const existing = await SalaryMatrixModel.findOne({
      departmentCode: data.departmentCode,
      position: data.position,
    });

    if (existing) {
      return res.status(409).json({
        message: `Đã tồn tại lương cho ${data.departmentCode} - ${data.position}`,
      });
    }

    const record = await SalaryMatrixModel.create({
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });

    const created = await SalaryMatrixModel.findById(record._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    // Log activity
    await logActivity({
      userId,
      action: "CREATE",
      entityType: "SALARY_MATRIX",
      entityId: record._id.toString(),
      description: `Tạo ma trận lương: ${data.departmentCode} - ${data.position} - ${data.baseSalary.toLocaleString()} VNĐ`,
      metadata: { departmentCode: data.departmentCode, position: data.position },
    });

    res.status(201).json({
      data: created,
      message: "Đã tạo ma trận lương thành công",
    });
  } catch (error) {
    console.error("[payroll] create salary matrix error", error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Đã tồn tại ma trận lương cho department và position này",
      });
    }
    res.status(500).json({ message: "Không tạo được ma trận lương" });
  }
};

export const updateSalaryMatrix = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const parse = updateSalaryMatrixSchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.flatten();
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const record = await SalaryMatrixModel.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy ma trận lương" });
    }

    Object.assign(record, parse.data);
    record.updatedBy = userId;
    await record.save();

    const updated = await SalaryMatrixModel.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    // Log activity
    await logActivity({
      userId,
      action: "UPDATE",
      entityType: "SALARY_MATRIX",
      entityId: id,
      description: `Cập nhật ma trận lương: ${record.departmentCode} - ${record.position}`,
      metadata: parse.data,
    });

    res.json({
      data: updated,
      message: "Đã cập nhật ma trận lương thành công",
    });
  } catch (error) {
    console.error("[payroll] update salary matrix error", error);
    res.status(500).json({ message: "Không cập nhật được ma trận lương" });
  }
};

export const deleteSalaryMatrix = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const record = await SalaryMatrixModel.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Không tìm thấy ma trận lương" });
    }

    record.isActive = false;
    record.updatedBy = userId;
    await record.save();

    await logActivity({
      userId,
      action: "DELETE",
      entityType: "SALARY_MATRIX",
      entityId: id,
      description: `Xóa ma trận lương: ${record.departmentCode} - ${record.position}`,
      metadata: { departmentCode: record.departmentCode, position: record.position },
    });

    res.json({ message: "Đã xóa ma trận lương thành công" });
  } catch (error) {
    console.error("[payroll] delete salary matrix error", error);
    res.status(500).json({ message: "Không xóa được ma trận lương" });
  }
};

export const updateUserBaseSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const parse = updateUserBaseSalarySchema.safeParse(req.body);
    if (!parse.success) {
      const errors = parse.error.flatten();
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const oldSalary = user.baseSalary;
    const newSalary = parse.data.baseSalary;

    user.baseSalary = newSalary;
    await user.save();

    await logActivity({
      userId,
      action: "UPDATE",
      entityType: "USER_BASE_SALARY",
      entityId: id,
      description: `Cập nhật lương cơ bản cho ${user.name}: ${oldSalary?.toLocaleString() || "null"} → ${newSalary?.toLocaleString() || "null"} VNĐ`,
      metadata: { oldSalary, newSalary },
    });

    res.json({
      data: {
        _id: user._id,
        name: user.name,
        baseSalary: user.baseSalary,
      },
      message: "Đã cập nhật lương cơ bản thành công",
    });
  } catch (error) {
    console.error("[payroll] update user base salary error", error);
    res.status(500).json({ message: "Không cập nhật được lương cơ bản" });
  }
};

export const getUserSalaryInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id)
      .populate("department", "code name")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const { calculateBaseSalary } = await import("./payroll.service.js");
    const calculatedSalary = await calculateBaseSalary(user, user.department);

    let matrixSalary = null;
    if (user.department?.code && user.position) {
      const matrix = await SalaryMatrixModel.findOne({
        departmentCode: user.department.code,
        position: user.position,
        isActive: true,
      }).lean();
      if (matrix) {
        matrixSalary = matrix.baseSalary;
      }
    }

    res.json({
      data: {
        userId: user._id,
        name: user.name,
        department: user.department?.name || null,
        departmentCode: user.department?.code || null,
        position: user.position || null,
        baseSalary: user.baseSalary, // Lương trong User model
        matrixSalary, // Lương trong Salary Matrix (nếu có)
        calculatedSalary, // Lương cuối cùng được tính (theo logic fallback)
        source: user.baseSalary
          ? "USER_BASE_SALARY"
          : matrixSalary
            ? "SALARY_MATRIX"
            : "DEFAULT_CONFIG",
      },
    });
  } catch (error) {
    console.error("[payroll] get user salary info error", error);
    res.status(500).json({ message: "Không lấy được thông tin lương" });
  }
};

