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

