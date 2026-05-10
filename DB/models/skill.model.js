import { Schema, model, Types } from "mongoose";

const skillSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    track: {
      type: Types.ObjectId,
      ref: "Track",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const skillModel = model("Skill", skillSchema);
export default skillModel;
