import { Schema, model } from "mongoose";

const bookingSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration_mins: { type: Number, required: true },
    price: { type: Number, required: true },
    bookingCode: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed", "expired"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    stripeSessionId: { type: String, default: null },
    rate: { type: Number, default: 0, min: 0, max: 5 },
    review: { type: String, default: "" },
    isRated: { type: Boolean, default: false },
    studentJoined: { type: Boolean, default: false },
    instructorJoined: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    ratingRequestSent: { type: Boolean, default: false },
    voucherId: { type: Schema.Types.ObjectId, ref: "Purchase", default: null },
  },
  {
    timestamps: true,
  },
);

const bookingModel = model("Booking", bookingSchema);
export default bookingModel;
