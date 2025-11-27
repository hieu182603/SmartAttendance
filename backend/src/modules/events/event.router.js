import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole, ROLES } from "../../middleware/role.middleware.js";
import {
  getAllEvents,
  getUpcomingEvents,
  getMonthEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
} from "./event.controller.js";

export const eventRouter = Router();

// Public routes (authenticated users)
eventRouter.use(authMiddleware);

// Get all events with filters
eventRouter.get("/", getAllEvents);

// Get upcoming events (next 7 days)
eventRouter.get("/upcoming", getUpcomingEvents);

// Get events in a specific month
eventRouter.get("/month", getMonthEvents);

// Get event statistics
eventRouter.get("/stats", getEventStats);

// Get event by ID
eventRouter.get("/:id", getEventById);

// Create event (admin, HR, manager)
eventRouter.post(
  "/",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPER_ADMIN,
  ]),
  createEvent
);

// Update event (admin, HR, manager, or creator)
eventRouter.put(
  "/:id",
  requireRole([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.MANAGER,
    ROLES.SUPER_ADMIN,
  ]),
  updateEvent
);

// Delete event (admin, HR, super admin)
eventRouter.delete(
  "/:id",
  requireRole([ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.SUPER_ADMIN]),
  deleteEvent
);

