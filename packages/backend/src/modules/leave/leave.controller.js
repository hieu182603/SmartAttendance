import mongoose from "mongoose";
import * as LeaveService from "./leave.service.js";

/**
 * GET /leave/balance
 * Lấy số ngày phép của user hiện tại
 */
export const getBalance = async (req, res) => {
  try {
    const userId = req.user?.userId; // Từ auth middleware
    
    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in token",
      });
    }
    
    const balance = await LeaveService.getLeaveBalance(userId);

    res.json(balance);
  } catch (error) {
    console.error("Error in getBalance:", error);
    
    // Xử lý các loại lỗi khác nhau
    if (error.message === "User not found") {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    res.status(500).json({
      message: error.message || "Không thể lấy số ngày phép",
    });
  }
};

/**
 * GET /leave/history
 * Lấy lịch sử nghỉ phép của user hiện tại
 * Query params: limit, skip, status
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user?.userId; // Từ auth middleware
    
    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in token",
      });
    }
    
    const { limit, skip, status } = req.query;

    // Validate và parse query parameters
    const options = {
      limit: limit ? Math.max(1, Math.min(100, parseInt(limit))) : 50, // Giới hạn 1-100
      skip: skip ? Math.max(0, parseInt(skip)) : 0,
      status: status && ["pending", "approved", "rejected"].includes(status) ? status : undefined,
    };

    const history = await LeaveService.getLeaveHistory(userId, options);

    res.json(history);
  } catch (error) {
    console.error("Error in getHistory:", error);
    res.status(500).json({
      message: error.message || "Không thể lấy lịch sử nghỉ phép",
    });
  }
};

/**
 * PATCH /leave/balance/:userId
 * HR/Admin điều chỉnh quota ngày phép cho một user
 * Body: { leaveType: string, total: number }
 */
export const adjustBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const { leaveType, total } = req.body;
    if (!leaveType || total === undefined) {
      return res.status(400).json({ message: "Thiếu leaveType hoặc total" });
    }

    const result = await LeaveService.adjustLeaveBalance(userId, leaveType, Number(total));
    res.json({ message: "Cập nhật quota ngày phép thành công", data: result });
  } catch (error) {
    const status = error.message === "User not found" ? 404 : 400;
    res.status(status).json({ message: error.message || "Không thể cập nhật ngày phép" });
  }
};

