import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },
    address: { type: String },
    logoUrl: { type: String },

    plan: {
      type: String,
      enum: ["trial", "starter", "standard", "premium"],
      default: "trial",
    },
    maxUsers: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },

    // Thông tin pháp lý (NĐ 13/2023)
    taxCode: { type: String },
    legalRepresentative: { type: String },

    settings: {
      timezone: { type: String, default: "Asia/Ho_Chi_Minh" },
      workWeek: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun..6=Sat
      dateFormat: { type: String, default: "DD/MM/YYYY" },
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name on create
companySchema.pre("save", function (next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export const CompanyModel = mongoose.model("Company", companySchema);
