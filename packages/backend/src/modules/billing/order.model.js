import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderCode:        { type: Number, required: true, unique: true },
    companyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    plan:             { type: String, enum: ["starter", "standard", "premium"], required: true },
    billingCycle:     { type: String, enum: ["monthly", "yearly"], required: true },
    amount:           { type: Number, required: true },
    status:           { type: String, enum: ["pending", "paid", "cancelled", "failed"], default: "pending" },
    payosPaymentLinkId: { type: String },
    paidAt:           { type: Date },
    confirmationEmailSent: { type: Boolean, default: false },
    paymentMethod:    { type: String, enum: ["payos", "bank_transfer", "manual"], default: "payos" },
    bankTransferProof: { type: String },
    notes:            { type: String },
    processedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedAt:      { type: Date },
    customerName:     { type: String },
    customerEmail:    { type: String },
    customerPhone:    { type: String },
    companyName:      { type: String },
    employeeCount:    { type: Number },
    billingMonths:    { type: Number },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model("Order", orderSchema);
