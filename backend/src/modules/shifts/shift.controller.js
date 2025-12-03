import { ShiftModel } from "./shift.model.js";
import { shiftAssignmentService } from "./shiftAssignment.service.js";
/** * Lấy toàn bộ danh sách các ca làm việc */ export const getAllShifts =
  async (req, res) => {
    try {
      const shifts = await ShiftModel.find().sort({ createdAt: -1 });
      res.json({ success: true, data: shifts });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
/** * Lấy 1 ca làm việc theo ID */ export const getShiftById = async (
    req,
    res
  ) => {
  try {
    const shift = await ShiftModel.findById(req.params.id);
    if (!shift)
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/** * Tạo mới 1 ca làm */ export const createShift = async (req, res) => {
  try {
    const newShift = await ShiftModel.create(req.body);
    res.status(201).json({ success: true, data: newShift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/** * Cập nhật ca làm */ export const updateShift = async (req, res) => {
  try {
    const updatedShift = await ShiftModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedShift)
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    res.json({ success: true, data: updatedShift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/** * Xóa ca làm */ export const deleteShift = async (req, res) => {
  try {
    const deleted = await ShiftModel.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    res.json({ success: true, message: "Shift deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign shift cho nhân viên
 * POST /shifts/:shiftId/assign
 */
export const assignShiftToEmployee = async (req, res) => {
  try {
    const { userId, pattern, daysOfWeek, specificDates, effectiveFrom, effectiveTo, priority, notes } = req.body;
    const { shiftId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId là bắt buộc",
      });
    }

    const options = {};
    if (pattern) options.pattern = pattern;
    if (daysOfWeek) options.daysOfWeek = daysOfWeek;
    if (specificDates) options.specificDates = specificDates.map(d => new Date(d));
    if (effectiveFrom) options.effectiveFrom = effectiveFrom;
    if (effectiveTo) options.effectiveTo = effectiveTo;
    if (priority) options.priority = priority;
    if (notes) options.notes = notes;

    const result = await shiftAssignmentService.assignShiftToUser(userId, shiftId, options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Bulk assign shift cho nhiều nhân viên
 * POST /shifts/:shiftId/assign/bulk
 */
export const bulkAssignShift = async (req, res) => {
  try {
    const { userIds } = req.body;
    const { shiftId } = req.params;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds phải là một array không rỗng",
      });
    }

    const result = await shiftAssignmentService.bulkAssignShift(userIds, shiftId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Lấy danh sách nhân viên trong một ca
 * GET /shifts/:shiftId/employees
 */
export const getEmployeesByShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { page, limit, search } = req.query;

    const result = await shiftAssignmentService.getEmployeesByShift(shiftId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search: search || "",
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove shift assignment từ nhân viên
 * DELETE /shifts/:shiftId/assign/:userId
 */
export const removeShiftFromEmployee = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await shiftAssignmentService.removeShiftFromUser(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Lấy số lượng nhân viên trong mỗi ca
 * GET /shifts/employee-counts?date=YYYY-MM-DD
 */
export const getShiftEmployeeCounts = async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();

    const counts = await shiftAssignmentService.getShiftEmployeeCounts(checkDate);
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy assignments của nhân viên
 * GET /shifts/assignments/user/:userId
 */
export const getUserAssignments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, date } = req.query;

    const assignments = await shiftAssignmentService.getUserAssignments(userId, {
      isActive: isActive === 'false' ? false : true,
      date: date ? new Date(date) : undefined,
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update assignment
 * PUT /shifts/assignments/:assignmentId
 */
export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updateData = req.body;

    const assignment = await shiftAssignmentService.updateAssignment(assignmentId, updateData);
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Deactivate assignment
 * DELETE /shifts/assignments/:assignmentId
 */
export const deactivateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await shiftAssignmentService.deactivateAssignment(assignmentId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Lấy shift của nhân viên hiện tại cho một ngày
 * GET /shifts/my-shift?date=YYYY-MM-DD
 */
export const getMyShift = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();

    const shift = await shiftAssignmentService.getUserShift(userId, checkDate);

    if (!shift) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy schedule của nhân viên hiện tại trong khoảng thời gian
 * GET /shifts/my-schedule?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getMySchedule = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);

    const { EmployeeScheduleModel } = await import('../schedule/schedule.model.js');
    const { scheduleGenerationService } = await import('../schedule/scheduleGeneration.service.js');

    const existingSchedules = await EmployeeScheduleModel.find({
      userId,
      date: { $gte: start, $lte: end },
    })
      .populate('shiftId', 'name startTime endTime breakDuration')
      .lean();

    const scheduleMap = new Map();
    existingSchedules.forEach((sched) => {
      const dateStr = sched.date.toISOString().split('T')[0];
      scheduleMap.set(dateStr, {
        userId: sched.userId.toString(),
        date: dateStr,
        shiftId: sched.shiftId?._id?.toString() || sched.shiftId?.toString(),
        shiftName: sched.shiftName || sched.shiftId?.name,
        startTime: sched.startTime || sched.shiftId?.startTime,
        endTime: sched.endTime || sched.shiftId?.endTime,
        status: sched.status,
        location: sched.location,
        team: sched.team,
        notes: sched.notes,
        leaveRequestId: sched.leaveRequestId?.toString(),
      });
    });

    const generatedSchedules = await scheduleGenerationService.generateScheduleFromAssignments(userId, start, end);

    const finalSchedules = generatedSchedules.map((genSched) => {
      const dateStr = genSched.date instanceof Date
        ? genSched.date.toISOString().split('T')[0]
        : new Date(genSched.date).toISOString().split('T')[0];

      const existing = scheduleMap.get(dateStr);
      if (existing) {
        return existing;
      }

      return {
        userId: genSched.userId?.toString() || userId.toString(),
        date: dateStr,
        shiftId: genSched.shiftId?.toString(),
        shiftName: genSched.shiftName,
        startTime: genSched.startTime,
        endTime: genSched.endTime,
        status: genSched.status || 'scheduled',
        location: genSched.location,
        team: genSched.team,
        notes: genSched.notes,
      };
    });

    res.json({ success: true, data: finalSchedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
