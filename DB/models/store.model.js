import mongoose, { Schema, model } from "mongoose";

const storeSchema = new Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["voucher", "hours", "theme"],
      required: true,
    },
    priceInPoints: { type: Number, required: true },
    value: { type: String, required: true },
    validityDays: { type: Number, default: 7 },
    img: {
      secure_url: { type: String, default: "" },
      public_id: { type: String, default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export default model("StoreItem", storeSchema);
