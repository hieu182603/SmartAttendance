import { PerformanceReviewModel } from "./performance.model.js";
import mongoose from "mongoose";

/**
 * Lấy danh sách đánh giá (có filter)
 */
export const getReviews = async (req, res) => {
  try {
    const { period, status, search, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    const filter = {};
    if (period && period !== "all") filter.period = period;
    if (status && status !== "all") filter.status = status;

    // Role-based filtering
    // Manager chỉ thấy đánh giá mà họ tạo
    if (userRole === "MANAGER") {
      filter.reviewerId = userId;
    }
    // HR_MANAGER, ADMIN, SUPER_ADMIN thấy tất cả

    const skip = (page - 1) * limit;

    // Search by employee name - cần populate trước rồi filter
    let query = PerformanceReviewModel.find(filter);

    // Nếu có search, dùng aggregation để search trong User collection
    if (search) {
      const searchRegex = new RegExp(search, "i");
      
      // Tìm users matching search
      const { UserModel } = await import("../users/user.model.js");
      const matchingUsers = await UserModel.find({
        name: searchRegex,
      }).select("_id");
      
      const userIds = matchingUsers.map((u) => u._id);
      if (userIds.length > 0) {
        filter.employeeId = { $in: userIds };
      } else {
        // Không tìm thấy user nào, trả về empty
        return res.json({
          reviews: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
          },
        });
      }
    }

    const [reviews, total] = await Promise.all([
      PerformanceReviewModel.find(filter)
        .populate("employeeId", "name position avatar avatarUrl")
        .populate("reviewerId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PerformanceReviewModel.countDocuments(filter),
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách đánh giá" });
  }
};

/**
 * Lấy thống kê đánh giá
 */
export const getStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Role-based filter
    const filter = {};
    if (userRole === "MANAGER") {
      filter.reviewerId = userId;
    }

    // Dùng aggregation để tối ưu performance
    const [stats] = await PerformanceReviewModel.aggregate([
      { $match: filter },
      {
        $facet: {
          total: [{ $count: "count" }],
          completed: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],
          pending: [{ $match: { status: "pending" } }, { $count: "count" }],
          avgScore: [
            { $match: { status: "completed" } },
            { $group: { _id: null, avg: { $avg: "$overallScore" } } },
          ],
        },
      },
    ]);

    res.json({
      total: stats.total[0]?.count || 0,
      completed: stats.completed[0]?.count || 0,
      pending: stats.pending[0]?.count || 0,
      avgScore: Math.round(stats.avgScore[0]?.avg || 0),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Lỗi khi lấy thống kê" });
  }
};

/**
 * Lấy chi tiết 1 đánh giá
 */
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const review = await PerformanceReviewModel.findById(id)
      .populate("employeeId", "name position avatar avatarUrl email")
      .populate("reviewerId", "name position");

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.json(review);
  } catch (error) {
    console.error("Get review by id error:", error);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết đánh giá" });
  }
};

/**
 * Tạo đánh giá mới
 */
export const createReview = async (req, res) => {
  try {
    const {
      employeeId,
      period,
      reviewDate,
      status,
      categories,
      achievements,
      improvements,
      comments,
    } = req.body;

    // reviewerId lấy từ user đang đăng nhập
    const reviewerId = req.user.userId;
    const userRole = req.user.role;

    if (!employeeId || !period) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin nhân viên hoặc kỳ đánh giá" });
    }

    // Validate employeeId exists
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
    }

    // Manager không thể set status = completed
    if (userRole === "MANAGER" && status === "completed") {
      return res.status(403).json({
        message: "Manager không thể phê duyệt đánh giá. Vui lòng gửi để HR phê duyệt.",
      });
    }

    // Kiểm tra đã có đánh giá cho employee trong period này chưa
    const existingReview = await PerformanceReviewModel.findOne({
      employeeId,
      period,
    });

    if (existingReview) {
      return res.status(400).json({
        message: `Đã có đánh giá cho nhân viên này trong kỳ ${period}`,
      });
    }

    const review = new PerformanceReviewModel({
      employeeId,
      period,
      reviewDate: reviewDate || new Date(),
      reviewerId,
      status: status || "draft",
      categories: categories || {},
      achievements: achievements || [],
      improvements: improvements || [],
      comments: comments || "",
      history: [
        {
          action: "created",
          by: reviewerId,
          at: new Date(),
          changes: { status: status || "draft" },
        },
      ],
    });

    await review.save();

    const populatedReview = await PerformanceReviewModel.findById(review._id)
      .populate("employeeId", "name position avatar avatarUrl")
      .populate("reviewerId", "name");

    res.status(201).json({
      message: "Tạo đánh giá thành công",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Lỗi khi tạo đánh giá" });
  }
};

/**
 * Cập nhật đánh giá
 */
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    // Kiểm tra quyền
    const existingReview = await PerformanceReviewModel.findById(id);
    if (!existingReview) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    // Manager chỉ sửa được đánh giá của mình và chỉ khi status là draft/pending/rejected
    if (userRole === "MANAGER") {
      if (existingReview.reviewerId.toString() !== userId) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền sửa đánh giá này" });
      }
      if (existingReview.status === "completed") {
        return res
          .status(403)
          .json({ message: "Không thể sửa đánh giá đã hoàn thành" });
      }
    }

    // Log changes for audit
    const changes = {};
    Object.keys(updateData).forEach((key) => {
      if (JSON.stringify(existingReview[key]) !== JSON.stringify(updateData[key])) {
        changes[key] = {
          from: existingReview[key],
          to: updateData[key],
        };
      }
    });

    // Add to history
    const historyEntry = {
      action: updateData.status === "completed" ? "approved" : "updated",
      by: userId,
      at: new Date(),
      changes,
    };

    // Update with history
    const review = await PerformanceReviewModel.findByIdAndUpdate(
      id,
      {
        ...updateData,
        $push: { history: historyEntry },
      },
      { new: true, runValidators: true }
    )
      .populate("employeeId", "name position avatar avatarUrl")
      .populate("reviewerId", "name")
      .populate("history.by", "name");

    res.json({
      message: "Cập nhật đánh giá thành công",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật đánh giá" });
  }
};

/**
 * Xóa đánh giá (chỉ ADMIN+)
 */
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Chỉ ADMIN và SUPER_ADMIN mới được xóa
    if (!["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa đánh giá" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const review = await PerformanceReviewModel.findByIdAndDelete(id);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.json({ message: "Xóa đánh giá thành công" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Lỗi khi xóa đánh giá" });
  }
};

/**
 * Lấy đánh giá của 1 nhân viên
 */
export const getReviewsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
    }

    // Employee chỉ xem được đánh giá của chính mình
    if (userRole === "EMPLOYEE" && employeeId !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn chỉ có thể xem đánh giá của chính mình" });
    }

    const reviews = await PerformanceReviewModel.find({ employeeId })
      .populate("reviewerId", "name position")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("Get reviews by employee error:", error);
    res
      .status(500)
      .json({ message: "Lỗi khi lấy đánh giá của nhân viên" });
  }
};

/**
 * Lấy đánh giá của chính mình (cho EMPLOYEE)
 */
export const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await PerformanceReviewModel.find({ 
      employeeId: userId,
      status: { $in: ["completed"] } // Chỉ thấy đánh giá đã hoàn thành
    })
      .populate("reviewerId", "name position")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ message: "Lỗi khi lấy đánh giá của bạn" });
  }
};

/**
 * HR reject đánh giá
 */
export const rejectReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userRole = req.user.role;

    // Chỉ HR+ mới reject được
    if (!["HR_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền reject đánh giá" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập lý do reject" });
    }

    const review = await PerformanceReviewModel.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
        $push: {
          history: {
            action: "rejected",
            by: req.user.userId,
            at: new Date(),
            changes: {
              status: { from: "pending", to: "rejected" },
              rejectionReason: rejectionReason.trim(),
            },
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("employeeId", "name position avatar avatarUrl")
      .populate("reviewerId", "name")
      .populate("history.by", "name");

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    // TODO: Send notification to reviewer
    // await notificationService.notifyReviewRejected(review);

    res.json({
      message: "Đã reject đánh giá",
      review,
    });
  } catch (error) {
    console.error("Reject review error:", error);
    res.status(500).json({ message: "Lỗi khi reject đánh giá" });
  }
};

/**
 * Lấy danh sách periods có trong database
 */
export const getAvailablePeriods = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Role-based filter
    const filter = {};
    if (userRole === "MANAGER") {
      filter.reviewerId = userId;
    }

    // Get distinct periods
    const periods = await PerformanceReviewModel.distinct("period", filter);

    // Sort periods (newest first)
    const sortedPeriods = periods.sort((a, b) => {
      const yearA = parseInt(a.match(/\d{4}/)?.[0] || "0");
      const yearB = parseInt(b.match(/\d{4}/)?.[0] || "0");
      if (yearA !== yearB) return yearB - yearA;

      // Sort by period within same year
      const periodOrder = { Q4: 4, Q3: 3, Q2: 2, Q1: 1, H2: 2.5, H1: 1.5 };
      const periodA = a.split(" ")[0];
      const periodB = b.split(" ")[0];
      return (periodOrder[periodB] || 0) - (periodOrder[periodA] || 0);
    });

    res.json({ periods: sortedPeriods });
  } catch (error) {
    console.error("Get available periods error:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách kỳ đánh giá" });
  }
};

/**
 * Export reviews to CSV
 */
export const exportReviews = async (req, res) => {
  try {
    const { period, status } = req.query;
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Chỉ HR+ mới export được
    if (!["HR_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xuất báo cáo" });
    }

    const filter = {};
    if (period && period !== "all") filter.period = period;
    if (status && status !== "all") filter.status = status;

    const reviews = await PerformanceReviewModel.find(filter)
      .populate("employeeId", "name position email department")
      .populate("reviewerId", "name")
      .sort({ createdAt: -1 });

    // Format data for CSV
    const csvData = reviews.map((review) => ({
      "Mã đánh giá": review._id,
      "Nhân viên": review.employeeId?.name || "N/A",
      "Chức vụ": review.employeeId?.position || "N/A",
      "Email": review.employeeId?.email || "N/A",
      "Kỳ đánh giá": review.period,
      "Người đánh giá": review.reviewerId?.name || "N/A",
      "Trạng thái": review.status,
      "Điểm tổng": review.overallScore,
      "Kỹ thuật": review.categories.technical,
      "Giao tiếp": review.categories.communication,
      "Teamwork": review.categories.teamwork,
      "Lãnh đạo": review.categories.leadership,
      "Giải quyết vấn đề": review.categories.problemSolving,
      "Ngày đánh giá": review.reviewDate
        ? new Date(review.reviewDate).toLocaleDateString("vi-VN")
        : "N/A",
      "Nhận xét": review.comments || "",
    }));

    res.json({
      data: csvData,
      total: csvData.length,
    });
  } catch (error) {
    console.error("Export reviews error:", error);
    res.status(500).json({ message: "Lỗi khi xuất báo cáo" });
  }
};
