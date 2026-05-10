import mongoose, { Schema, model } from "mongoose";

const purchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "StoreItem", required: true },
    type: { type: String, enum: ["voucher", "hours", "theme"], required: true },
    pointsPaid: { type: Number, required: true },
    validUntil: { type: Date },
    isUsed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default model("Purchase", purchaseSchema);
