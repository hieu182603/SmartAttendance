import mongoose from "mongoose";

// Read-only mirror of the ai_usage_events collection written by ai-service.
const aiUsageEventSchema = new mongoose.Schema(
  {
    companyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:           { type: String, required: true },
    service:          { type: String, default: "rag" },
    operation:        { type: String, required: true },
    model:            { type: String, required: true },
    promptTokens:     { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens:      { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
    estimatedCostVnd: { type: Number, default: 0 },
    estimated:        { type: Boolean, default: false },
    conversationId:   { type: String },
    createdAt:        { type: Date, required: true },
  },
  { timestamps: false, collection: "ai_usage_events" }
);

aiUsageEventSchema.index({ companyId: 1, createdAt: -1 });
aiUsageEventSchema.index({ service: 1 });

export const AiUsageEventModel = mongoose.model("AiUsageEvent", aiUsageEventSchema);
