import { Schema, model, Types } from "mongoose";

const trackSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    users: [{ type: Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  },
);

const trackModel = model("Track", trackSchema);
export default trackModel;
