import { Schema, model } from "mongoose";

const reportSchema = new Schema(
  {
    time: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const reportModel = model("Report", reportSchema);
export default reportModel;
