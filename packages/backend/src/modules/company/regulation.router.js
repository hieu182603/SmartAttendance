import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { ROLES } from "../../config/roles.config.js";
import { requireFeatureEnabled } from "../../middleware/featureToggle.middleware.js";
import {
  RegulationController,
  uploadMiddleware,
} from "./regulation.controller.js";

export const regulationRouter = Router();

// ── Download: any authenticated user in the same company ─────────────────
// Intentionally gated on the 'chatbot' toggle:
// Regulation documents are the AI training corpus; exposing them when the
// chatbot module is disabled for a company or user would leak confidential
// company content through a module that has been administratively disabled.
// The per-document accessLevel / allowedRoles check inside the controller still
// runs as the secondary enforcement layer after this feature-toggle gate.
regulationRouter.get(
  "/:id/download",
  authMiddleware,
  requireFeatureEnabled("chatbot"),
  RegulationController.download
);

// ── Management routes: ADMIN / HR_MANAGER only, gated on 'chatbot' toggle ──────
regulationRouter.use(authMiddleware, requireRole([ROLES.ADMIN, ROLES.HR_MANAGER]), requireFeatureEnabled("chatbot"));

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
