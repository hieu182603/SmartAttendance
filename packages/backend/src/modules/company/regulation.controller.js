import multer from "multer";
import mongoose from "mongoose";
import { RegulationModel } from "./regulation.model.js";
import { aiServiceClient } from "../../utils/aiServiceClient.js";
import { uploadToGridFS, downloadStreamFromGridFS, deleteFromGridFS } from "../../utils/gridfs.js";
import { ROLES } from "../../config/roles.config.js";
import logger from "../../config/logger.js";

// ─── File upload middleware ───────────────────────────────────────────────────
// Store files in memory so we can extract text without touching the filesystem.
// Max 10 MB per file; accept PDF, DOCX, and plain text.

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Định dạng file không hỗ trợ. Vui lòng tải lên PDF, DOCX hoặc TXT."
        )
      );
    }
  },
}).single("file");

const ACCESS_LEVELS = new Set(["public", "restricted"]);
const ALLOWED_ROLES = new Set(Object.values(ROLES));
const PRIVILEGED_DOWNLOAD_ROLES = new Set([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HR_MANAGER,
]);

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toUpperCase() : "";
}

function getUserDepartmentId(user) {
  return (
    user?.departmentId ||
    user?.department_id ||
    user?.userContext?.department ||
    user?.department ||
    null
  );
}

function parseJsonArrayField(raw, fieldName) {
  if (raw === undefined || raw === null || raw === "") return [];

  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(`${fieldName} phải là mảng JSON hợp lệ.`);
    }
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} phải là mảng.`);
  }

  return value;
}

function parseRegulationAcl(body) {
  const accessLevel = body.accessLevel || "public";
  if (!ACCESS_LEVELS.has(accessLevel)) {
    throw new Error("Quyền truy cập không hợp lệ.");
  }

  const allowedRoles = parseJsonArrayField(body.allowedRoles, "allowedRoles")
    .map(normalizeRole)
    .filter(Boolean);

  for (const role of allowedRoles) {
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error(`Role không hợp lệ trong allowedRoles: ${role}`);
    }
  }

  const allowedDepartmentIds = parseJsonArrayField(
    body.allowedDepartmentIds,
    "allowedDepartmentIds"
  ).map((id) => String(id).trim());

  for (const id of allowedDepartmentIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Department ID không hợp lệ trong allowedDepartmentIds: ${id}`);
    }
  }

  return {
    accessLevel,
    allowedRoles: accessLevel === "restricted" ? allowedRoles : [],
    allowedDepartmentIds: accessLevel === "restricted" ? allowedDepartmentIds : [],
  };
}

export function canAccessRegulation(regulation, user) {
  const userRole = normalizeRole(user?.role);
  if (PRIVILEGED_DOWNLOAD_ROLES.has(userRole)) return true;

  if (regulation?.accessLevel !== "restricted") return true;

  const allowedRoles = (regulation.allowedRoles || []).map(normalizeRole);
  const userDeptId = getUserDepartmentId(user);
  const allowedDepartmentIds = (regulation.allowedDepartmentIds || []).map((id) =>
    id?.toString()
  );

  const roleAllowed = allowedRoles.length > 0 && allowedRoles.includes(userRole);
  const departmentAllowed =
    allowedDepartmentIds.length > 0 &&
    Boolean(userDeptId) &&
    allowedDepartmentIds.includes(userDeptId.toString());

  return roleAllowed || departmentAllowed;
}

// ─── Text extraction ──────────────────────────────────────────────────────────
/**
 * Extract plain text from an in-memory file buffer.
 * - PDF  → dynamic import of pdf-parse (optional dep; fallback if missing)
 * - DOCX → dynamic import of mammoth   (optional dep; fallback if missing)
 * - TXT  → utf-8 decode directly
 */
async function extractText(buffer, mimeType, originalName) {
  try {
    if (mimeType === "text/plain") {
      return buffer.toString("utf-8");
    }

    if (mimeType === "application/pdf") {
      // pdf-parse v2 (Node.js): PDFNodeStream requires a file:// URL, so we
      // write the buffer to a temp file, extract text, then delete it.
      const { PDFParse } = await import("pdf-parse").catch((err) => {
        logger.error(`pdf-parse not installed: ${err.message}`);
        throw new Error("Server chưa cài đặt thư viện đọc PDF (`pdf-parse`). Vui lòng liên hệ quản trị viên.");
      });
      const { writeFile, unlink } = await import("fs/promises");
      const { tmpdir } = await import("os");
      const { join } = await import("path");
      const tmpPath = join(tmpdir(), `reg_upload_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
      await writeFile(tmpPath, buffer);
      try {
        const parser = new PDFParse({ url: `file://${tmpPath}` });
        const result = await parser.getText();
        return result.text;
      } finally {
        await unlink(tmpPath).catch(() => {});
      }
    }

    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      let mammoth;
      try {
        mammoth = await import("mammoth");
      } catch (err) {
        logger.error(`mammoth not installed: ${err.message}`);
        throw new Error(
          "Server chưa cài đặt thư viện đọc DOCX (`mammoth`). Vui lòng liên hệ quản trị viên."
        );
      }
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new Error(`Định dạng file không được hỗ trợ: ${mimeType}`);
  } catch (err) {
    logger.error(`Text extraction failed for ${originalName}: ${err.message}`);
    throw new Error(`Không thể trích xuất nội dung từ file: ${err.message}`);
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────
export class RegulationController {
  /**
   * POST /api/companies/regulations
   * Upload a regulation file, extract its text, store metadata, and send to AI.
   */
  static async upload(req, res) {
    const companyId = req.user?.companyId;
    const userId = req.user?._id || req.user?.userId;

    if (!companyId) {
      return res.status(400).json({
        message: "Không xác định được công ty. Vui lòng đăng nhập lại.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file để tải lên." });
    }

    const { title, description, docType = "company_regulation" } = req.body;

    let acl;
    try {
      acl = parseRegulationAcl(req.body);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Tiêu đề tài liệu không được để trống." });
    }

    // 1. Save file to GridFS (persist the original file for future downloads)
    let gridFsFileId = null;
    try {
      gridFsFileId = await uploadToGridFS(req.file.buffer, req.file.originalname, {
        companyId: companyId.toString(),
        mimeType: req.file.mimetype,
        uploadedBy: userId?.toString(),
      });
    } catch (err) {
      logger.error(`[regulation] GridFS upload error: ${err.message}`);
      return res.status(500).json({ message: "Không lưu được file gốc. Vui lòng thử lại." });
    }

    // 2. Create metadata record (status: processing)
    let regulation;
    try {
      regulation = await RegulationModel.create({
        companyId,
        title: title.trim(),
        description: description?.trim(),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        docType,
        status: "processing",
        uploadedBy: userId,
        gridFsFileId,
        accessLevel: acl.accessLevel,
        allowedRoles: acl.allowedRoles,
        allowedDepartmentIds: acl.allowedDepartmentIds,
      });
    } catch (err) {
      // Clean up GridFS file if metadata creation fails
      try { await deleteFromGridFS(gridFsFileId); } catch { /* best-effort */ }
      logger.error(`[regulation] create metadata error: ${err.message}`);
      return res.status(500).json({ message: "Không lưu được thông tin tài liệu." });
    }

    // 2. Extract text from file buffer
    let content;
    try {
      content = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
      if (!content || content.trim().length < 10) {
        throw new Error("Nội dung file trống hoặc quá ngắn.");
      }

      // Phát hiện PDF scan (chỉ có page markers, không có chữ thật).
      // pdf-parse v2 chèn "-- N of M --" giữa các trang; nếu xoá hết những
      // marker này mà còn lại quá ít chữ thì file là ảnh chụp, không thể
      // tự đọc nội dung — phải OCR trước khi tải lên.
      const stripped = content.replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").replace(/\s+/g, " ").trim();
      if (stripped.length < 30) {
        throw new Error(
          "File PDF có vẻ là bản scan (ảnh chụp tài liệu) nên hệ thống không đọc được chữ. " +
          "Vui lòng dùng PDF gốc có text, hoặc OCR file trước khi tải lên."
        );
      }
    } catch (err) {
      await RegulationModel.findByIdAndUpdate(regulation._id, {
        status: "failed",
        errorMessage: err.message,
      });
      return res.status(422).json({ message: err.message });
    }

    // 3. Send to AI Service for vector ingestion (fire, await, update status)
    const authHeader = req.headers["authorization"];
    try {
      const aiResp = await aiServiceClient.ingestRegulation(authHeader, {
        regulation_id: regulation._id.toString(),
        title: title.trim(),
        content,
        doc_type: docType,
        access_level: acl.accessLevel,
        allowed_roles: acl.allowedRoles,
        allowed_department_ids: acl.allowedDepartmentIds,
        chunk_size: 1000,
        chunk_overlap: 200,
      });

      // axios is configured with validateStatus: status < 500, so 4xx
      // responses don't throw. We must check the status & payload manually,
      // otherwise we'd mark a rejected regulation as `active` and the
      // chatbot would never be able to retrieve any chunks from it.
      const aiStatus = aiResp?.status ?? 0;
      const chunksIngested = Number(aiResp?.data?.chunks_ingested ?? 0);
      const aiErrorDetail =
        aiResp?.data?.detail || aiResp?.data?.message || aiResp?.statusText;

      if (aiStatus >= 400 || chunksIngested <= 0) {
        throw new Error(
          aiErrorDetail ||
            `AI Service không học được tài liệu (HTTP ${aiStatus}, ${chunksIngested} chunks).`
        );
      }

      await RegulationModel.findByIdAndUpdate(regulation._id, {
        status: "active",
        chunksIngested,
        errorMessage: null,
      });

      return res.status(201).json({
        message: `Tài liệu "${title}" đã được AI học thành công (${chunksIngested} đoạn văn bản).`,
        data: {
          id: regulation._id,
          title: regulation.title,
          fileName: regulation.fileName,
          fileSize: regulation.fileSize,
          docType: regulation.docType,
          status: "active",
          chunksIngested,
          createdAt: regulation.createdAt,
        },
      });
    } catch (err) {
      logger.error(`[regulation] AI ingest error: ${err.message}`);
      await RegulationModel.findByIdAndUpdate(regulation._id, {
        status: "failed",
        errorMessage: err.message,
      });

      // Hiển thị message dễ hiểu khi token thiếu companyId (phiên cũ).
      const looksLikeStaleToken =
        /determine company from token|missing.*company|please re-?login/i.test(err.message);
      const userMessage = looksLikeStaleToken
        ? "Phiên đăng nhập đã hết hạn hoặc thiếu thông tin công ty. Vui lòng đăng xuất rồi đăng nhập lại, sau đó tải lên lại."
        : `Lưu metadata thành công nhưng AI gặp lỗi khi học tài liệu: ${err.message}`;

      return res.status(502).json({
        message: userMessage,
        data: {
          id: regulation._id,
          status: "failed",
        },
      });
    }
  }

  /**
   * GET /api/companies/regulations
   * List all regulation documents for the authenticated user's company.
   */
  static async list(req, res) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ message: "Không xác định được công ty." });
    }

    try {
      const { page = 1, limit = 20, status } = req.query;
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

      const filter = { companyId, status: { $ne: "deleted" } };
      if (status && ["processing", "active", "failed"].includes(status)) {
        filter.status = status;
      }

      const [items, total] = await Promise.all([
        RegulationModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .select("-__v")
          .lean(),
        RegulationModel.countDocuments(filter),
      ]);

      return res.json({ data: items, total, page: pageNum, limit: limitNum });
    } catch (err) {
      logger.error(`[regulation] list error: ${err.message}`);
      return res.status(500).json({ message: "Không lấy được danh sách tài liệu." });
    }
  }

  /**
   * DELETE /api/companies/regulations/:id
   * Delete regulation metadata + purge its vector chunks from Atlas.
   */
  static async remove(req, res) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ message: "Không xác định được công ty." });
    }

    try {
      // Verify ownership — only delete if it belongs to this company
      const regulation = await RegulationModel.findOne({
        _id: req.params.id,
        companyId,
      });

      if (!regulation) {
        return res.status(404).json({
          message: "Không tìm thấy tài liệu hoặc bạn không có quyền xóa.",
        });
      }

      // 1. Delete vector chunks from AI Service (best-effort)
      const authHeader = req.headers["authorization"];
      try {
        await aiServiceClient.deleteRegulationVectors(
          authHeader,
          regulation._id.toString()
        );
      } catch (aiErr) {
        // Log but don't block — metadata deletion still proceeds
        logger.warn(
          `[regulation] AI vector delete failed for ${regulation._id}: ${aiErr.message}`
        );
      }

      // 2. Delete GridFS file (best-effort)
      if (regulation.gridFsFileId) {
        try {
          await deleteFromGridFS(regulation.gridFsFileId);
        } catch (gridErr) {
          logger.warn(
            `[regulation] GridFS delete failed for ${regulation._id}: ${gridErr.message}`
          );
        }
      }

      // 3. Soft-delete metadata record
      await RegulationModel.findByIdAndUpdate(regulation._id, {
        status: "deleted",
      });

      return res.json({
        success: true,
        message: `Đã xóa tài liệu "${regulation.title}" và các dữ liệu AI liên quan.`,
      });
    } catch (err) {
      logger.error(`[regulation] remove error: ${err.message}`);
      return res.status(500).json({ message: "Không xóa được tài liệu." });
    }
  }

  /**
   * GET /api/companies/regulations/:id/download
   * Stream the original file from GridFS.
   * Access: any authenticated user in the same company (per-document ACL enforced here).
   */
  static async download(req, res) {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Không xác định được công ty." });
    }

    let regulation;
    try {
      regulation = await RegulationModel.findOne({
        _id: req.params.id,
        companyId,
        status: { $ne: "deleted" },
      });
    } catch (err) {
      logger.error(`[regulation] download lookup error: ${err.message}`);
      return res.status(500).json({ message: "Lỗi khi tìm tài liệu." });
    }

    if (!regulation) {
      return res.status(404).json({ message: "Không tìm thấy tài liệu." });
    }

    if (!canAccessRegulation(regulation, req.user)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền tải tài liệu này." });
    }

    // ── Stream from GridFS ──────────────────────────────────────────────
    if (!regulation.gridFsFileId) {
      return res.status(404).json({
        message:
          "File gốc không tồn tại. Tài liệu được upload trước khi hệ thống hỗ trợ tải file.",
      });
    }

    try {
      const safeFileName = encodeURIComponent(regulation.fileName || "document");
      res.set({
        "Content-Type": regulation.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFileName}`,
      });
      if (regulation.fileSize) {
        res.set("Content-Length", String(regulation.fileSize));
      }

      const stream = downloadStreamFromGridFS(regulation.gridFsFileId);
      stream.on("error", (err) => {
        logger.error(`[regulation] GridFS stream error: ${err.message}`);
        if (!res.headersSent) {
          const isMissingFile = /FileNotFound|not found/i.test(err.message);
          res.status(isMissingFile ? 404 : 500).json({
            message: isMissingFile
              ? "File gốc không tồn tại."
              : "Lỗi khi tải file.",
          });
        }
      });
      stream.pipe(res);
    } catch (err) {
      logger.error(`[regulation] download error: ${err.message}`);
      return res.status(500).json({ message: "Lỗi khi tải file." });
    }
  }
}
