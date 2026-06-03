import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { ROLES } from "../../config/roles.config.js";
import {
  RegulationController,
  uploadMiddleware,
} from "./regulation.controller.js";

export const regulationRouter = Router();

// ── Download: any authenticated user in the same company ─────────────────────
// Per-document access control is enforced inside the controller (checks
// accessLevel, allowedRoles, allowedDepartmentIds). This route is placed
// BEFORE the requireRole guard so that employees can also download public
// regulation documents.
regulationRouter.get(
  "/:id/download",
  authMiddleware,
  RegulationController.download
);

// ── Management routes: ADMIN / HR_MANAGER only ──────────────────────────────
regulationRouter.use(authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]));

/**
 * POST /api/companies/regulations
 * Upload a regulation file (PDF/DOCX/TXT) and trigger AI learning.
 * Body: multipart/form-data — file, title, description?, docType?, accessLevel?
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
 * Soft-delete regulation + purge vector chunks from AI service + delete GridFS file.
 */
regulationRouter.delete("/:id", RegulationController.remove);
