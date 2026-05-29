import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { ROLES } from "../../config/roles.config.js";
import {
  RegulationController,
  uploadMiddleware,
} from "./regulation.controller.js";

export const regulationRouter = Router();

// All regulation routes require authentication + admin/hr_manager role
regulationRouter.use(authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]));

/**
 * POST /api/companies/regulations
 * Upload a regulation file (PDF/DOCX/TXT) and trigger AI learning.
 * Body: multipart/form-data — file, title, description?, docType?
 */
regulationRouter.post(
  "/",
  (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  RegulationController.upload
);

/**
 * GET /api/companies/regulations
 * List all regulation documents for the authenticated company.
 * Query: ?page=1&limit=20&status=active
 */
regulationRouter.get("/", RegulationController.list);

/**
 * DELETE /api/companies/regulations/:id
 * Soft-delete regulation + purge vector chunks from AI service.
 */
regulationRouter.delete("/:id", RegulationController.remove);

// NOTE: /retry is intentionally NOT exposed. Backend does not persist the
// uploaded file buffer, so the only safe "retry" is to re-upload the file
// via POST /. Adding a stub here would mislead the frontend into thinking
// a partial recovery is possible.
