// modules/shifts/shift.router.js
import express from "express";
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
} from "./shift.controller.js";

const router = express.Router();

router.get("/", getAllShifts);
router.get("/:id", getShiftById);
router.post("/", createShift);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);

export const shiftRouter = router;
