import mongoose from "mongoose";

/**
 * Regulation — lưu siêu dữ liệu (metadata) của các văn bản quy định công ty
 * đã được Admin tải lên để AI Chatbot học.
 *
 * Mỗi Regulation record tương ứng với 1 file tài liệu. Nội dung vector
 * được lưu riêng trên MongoDB Atlas Vector Search (collection rag_documents)
 * và được liên kết qua trường `regulation_id` trong metadata của từng chunk.
 */
const regulationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
    },
    mimeType: {
      type: String, // application/pdf | text/plain | application/vnd.openxmlformats-officedocument.wordprocessingml.document
    },
    docType: {
      type: String,
      enum: [
        "company_regulation",
        "hr_policy",
        "work_procedure",
        "code_of_conduct",
        "other",
      ],
      default: "company_regulation",
    },
    /**
     * status lifecycle:
     *   processing  → AI đang học (đang nạp vector)
     *   active      → Đã học xong, chatbot có thể trả lời
     *   failed      → Lỗi khi nạp vector
     *   deleted     → Đã xóa khỏi vector store (soft marker)
     */
    status: {
      type: String,
      enum: ["processing", "active", "failed", "deleted"],
      default: "processing",
    },
    chunksIngested: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "regulations",
  }
);

// Compound index — list regulations per company quickly
regulationSchema.index({ companyId: 1, createdAt: -1 });

export const RegulationModel = mongoose.model("Regulation", regulationSchema);
