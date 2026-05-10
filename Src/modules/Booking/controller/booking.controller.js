import bookingModel from "../../../../DB/models/booking.model.js";
import userModel from "../../../../DB/models/user.model.js";
import availabilityModel from "../../../../DB/models/availability.model.js";
import { Types } from "mongoose";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import Stripe from "stripe";
import { sendNotification } from "../../../../utils/notificationService.js";
import { NOTIFICATION_TYPES } from "../../../../utils/notificationTypes.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const generateBookingCode = () => {
  const code = Math.floor(1000 + Math.random() * 9000);
  return `Book-${code}`;
};

function validateAvailabilityDate(date, rotationType = "weekly", next) {
  const today = new Date();
  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  const todayOnly = new Date(today);
  todayOnly.setHours(0, 0, 0, 0);

  if (inputDate < todayOnly) {
    return next(new Error("You cannot add availability for a past date.", { cause: 400 }));
  }

  if (rotationType === "weekly") {
    const dayOfWeek = today.getDay();
    const daysSinceSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    const currentSaturday = new Date(today);
    currentSaturday.setDate(today.getDate() - daysSinceSaturday);
    currentSaturday.setHours(0, 0, 0, 0);

    const endOfNextWeek = new Date(currentSaturday);
    endOfNextWeek.setDate(currentSaturday.getDate() + 14);

    if (inputDate >= endOfNextWeek) {
      return next(new Error("Weekly availability must be within the current or next week (Sat-Fri).", { cause: 400 }));
    }
  } else if (rotationType === "monthly") {
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    if (inputDate > endOfNextMonth) {
      return next(new Error("Monthly availability must be within the current or next month.", { cause: 400 }));
    }
  }

  return true;
}

export const checkAndExpireBooking = async (booking) => {
  if (booking.status === "pending" || booking.status === "accepted") {
    const bookingDateStr =
      booking.date instanceof Date
        ? booking.date.toISOString().split("T")[0]
        : booking.date.toString().split("T")[0];

    const [year, month, day] = bookingDateStr.split("-").map(Number);
    const [hours, minutes, seconds = 0] = booking.time.split(":").map(Number);
    const bookingDateTime = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
    );
    const now = new Date();

    if (booking.status === "pending" && now > bookingDateTime) {
      await bookingModel.deleteOne({ _id: booking._id });
      return true;
    }

    if (booking.status === "accepted") {
      if (booking.price > 0 && booking.paymentStatus === "unpaid") {
        const sixHoursInMs = 6 * 60 * 60 * 1000;
        if (bookingDateTime.getTime() - now.getTime() < sixHoursInMs) {
          await bookingModel.deleteOne({ _id: booking._id });
          return true;
        }
      }

      const marginMs = booking.duration_mins * 60 * 1000;
      const latestJoinTime = new Date(bookingDateTime.getTime() + marginMs);

      if (now > latestJoinTime) {
        if (!booking.studentJoined && !booking.instructorJoined) {
          if (booking.paymentStatus === "paid" && booking.stripeSessionId) {
            try {
              const session = await stripe.checkout.sessions.retrieve(
                booking.stripeSessionId,
              );
              if (session.payment_intent) {
                await stripe.refunds.create({
                  payment_intent: session.payment_intent,
                });
              }
              await userModel.findByIdAndUpdate(booking.instructorId, {
                $inc: { wallet: -booking.price },
              });
            } catch (err) {
              console.error("Refund failed on expiry:", err);
            }
          }
          await bookingModel.deleteOne({ _id: booking._id });
          return true;
        }
      }
    }
  }
  return false;
};

export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    instructorId,
    date,
    time,
    duration_mins,
    isFree = false,
  } = req.body;
  const studentId = req.user._id;

  const requestedProvider = await userModel.findById(instructorId);
  if (!requestedProvider) {
    return next(new Error("Instructor not found", { cause: 404 }));
  }

  if (studentId.toString() === instructorId.toString()) {
    return next(
      new Error("You cannot book a session with yourself", { cause: 400 }),
    );
  }

  let price = 0;
  if (!isFree && requestedProvider.role === "Mentor") {
    price = (requestedProvider.hourlyPrice || 0) * (duration_mins / 60);
  }

  if (price > 0 && requestedProvider.role !== "Mentor") {
    return next(
      new Error(
        "Paid sessions can only be booked with a Mentor. Normal users offer free (hours-based) sessions only.",
        { cause: 400 },
      ),
    );
  }

  if (price === 0) {
    const studentFull = await userModel.findById(studentId);
    if (!studentFull) {
      return next(new Error("Student not found", { cause: 404 }));
    }
    const requiredHours = duration_mins / 60;
    if ((studentFull.freeHours || 0) < requiredHours) {
      return next(
        new Error(
          `You do not have enough free hours. You have ${studentFull.freeHours || 0} but need ${requiredHours} for this session.`,
          { cause: 400 },
        ),
      );
    }
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  const bookingDateTime = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
  );

  const now = new Date();
  const twelveHoursInMs = 12 * 60 * 60 * 1000;

  if (bookingDateTime.getTime() - now.getTime() < twelveHoursInMs) {
    return next(
      new Error("You must book at least 12 hours in advance.", { cause: 400 }),
    );
  }

  const availability = await availabilityModel.findOne({ instructorId });
  if (availability) {
    const daySlots = availability.availableDates.filter((d) => d.date === date);
    if (daySlots.length === 0) {
      return next(
        new Error("The instructor is not available on this date.", {
          cause: 400,
        }),
      );
    }

    let isWithinAnySlot = false;
    const [hReq, mReq] = time.split(":").map(Number);
    const reqStartMin = hReq * 60 + mReq;
    const reqEndMin = reqStartMin + duration_mins;

    let slotMessages = [];

    for (const slot of daySlots) {
      const [hFrom, mFrom] = slot.from.split(":").map(Number);
      const [hTo, mTo] = slot.to.split(":").map(Number);

      const availStartMin = hFrom * 60 + mFrom;
      const availEndMin = hTo * 60 + mTo;

      if (reqStartMin >= availStartMin && reqEndMin <= availEndMin) {
        isWithinAnySlot = true;
        break;
      }
      slotMessages.push(`${slot.from} to ${slot.to}`);
    }

    if (!isWithinAnySlot) {
      return next(
        new Error(
          `The instructor is only available during: ${slotMessages.join(", ")}.`,
          { cause: 400 },
        ),
      );
    }
  } else {
    return next(
      new Error("This instructor has not set any available days yet.", {
        cause: 400,
      }),
    );
  }

  const requestedStart = bookingDateTime.getTime();
  const requestedEnd = requestedStart + duration_mins * 60 * 1000;

  const conflictingBookings = await bookingModel.find({
    status: "accepted",
    date: new Date(date),
    $or: [
      { instructorId: instructorId },
      { studentId: instructorId },
      { studentId: studentId },
      { instructorId: studentId },
    ],
  });

  for (const conflict of conflictingBookings) {
    const conflictDateStr =
      conflict.date instanceof Date
        ? conflict.date.toISOString().split("T")[0]
        : conflict.date.toString().split("T")[0];

    if (conflictDateStr === date) {
      const [accHours, accMinutes, accSeconds = 0] = conflict.time
        .split(":")
        .map(Number);
      const accDateTime = new Date(
        year,
        month - 1,
        day,
        accHours,
        accMinutes,
        accSeconds,
      );
      const accStart = accDateTime.getTime();
      const accEnd = accStart + conflict.duration_mins * 60 * 1000;

      if (requestedStart < accEnd && accStart < requestedEnd) {
        const isUserBusy =
          conflict.studentId.toString() === studentId.toString() ||
          conflict.instructorId.toString() === studentId.toString();
        const busyPrefix = isUserBusy
          ? "You already have"
          : "The instructor already has";

        return next(
          new Error(`${busyPrefix} an overlapping accepted session.`, {
            cause: 400,
          }),
        );
      }
    }
  }

  const pendingRequestsCount = await bookingModel.countDocuments({
    instructorId,
    date,
    time,
    status: "pending",
  });

  if (pendingRequestsCount >= 5) {
    return next(
      new Error("Maximum limit of 5 requests reached for this time slot.", {
        cause: 400,
      }),
    );
  }

  let bookingCode;
  let isUnique = false;
  while (!isUnique) {
    bookingCode = generateBookingCode();
    const existing = await bookingModel.findOne({ bookingCode });
    if (!existing) isUnique = true;
  }

  const booking = await bookingModel.create({
    studentId,
    instructorId,
    date,
    time,
    duration_mins,
    price,
    bookingCode,
    status: "pending",
  });

  try {
    const student = await userModel.findById(studentId).select("name");
    await sendNotification(instructorId, NOTIFICATION_TYPES.NEW_BOOKING, {
      studentName: student?.name || "Someone",
      bookingId: booking._id,
    });
  } catch (notifyErr) {
    console.error("New booking notification error:", notifyErr.message);
  }

  return res.status(201).json({
    message: "Booking created successfully",
    booking,
  });
});

export const getAllBookings = asyncHandler(async (req, res, next) => {
  const allToProcess = await bookingModel.find({
    status: { $in: ["pending", "accepted"] },
  });
  for (const p of allToProcess) {
    await checkAndExpireBooking(p);
  }

  const bookings = await bookingModel
    .find()
    .populate("studentId", "name email userImage role")
    .populate("instructorId", "name email userImage role");
  return res.status(200).json({
    message: "Bookings retrieved successfully",
    bookings,
  });
});

export const getAcceptedBookings = asyncHandler(async (req, res, next) => {
  const allToProcess = await bookingModel.find({ status: "accepted" });
  for (const p of allToProcess) {
    await checkAndExpireBooking(p);
  }

  const bookings = await bookingModel
    .find({ status: "accepted" })
    .populate("studentId", "name email userImage role")
    .populate("instructorId", "name email userImage role");

  return res.status(200).json({
    message: "Accepted bookings retrieved successfully",
    bookings,
  });
});

export const getUserBookings = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { status } = req.query;

  const bookingsToProcess = await bookingModel.find({
    status: { $in: ["pending", "accepted"] },
    $or: [{ studentId: userId }, { instructorId: userId }],
  });
  for (const p of bookingsToProcess) {
    await checkAndExpireBooking(p);
  }

  const query = {};
  if (status === "request" || status === "requested") {
    query.studentId = userId;
  } else {
    query.$or = [{ studentId: userId }, { instructorId: userId }];
    if (status && status !== "all") {
      query.status = status;
    }
  }

  const bookings = await bookingModel
    .find(query)
    .populate("studentId", "name email userImage role")
    .populate("instructorId", "name email userImage role");

  return res.status(200).json({
    message: "User bookings retrieved successfully",
    bookings,
  });
});

export const getBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const booking = await bookingModel
    .findById(id)
    .populate("studentId", "name email userImage role")
    .populate("instructorId", "name email userImage role");

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  const isDeleted = await checkAndExpireBooking(booking);
  if (isDeleted) {
    return next(new Error("Booking has expired and been deleted", { cause: 410 }));
  }

  if (
    booking.studentId._id.toString() !== req.user._id.toString() &&
    booking.instructorId._id.toString() !== req.user._id.toString()
  ) {
    return next(new Error("Unauthorized to view this booking", { cause: 403 }));
  }

  return res.status(200).json({
    message: "Booking retrieved successfully",
    booking,
  });
});

export const updateBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { date, time, duration_mins } = req.body;
  const updates = { date, time, duration_mins };

  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

  const booking = await bookingModel.findById(id);
  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  if (updates.duration_mins && updates.duration_mins !== booking.duration_mins) {
    if (booking.price > 0) {
      const hourlyRate = (booking.price / booking.duration_mins) * 60;
      updates.price = Math.round((hourlyRate / 60) * updates.duration_mins);
    }
  }

  const isDeleted = await checkAndExpireBooking(booking);
  if (isDeleted) {
    return next(new Error("Booking has expired and been deleted", { cause: 410 }));
  }

  if (booking.studentId.toString() !== req.user._id.toString()) {
    return next(new Error("Unauthorized student", { cause: 403 }));
  }

  if (booking.status !== "pending") {
    return next(
      new Error("Only pending bookings can be updated", { cause: 400 }),
    );
  }

  if (updates.date || updates.time) {
    const newDateStr =
      updates.date ||
      (booking.date instanceof Date
        ? booking.date.toISOString().split("T")[0]
        : booking.date.toString().split("T")[0]);
    const newTime = updates.time || booking.time;

    const [year, month, day] = newDateStr.split("-").map(Number);
    const [hours, minutes, seconds = 0] = newTime.split(":").map(Number);
    const bookingDateTime = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
    );

    if (bookingDateTime < new Date()) {
      return next(new Error("Cannot update to past date/time", { cause: 400 }));
    }
  }

  const updatedBooking = await bookingModel.findByIdAndUpdate(id, updates, {
    new: true,
  });

  return res.status(200).json({
    message: "Booking updated successfully",
    booking: updatedBooking,
  });
});

export const changeBookingStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = await bookingModel.findById(id);
  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  const isDeleted = await checkAndExpireBooking(booking);
  if (isDeleted) {
    return next(new Error("Booking has expired and been deleted", { cause: 410 }));
  }

  if (booking.instructorId.toString() !== req.user._id.toString()) {
    return next(new Error("Unauthorized instructor", { cause: 403 }));
  }

  if (booking.status !== "pending") {
    return next(
      new Error(`Booking is already ${booking.status}`, { cause: 400 }),
    );
  }

  if (status !== "accepted" && status !== "rejected") {
    return next(new Error("Invalid status", { cause: 400 }));
  }

  if (status === "accepted") {
    const bookingDateStr =
      booking.date instanceof Date
        ? booking.date.toISOString().split("T")[0]
        : booking.date.toString().split("T")[0];
    const [year, month, day] = bookingDateStr.split("-").map(Number);
    const [hours, minutes, seconds = 0] = booking.time.split(":").map(Number);
    const bookingDateTime = new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
    );

    const acceptedStart = bookingDateTime.getTime();
    const acceptedEnd = acceptedStart + booking.duration_mins * 60 * 1000;

    const conflictingBooked = await bookingModel.find({
      status: "accepted",
      date: booking.date,
      $or: [
        { instructorId: booking.instructorId },
        { studentId: booking.instructorId },
        { studentId: booking.studentId },
        { instructorId: booking.studentId },
      ],
    });

    for (const conflict of conflictingBooked) {
      const conflictDateStr =
        conflict.date instanceof Date
          ? conflict.date.toISOString().split("T")[0]
          : conflict.date.toString().split("T")[0];
      if (conflictDateStr === bookingDateStr) {
        const [accHours, accMinutes, accSeconds = 0] = conflict.time
          .split(":")
          .map(Number);
        const accDateTime = new Date(
          year,
          month - 1,
          day,
          accHours,
          accMinutes,
          accSeconds,
        );
        const accStart = accDateTime.getTime();
        const accEnd = accStart + conflict.duration_mins * 60 * 1000;

        if (acceptedStart < accEnd && accStart < acceptedEnd) {
          const isInstructorBusy =
            conflict.studentId.toString() === booking.instructorId.toString() ||
            conflict.instructorId.toString() ===
            booking.instructorId.toString();
          const busyPrefix = isInstructorBusy ? "You are" : "The student is";
          return next(
            new Error(`${busyPrefix} already booked for this slot.`, {
              cause: 400,
            }),
          );
        }
      }
    }

    const pendingBookings = await bookingModel.find({
      status: "pending",
      _id: { $ne: booking._id },
      $or: [
        { instructorId: booking.instructorId },
        { studentId: booking.instructorId },
        { studentId: booking.studentId },
        { instructorId: booking.studentId },
      ],
    });

    const conflictingBookingIds = [];
    for (const pending of pendingBookings) {
      const pDateStr =
        pending.date instanceof Date
          ? pending.date.toISOString().split("T")[0]
          : pending.date.toString().split("T")[0];
      if (pDateStr === bookingDateStr) {
        const [pHours, pMinutes, pSeconds = 0] = pending.time
          .split(":")
          .map(Number);
        const pDateTime = new Date(
          year,
          month - 1,
          day,
          pHours,
          pMinutes,
          pSeconds,
        );
        const pStart = pDateTime.getTime();
        const pEnd = pStart + pending.duration_mins * 60 * 1000;

        if (acceptedStart < pEnd && pStart < acceptedEnd) {
          conflictingBookingIds.push(pending._id);
        }
      }
    }

    if (conflictingBookingIds.length > 0) {
      await bookingModel.updateMany(
        { _id: { $in: conflictingBookingIds } },
        { $set: { status: "rejected" } },
      );
    }
  }

  booking.status = status;
  await booking.save();

  try {
    const instructor = await userModel
      .findById(booking.instructorId)
      .select("name");
    if (instructor) {
      const notificationType =
        status === "accepted"
          ? NOTIFICATION_TYPES.REQUEST_ACCEPTED
          : NOTIFICATION_TYPES.REQUEST_REJECTED;
      await sendNotification(booking.studentId, notificationType, {
        bookingId: booking._id,
        instructorName: instructor.name,
      });
    }
  } catch (notifyErr) {
    console.error("Booking status notification error:", notifyErr.message);
  }

  return res.status(200).json({
    message: `Booking ${status} successfully`,
    booking,
  });
});

export const cancelBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await bookingModel.findById(id);
  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  const isDeleted = await checkAndExpireBooking(booking);
  if (isDeleted) {
    return next(new Error("Booking has expired and been deleted", { cause: 410 }));
  }

  const userId = req.user._id.toString();
  const isStudent = booking.studentId.toString() === userId;
  const isInstructor = booking.instructorId.toString() === userId;

  if (!isStudent && !isInstructor) {
    return next(new Error("Unauthorized cancellation", { cause: 403 }));
  }

  if (booking.status === "completed") {
    return next(new Error("Cannot cancel a completed session", { cause: 400 }));
  }

  if (["cancelled", "rejected", "expired"].includes(booking.status)) {
    return next(
      new Error(`Booking is already ${booking.status}`, { cause: 400 }),
    );
  }

  let refundId = null;
  if (booking.paymentStatus === "paid" && booking.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        booking.stripeSessionId,
      );
      if (session.payment_intent) {
        const refund = await stripe.refunds.create({
          payment_intent: session.payment_intent,
        });
        refundId = refund.id;
      }
      await userModel.findByIdAndUpdate(booking.instructorId, {
        $inc: { wallet: -booking.price },
      });
      booking.paymentStatus = "refunded";
    } catch (err) {
      return next(new Error(`Refund failed: ${err.message}`, { cause: 500 }));
    }
  }

  booking.status = "cancelled";
  await booking.save();

  try {
    const canceller = await userModel.findById(req.user._id).select("name");
    const otherUserId = isStudent ? booking.instructorId : booking.studentId;
    await sendNotification(otherUserId, NOTIFICATION_TYPES.BOOKING_CANCELLED, {
      cancellerName: canceller?.name || "Someone",
      bookingId: booking._id,
    });
  } catch (notifyErr) {
    console.error(
      "Booking cancellation notification error:",
      notifyErr.message,
    );
  }

  return res.status(200).json({
    message: "Booking cancelled successfully",
    ...(refundId && { refundId, refundNote: "Payment has been refunded" }),
    booking,
  });
});

export const completeBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { rate, review } = req.body;

  const booking = await bookingModel.findById(id);
  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  const isDeleted = await checkAndExpireBooking(booking);
  if (isDeleted) {
    return next(new Error("Booking has expired and been deleted", { cause: 410 }));
  }

  const userId = req.user._id.toString();
  if (booking.studentId.toString() !== userId) {
    return next(new Error("Unauthorized student", { cause: 403 }));
  }

  if (booking.status !== "accepted" && booking.status !== "completed") {
    return next(
      new Error(`Cannot complete booking with status: ${booking.status}`, {
        cause: 400,
      }),
    );
  }

  if (booking.price > 0 && booking.paymentStatus !== "paid") {
    return next(
      new Error("This is a paid session and has not been paid yet.", {
        cause: 400,
      }),
    );
  }

  if (booking.isRated) {
    return next(new Error("Session already rated", { cause: 400 }));
  }

  booking.status = "completed";
  booking.rate = rate;
  booking.review = review;
  booking.isRated = true;

  await booking.save();

  const sessionHours = booking.duration_mins / 60;
  const student = await userModel.findById(userId);
  const instructor = await userModel.findById(booking.instructorId);

  if (instructor) {
    instructor.helpTotalHours = (instructor.helpTotalHours || 0) + sessionHours;

    if (instructor.helpTotalHours >= 180) {
      instructor.hourlyPrice = 50;
    } else if (instructor.helpTotalHours >= 160) {
      instructor.hourlyPrice = 45;
    } else if (instructor.helpTotalHours >= 140) {
      instructor.hourlyPrice = 40;
    } else if (instructor.helpTotalHours >= 120) {
      instructor.hourlyPrice = 35;
    } else if (instructor.role === "Mentor") {
      instructor.hourlyPrice = 30;
    }
  }

  if (booking.price === 0) {
    if (student) {
      student.freeHours = Math.max(0, (student.freeHours || 0) - sessionHours);
      await student.save();
    }
    if (instructor) {
      instructor.freeHours = (instructor.freeHours || 0) + sessionHours;
    }
  }

  if (instructor) {
    instructor.reviews.push({ rating: rate, review, reviewer: userId });
    const currentTotalScore = instructor.rate * instructor.numberOfReviews;
    const newTotalReviews = instructor.numberOfReviews + 1;
    instructor.rate = (currentTotalScore + rate) / newTotalReviews;
    instructor.numberOfReviews = newTotalReviews;
    await instructor.save();
    await instructor.populate("reviews.reviewer", "name userImage role");
  }

  return res.status(200).json({
    message: "Booking completed and review submitted successfully",
    booking,
  });
});

export const joinSession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const booking = await bookingModel.findById(id);

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  await checkAndExpireBooking(booking);

  if (booking.status !== "accepted") {
    return next(
      new Error("You can only join accepted sessions", { cause: 400 }),
    );
  }

  const userId = req.user._id.toString();
  let roleJoined = "";
  let otherUserId = null;

  if (booking.studentId.toString() === userId) {
    if (!booking.studentJoined) {
      booking.studentJoined = true;
      roleJoined = "student";
      otherUserId = booking.instructorId;
    } else {
      roleJoined = "student (already joined)";
    }
  } else if (booking.instructorId.toString() === userId) {
    if (!booking.instructorJoined) {
      booking.instructorJoined = true;
      roleJoined = "instructor";
      otherUserId = booking.studentId;
    } else {
      roleJoined = "instructor (already joined)";
    }
  } else {
    return next(new Error("Unauthorized join", { cause: 403 }));
  }

  await booking.save();

  if (otherUserId && !roleJoined.includes("already joined")) {
    try {
      await sendNotification(otherUserId, NOTIFICATION_TYPES.SESSION_STARTED, {
        bookingId: booking._id,
      });
    } catch (err) {
      console.error("Session started notification error:", err.message);
    }
  }

  return res.status(200).json({
    message: `Successfully joined as ${roleJoined}`,
    booking,
  });
});

export const getUpcomingSaturday = asyncHandler(async (req, res, next) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;

  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);

  const year = nextSaturday.getFullYear();
  const month = String(nextSaturday.getMonth() + 1).padStart(2, "0");
  const day = String(nextSaturday.getDate()).padStart(2, "0");

  return res.status(200).json({
    message: "Upcoming Saturday retrieved successfully",
    date: `${year}-${month}-${day}`,
  });
});

export const setAvailability = asyncHandler(async (req, res, next) => {
  const { availableDates, rotationType, from, to } = req.body;
  const userId = req.user._id;

  if (!Array.isArray(availableDates)) {
    return next(new Error("availableDates must be an array", { cause: 400 }));
  }

  const processedDates = [];
  for (const item of availableDates) {
    let dateObj;
    if (typeof item === "string") {
      if (!from || !to)
        return next(new Error("Time range missing", { cause: 400 }));
      dateObj = { date: item, from, to };
    } else {
      const itemFrom = item.from || from;
      const itemTo = item.to || to;
      if (!itemFrom || !itemTo)
        return next(new Error("Time range missing", { cause: 400 }));
      dateObj = { date: item.date, from: itemFrom, to: itemTo };
    }

    const valid = validateAvailabilityDate(dateObj.date, rotationType, next);
    if (valid !== true) return;
    processedDates.push(dateObj);
  }

  let availability = await availabilityModel.findOne({ instructorId: userId });

  if (availability) {
    const dateMap = new Map();
    availability.availableDates.forEach(d => {
      const dateKey = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date);
      dateMap.set(dateKey, d);
    });

    processedDates.forEach(d => {
      dateMap.set(String(d.date), d);
    });

    availability.availableDates = Array.from(dateMap.values());
    availability.rotationType = rotationType;
    await availability.save();
  } else {
    availability = await availabilityModel.create({
      instructorId: userId,
      availableDates: processedDates,
      rotationType
    });
  }

  return res.status(200).json({
    message: "Availability updated successfully",
    availability,
  });
});

export const getAvailability = asyncHandler(async (req, res, next) => {
  const { instructorId } = req.params;
  const availability = await availabilityModel.findOne({ instructorId });

  if (availability) {
    const todayStr = new Date().toISOString().split("T")[0];
    const originalCount = availability.availableDates.length;

    availability.availableDates = availability.availableDates.filter(
      (d) => d.date >= todayStr
    );

    if (availability.availableDates.length !== originalCount) {
      await availability.save();
    }
  }

  return res.status(200).json({
    message: "Availability retrieved successfully",
    availableDates: availability ? availability.availableDates : [],
  });
});

export const deleteAvailabilityDay = asyncHandler(async (req, res, next) => {
  const { idOrDate } = req.params;
  const instructorId = req.user._id;

  const availability = await availabilityModel.findOne({ instructorId });
  if (!availability)
    return next(new Error("No availability found", { cause: 404 }));

  const initialCount = availability.availableDates.length;
  availability.availableDates = availability.availableDates.filter((d) => {
    return d._id.toString() !== idOrDate && d.date !== idOrDate;
  });

  if (availability.availableDates.length === initialCount) {
    return next(new Error("Availability slot not found", { cause: 400 }));
  }

  await availability.save();
  return res.status(200).json({
    message: "Availability removed successfully",
    availability,
  });
});

export const addAvailabilityDay = asyncHandler(async (req, res, next) => {
  const { date, from, to, rotationType } = req.body;
  const instructorId = req.user._id;

  const valid = validateAvailabilityDate(date, rotationType, next);
  if (valid !== true) return;

  let availability = await availabilityModel.findOne({ instructorId });
  if (!availability) {
    availability = new availabilityModel({
      instructorId,
      availableDates: [],
      rotationType: rotationType || "weekly",
    });
  } else if (rotationType) {
    availability.rotationType = rotationType;
  }

  const isDuplicate = availability.availableDates.some(
    (d) => d.date === date && d.from === from && d.to === to,
  );

  if (!isDuplicate) availability.availableDates.push({ date, from, to });

  await availability.save();
  return res.status(200).json({
    message: "Availability added/updated successfully",
    availability,
  });
});
