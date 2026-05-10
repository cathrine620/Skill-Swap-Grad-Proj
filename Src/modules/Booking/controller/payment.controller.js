import Stripe from "stripe";
import bookingModel from "../../../../DB/models/booking.model.js";
import userModel from "../../../../DB/models/user.model.js";
import purchaseModel from "../../../../DB/models/purchase.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import { triggerPusher } from "../../../../utils/pusher.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { successUrl, cancelUrl, voucherId } = req.body;

  const booking = await bookingModel
    .findById(id)
    .populate("instructorId", "name")
    .populate("studentId", "name");

  if (!booking) {
    return next(new Error("Booking not found", { cause: 404 }));
  }

  if (booking.studentId._id.toString() !== req.user._id.toString()) {
    return next(
      new Error("Unauthorized. Only the student can pay for this booking", {
        cause: 403,
      }),
    );
  }

  if (booking.status !== "accepted") {
    return next(
      new Error("Booking must be accepted by the instructor before payment", {
        cause: 400,
      }),
    );
  }

  if (booking.price === 0) {
    return next(
      new Error("This is a free session. No payment required.", { cause: 400 }),
    );
  }

  if (booking.paymentStatus === "paid") {
    return next(
      new Error("This booking has already been paid", { cause: 400 }),
    );
  }

  let finalPrice = booking.price;
  let appliedVoucherId = null;

  if (voucherId) {
    const purchase = await purchaseModel.findById(voucherId).populate("itemId");
    if (!purchase || purchase.userId.toString() !== req.user._id.toString()) {
      return next(
        new Error("Voucher not found or unauthorized", { cause: 404 }),
      );
    }
    if (purchase.type !== "voucher") {
      return next(new Error("Selected item is not a voucher", { cause: 400 }));
    }
    if (purchase.isUsed) {
      return next(new Error("Voucher has already been used", { cause: 400 }));
    }
    if (purchase.validUntil && new Date() > purchase.validUntil) {
      return next(new Error("Voucher has expired", { cause: 400 }));
    }

    const voucherValue = purchase.itemId.value;
    if (voucherValue.endsWith("%")) {
      const percentage = parseFloat(voucherValue.replace("%", ""));
      finalPrice = finalPrice * (1 - percentage / 100);
    } else {
      finalPrice = finalPrice - parseFloat(voucherValue);
    }
    finalPrice = Math.max(0, finalPrice);
    appliedVoucherId = purchase._id.toString();
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Skill Swap Session`,
            description: `Session with ${booking.instructorId.name} on ${new Date(booking.date).toDateString()} at ${booking.time} (${booking.duration_mins} mins)`,
          },
          unit_amount: Math.round(finalPrice * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId: booking._id.toString(),
      ...(appliedVoucherId && { voucherId: appliedVoucherId }),
      finalPrice: finalPrice.toString(),
    },
  });

  booking.stripeSessionId = session.id;
  await booking.save();

  return res.status(200).json({
    message: "Checkout session created",
    checkoutUrl: session.url,
    sessionId: session.id,
  });
});

export const stripeWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook Error]: ${err.message}`);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    const voucherId = session.metadata?.voucherId;
    const finalPrice = parseFloat(session.metadata?.finalPrice || 0);

    if (!bookingId) {
      console.error("[Stripe Webhook Error]: Missing bookingId in metadata");
      return res.status(400).json({ message: "Missing bookingId in metadata" });
    }

    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      console.error(`[Stripe Webhook Error]: Booking ${bookingId} not found`);
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.paymentStatus = "paid";
    
    if (voucherId && voucherId !== "null" && voucherId !== "") {
      const updatedVoucher = await purchaseModel.findByIdAndUpdate(voucherId, { isUsed: true }, { new: true });
      if (updatedVoucher) {
        booking.voucherId = voucherId;
        booking.price = finalPrice;
      }
    }

    await booking.save();

    const creditAmount = finalPrice > 0 ? finalPrice : booking.price;
    await userModel.findByIdAndUpdate(booking.instructorId, {
      $inc: { wallet: creditAmount },
    });

    await triggerPusher(`user-${booking.studentId}`, "payment-success", {
      bookingId: booking._id,
      paymentStatus: "paid",
      message: "Payment confirmed successfully"
    });
  }

  return res.status(200).json({ received: true });
});

export const confirmPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const booking = await bookingModel.findById(id);
  if (!booking) return next(new Error("Booking not found", { cause: 404 }));

  if (!booking.stripeSessionId) {
    return next(new Error("No stripe session found for this booking", { cause: 400 }));
  }

  const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);

  if (session.payment_status === "paid") {
    if (booking.paymentStatus === "paid") {
      return res.status(200).json({ message: "Payment already confirmed", booking });
    }

    booking.paymentStatus = "paid";

    const voucherId = session.metadata?.voucherId;
    const finalPrice = parseFloat(session.metadata?.finalPrice || booking.price);

    if (voucherId && voucherId !== "null" && voucherId !== "") {
      const updatedVoucher = await purchaseModel.findByIdAndUpdate(voucherId, { isUsed: true });
      if (updatedVoucher) {
        booking.voucherId = voucherId;
        booking.price = finalPrice;
      }
    }

    await booking.save();

    const creditAmount = finalPrice > 0 ? finalPrice : booking.price;
    await userModel.findByIdAndUpdate(booking.instructorId, {
      $inc: { wallet: creditAmount },
    });

    return res.status(200).json({
      message: "Payment confirmed successfully",
      paymentStatus: "paid",
      booking
    });
  } else {
    return res.status(400).json({
      message: "Payment not yet confirmed by Stripe",
      paymentStatus: session.payment_status
    });
  }
});
