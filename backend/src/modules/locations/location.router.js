import express from "express";
import { LocationModel } from "./location.model.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /api/locations
 * Lấy danh sách tất cả locations đang active
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const locations = await LocationModel.find({ isActive: true }).select(
      "name address latitude longitude radius"
    );

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("[locations] get error", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách địa điểm",
    });
  }
});

export { router as locationRouter };
