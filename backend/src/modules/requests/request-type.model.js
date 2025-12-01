import mongoose from "mongoose";

const requestTypeSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

requestTypeSchema.index({ sortOrder: 1 });

export const RequestTypeModel = mongoose.model(
  "RequestType",
  requestTypeSchema
);

