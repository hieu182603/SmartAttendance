import { CalendarEventModel } from "../calendar/calendar.model.js";

/**
 * Lấy tất cả events với filter
 */
export const getAllEvents = async (req, res) => {
  try {
    const {
      type,
      month,
      year,
      startDate,
      endDate,
      visibility = "public",
      isActive = true,
    } = req.query;

    const query = { isActive: isActive === "true" || isActive === true };

    // Filter by type
    if (type && type !== "all") {
      query.type = type;
    }

    // Filter by visibility
    if (visibility) {
      query.visibility = visibility;
    }

    // Filter by month and year
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const events = await CalendarEventModel.find(query)
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy events trong 7 ngày tới
 */
export const getUpcomingEvents = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    const events = await CalendarEventModel.find({
      date: { $gte: today, $lte: nextWeek },
      isActive: true,
    })
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy events trong tháng hiện tại
 */
export const getMonthEvents = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();

    const targetMonth = month ? parseInt(month, 10) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : currentDate.getFullYear();

    const start = new Date(targetYear, targetMonth - 1, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const events = await CalendarEventModel.find({
      date: { $gte: start, $lte: end },
      isActive: true,
    })
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy event theo ID
 */
export const getEventById = async (req, res) => {
  try {
    const event = await CalendarEventModel.findById(req.params.id)
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name");

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Tạo event mới
 */
export const createEvent = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const eventData = {
      ...req.body,
      createdBy: userId,
    };

    const newEvent = await CalendarEventModel.create(eventData);
    const populatedEvent = await CalendarEventModel.findById(newEvent._id)
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name");

    res.status(201).json({ success: true, data: populatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Cập nhật event
 */
export const updateEvent = async (req, res) => {
  try {
    const updatedEvent = await CalendarEventModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("attendees", "name email")
      .populate("createdBy", "name email")
      .populate("departmentId", "name")
      .populate("branchId", "name");

    if (!updatedEvent) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Xóa event
 */
export const deleteEvent = async (req, res) => {
  try {
    const deleted = await CalendarEventModel.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lấy thống kê events
 */
export const getEventStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();

    const targetMonth = month ? parseInt(month, 10) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : currentDate.getFullYear();

    const start = new Date(targetYear, targetMonth - 1, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    // Total events in month
    const totalEvents = await CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      isActive: true,
    });

    // Upcoming events (next 7 days)
    const upcomingCount = await CalendarEventModel.countDocuments({
      date: { $gte: today, $lte: nextWeek },
      isActive: true,
    });

    // Holidays in month
    const holidaysCount = await CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      type: "holiday",
      isActive: true,
    });

    // Meetings and training in month
    const meetingsTrainingCount = await CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      type: { $in: ["meeting", "training"] },
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        total: totalEvents,
        upcoming: upcomingCount,
        holidays: holidaysCount,
        meetingsAndTraining: meetingsTrainingCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

