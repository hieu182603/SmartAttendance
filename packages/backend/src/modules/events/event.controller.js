import * as eventService from "./event.service.js";

export const getAllEvents = async (req, res) => {
  try {
    const events = await eventService.getEvents(req.query);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUpcomingEvents = async (req, res) => {
  try {
    const events = await eventService.getUpcomingEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthEvents = async (req, res) => {
  try {
    const events = await eventService.getMonthEvents(req.query);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const event = await eventService.createEvent(req.body, userId);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEventStats = async (req, res) => {
  try {
    const stats = await eventService.getEventStats(req.query);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
