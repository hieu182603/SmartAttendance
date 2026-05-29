import multer from "multer";
import { RegulationModel } from "./regulation.model.js";
import { aiServiceClient } from "../../utils/aiServiceClient.js";
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
      let pdfParse;
      try {
        pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      } catch (err) {
        // Fail fast — never push binary garbage into the vector store.
        logger.error(`pdf-parse not installed: ${err.message}`);
        throw new Error(
          "Server chưa cài đặt thư viện đọc PDF (`pdf-parse`). Vui lòng liên hệ quản trị viên."
        );
      }
      const data = await pdfParse(buffer);
      return data.text;
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

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Tiêu đề tài liệu không được để trống." });
    }

    // 1. Create metadata record (status: processing)
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
      });
    } catch (err) {
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
      return res.status(502).json({
        message: "Lưu metadata thành công nhưng AI gặp lỗi khi học tài liệu. Vui lòng thử lại sau.",
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

      // 2. Soft-delete metadata record
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

  // /retry handler removed: backend does not persist file buffers, so the
  // user must re-upload via POST /api/companies/regulations to recover from
  // a failed ingest. See regulation.router.js for the note.
}
