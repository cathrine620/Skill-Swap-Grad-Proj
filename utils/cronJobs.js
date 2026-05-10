import cron from "node-cron";
import bookingModel from "../DB/models/booking.model.js";
import userModel from "../DB/models/user.model.js";
import availabilityModel from "../DB/models/availability.model.js";
import { checkAndExpireBooking } from "../Src/modules/Booking/controller/booking.controller.js";
import { sendNotification } from "./notificationService.js";
import { NOTIFICATION_TYPES } from "./notificationTypes.js";

export const startCronJobs = () => {
  console.log("Starting background cron jobs...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const MAX_ADVANCE_REMINDER_MINUTES = 15;
      const reminderThreshold = new Date(
        now.getTime() + MAX_ADVANCE_REMINDER_MINUTES * 60000,
      );

      const activeBookings = await bookingModel.find({ status: "accepted" });

      for (const booking of activeBookings) {
        const isExpired = await checkAndExpireBooking(booking);
        if (isExpired) continue;

        const bookingDateStr =
          booking.date instanceof Date
            ? booking.date.toISOString().split("T")[0]
            : booking.date.toString().split("T")[0];

        const [year, month, day] = bookingDateStr.split("-").map(Number);
        const [hours, minutes, seconds = 0] = booking.time
          .split(":")
          .map(Number);

        const sessionStartTime = new Date(year, month - 1, day, hours, minutes, seconds);
        const sessionEndTime = new Date(sessionStartTime.getTime() + booking.duration_mins * 60000);

        if (sessionStartTime <= reminderThreshold && sessionStartTime > now && !booking.reminderSent) {
          booking.reminderSent = true;
          await booking.save();

          await sendNotification(booking.studentId, NOTIFICATION_TYPES.SESSION_REMINDER, {
            bookingId: booking._id,
            minutesBefore: 15,
          });
          await sendNotification(booking.instructorId, NOTIFICATION_TYPES.SESSION_REMINDER, {
            bookingId: booking._id,
            minutesBefore: 15,
          });
        }

        if (now >= sessionEndTime && !booking.ratingRequestSent) {
          booking.ratingRequestSent = true;
          await booking.save();

          const instructor = await userModel.findById(booking.instructorId).select("name");
          if (instructor) {
            await sendNotification(booking.studentId, NOTIFICATION_TYPES.RATING_REQUEST, {
              bookingId: booking._id,
              instructorName: instructor.name,
            });
          }
        }
      }
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });

  cron.schedule("0 0 * * *", async () => {
    try {
      const today = new Date();
      const isSaturday = today.getDay() === 6;
      const isFirstOfMonth = today.getDate() === 1;

      if (isSaturday || isFirstOfMonth) {
        console.log("Checking for availability rotation/cleanup...");

        const filter = {};
        if (isSaturday && isFirstOfMonth) {
          filter.rotationType = { $in: ["weekly", "monthly"] };
        } else if (isSaturday) {
          filter.rotationType = "weekly";
        } else if (isFirstOfMonth) {
          filter.rotationType = "monthly";
        }

        const result = await availabilityModel.deleteMany(filter);
        console.log(`Cleared ${result.deletedCount} availability records.`);
      }
    } catch (error) {
      console.error("Cron Error (Clear Availability):", error);
    }
  });
};
