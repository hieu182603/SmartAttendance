import { CalendarEventModel } from "../calendar/calendar.model.js";

const POPULATE_FIELDS = [
  { path: "attendees", select: "name email" },
  { path: "createdBy", select: "name email" },
  { path: "departmentId", select: "name" },
  { path: "branchId", select: "name" },
];

const applyPopulate = (query) => {
  POPULATE_FIELDS.forEach((p) => query.populate(p.path, p.select));
  return query;
};

export const getEvents = async ({
  type,
  month,
  year,
  startDate,
  endDate,
  visibility = "public",
  isActive = true,
} = {}) => {
  const query = { isActive: isActive === "true" || isActive === true };

  if (type && type !== "all") query.type = type;
  if (visibility) query.visibility = visibility;

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else if (month && year) {
    query.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  return applyPopulate(
    CalendarEventModel.find(query).sort({ date: 1, startTime: 1 })
  );
};

export const getUpcomingEvents = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  return applyPopulate(
    CalendarEventModel.find({
      date: { $gte: today, $lte: nextWeek },
      isActive: true,
    }).sort({ date: 1, startTime: 1 })
  );
};

export const getMonthEvents = async ({ month, year } = {}) => {
  const now = new Date();
  const m = month ? parseInt(month, 10) : now.getMonth() + 1;
  const y = year ? parseInt(year, 10) : now.getFullYear();

  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  return applyPopulate(
    CalendarEventModel.find({
      date: { $gte: start, $lte: end },
      isActive: true,
    }).sort({ date: 1, startTime: 1 })
  );
};

export const getEventById = async (id) => {
  return applyPopulate(CalendarEventModel.findById(id));
};

export const createEvent = async (data, createdBy) => {
  const created = await CalendarEventModel.create({ ...data, createdBy });
  return applyPopulate(CalendarEventModel.findById(created._id));
};

export const updateEvent = async (id, data) => {
  return applyPopulate(
    CalendarEventModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    })
  );
};

export const deleteEvent = async (id) => {
  return CalendarEventModel.findByIdAndDelete(id);
};

export const getEventStats = async ({ month, year } = {}) => {
  const now = new Date();
  const m = month ? parseInt(month, 10) : now.getMonth() + 1;
  const y = year ? parseInt(year, 10) : now.getFullYear();

  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  const [total, upcoming, holidays, meetingsAndTraining] = await Promise.all([
    CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      isActive: true,
    }),
    CalendarEventModel.countDocuments({
      date: { $gte: today, $lte: nextWeek },
      isActive: true,
    }),
    CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      type: "holiday",
      isActive: true,
    }),
    CalendarEventModel.countDocuments({
      date: { $gte: start, $lte: end },
      type: { $in: ["meeting", "training"] },
      isActive: true,
    }),
  ]);

  return { total, upcoming, holidays, meetingsAndTraining };
};
