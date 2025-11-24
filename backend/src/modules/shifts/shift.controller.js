import { ShiftModel } from "./shift.model.js";
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
