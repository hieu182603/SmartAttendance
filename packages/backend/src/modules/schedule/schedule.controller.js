import { EmployeeScheduleModel } from "./schedule.model.js";
import { scheduleGenerationService } from "./scheduleGeneration.service.js";

export const getMySchedule = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { startDate, endDate, status } = req.query;
    const query = { userId };
    if (status) query.status = status;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const schedules = await EmployeeScheduleModel.find(query)
      .populate("shiftId", "name startTime endTime")
      .sort({ date: 1 });

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const { userId, startDate, endDate, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user?.companyId) query.companyId = req.user.companyId;
    if (userId) query.userId = userId;
    if (status) query.status = status;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [schedules, total] = await Promise.all([
      EmployeeScheduleModel.find(query)
        .populate("userId", "name email")
        .populate("shiftId", "name startTime endTime")
        .sort({ date: 1, userId: 1 })
        .skip(skip)
        .limit(Number(limit)),
      EmployeeScheduleModel.countDocuments(query),
    ]);

    res.json({ success: true, data: schedules, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getScheduleById = async (req, res) => {
  try {
    const schedule = await EmployeeScheduleModel.findById(req.params.id)
      .populate("userId", "name email")
      .populate("shiftId", "name startTime endTime");

    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateSchedule = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "userId, startDate, endDate required" });
    }

    const result = await scheduleGenerationService.createOrUpdateSchedule(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const batchGenerateSchedule = async (req, res) => {
  try {
    const { userIds, startDate, endDate } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0 || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "userIds (array), startDate, endDate required" });
    }

    const result = await scheduleGenerationService.batchCreateOrUpdateSchedule(
      userIds,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const schedule = await EmployeeScheduleModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("userId", "name email")
      .populate("shiftId", "name startTime endTime");

    if (!schedule) return res.status(404).json({ success: false, message: "Schedule not found" });
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const deleted = await EmployeeScheduleModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Schedule not found" });
    res.json({ success: true, message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
