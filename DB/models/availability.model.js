import { Schema, model } from "mongoose";

const availabilitySchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    rotationType: {
      type: String,
      enum: ["weekly", "monthly", "permanent"],
      default: "weekly",
    },
    availableDates: [
      {
        date: { type: String, required: true }, // YYYY-MM-DD
        from: { type: String, required: true }, // HH:mm
        to: { type: String, required: true },   // HH:mm
      },
    ],
  },
  {
    timestamps: true,
  },
);

const availabilityModel = model("Availability", availabilitySchema);
export default availabilityModel;
