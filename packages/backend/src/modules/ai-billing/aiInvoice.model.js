import mongoose from "mongoose";

export function generateInvoiceCode() {
  // 9-prefix range (9xxxxxxxx) to avoid collision with Order codes (1-prefix)
  return 9_000_000_000 + (Date.now() % 1_000_000_000);
}

const breakdownItemSchema = new mongoose.Schema(
  {
    operation: { type: String, required: true },
    tokens:    { type: Number, default: 0 },
    costVnd:   { type: Number, default: 0 },
  },
  { _id: false }
);

const aiInvoiceSchema = new mongoose.Schema(
  {
    invoiceCode:        { type: Number, required: true, unique: true },
    companyId:          { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    periodStart:        { type: Date, required: true },
    periodEnd:          { type: Date, required: true },
    status:             { type: String, enum: ["draft", "issued", "paid", "overdue", "cancelled"], default: "draft" },
    totalTokens:        { type: Number, default: 0 },
    breakdown:          [breakdownItemSchema],
    amountVnd:          { type: Number, required: true },
    customerEmail:      { type: String },
    payosPaymentLinkId: { type: String },
    checkoutUrl:        { type: String },
    issuedAt:           { type: Date },
    dueAt:              { type: Date },
    paidAt:             { type: Date },
    invoiceEmailSent:   { type: Boolean, default: false },
    confirmationEmailSent: { type: Boolean, default: false },
    processedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

aiInvoiceSchema.index({ companyId: 1, periodStart: 1 }, { unique: true });
aiInvoiceSchema.index({ status: 1, dueAt: 1 });

export const AiInvoiceModel = mongoose.model("AiInvoice", aiInvoiceSchema);
