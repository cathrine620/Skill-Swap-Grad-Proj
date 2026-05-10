import { Router } from "express";
import joi from "joi";
import { auth, roles } from "../../middleware/auth.js";
import { validation, generalFields } from "../../middleware/validation.js";
import * as validators from "./booking.validation.js";
import {
  createBooking,
  getAcceptedBookings,
  getAllBookings,
  getUserBookings,
  getBooking,
  updateBooking,
  changeBookingStatus,
  cancelBooking,
  completeBooking,
  joinSession,
  getUpcomingSaturday,
  setAvailability,
  getAvailability,
  deleteAvailabilityDay,
  addAvailabilityDay,
} from "./controller/booking.controller.js";
import {
  createCheckoutSession,
  stripeWebhook,
  confirmPayment,
} from "./controller/payment.controller.js";
import express from "express";

const BookingRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PopulatedUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         userImage:
 *           type: string
 *         role:
 *           type: string
 *     BookingResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         studentId:
 *           $ref: '#/components/schemas/PopulatedUser'
 *         instructorId:
 *           $ref: '#/components/schemas/PopulatedUser'
 *         date:
 *           type: string
 *           format: date
 *         time:
 *           type: string
 *         duration_mins:
 *           type: integer
 *         price:
 *           type: number
 *         status:
 *           type: string
 *         bookingCode:
 *           type: string
 *
 * tags:
 *   name: Booking
 *   description: >
 *     Booking management
 *
 *     ---
 *
 *     **Stripe Payment Integration Guide for Frontend (Mobile Webview / Browser):**
 *
 *     1. When a booking is in `accepted` status, call `POST /booking/{id}/pay`
 *     2. In the body, provide the URLs you want Stripe to redirect back to:
 *        ```json
 *        {
 *          "successUrl": "skillswap://payment/success?bookingId={id}",
 *          "cancelUrl": "skillswap://payment/cancel?bookingId={id}"
 *        }
 *        ```
 *     3. The API will respond with:
 *        ```json
 *        {
 *          "message": "success",
 *          "checkoutUrl": "https://checkout.stripe.com/c/pay/..."
 *        }
 *        ```
 *     4. Open this `checkoutUrl` in a Webview or redirect the browser to it.
 *     5. The user pays securely on Stripe's server.
 *     6. Upon success, Stripe redirects the browser/webview back to the `successUrl` you supplied. Your app should intercept this URL and close the webview/show a "Payment Successful" screen. Our server webhook automatically marks the booking as Paid and Completed in the Database!
 *     7. Ensure your app handles the `cancelUrl` by closing the webview and showing "Payment Cancelled".
 */

/**
 * @swagger
 * /booking/webhook:
 *   post:
 *     summary: Stripe Webhook endpoint (internal — do not call directly)
 *     tags: [Booking]
 *     description: Handles Stripe checkout.session.completed event to mark booking as paid and completed.
 *     responses:
 *       200:
 *         description: Webhook received
 */
BookingRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);


/**
 * @swagger
 * /booking/accepted:
 *   get:
 *     summary: Get all accepted bookings
 *     tags: [Booking]
 *     responses:
 *       200:
 *         description: List of all accepted bookings
 */
BookingRouter.get("/accepted", getAcceptedBookings);

/**
 * @swagger
 * /booking/user:
 *   get:
 *     summary: Get logged-in user's bookings
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter bookings by status (e.g., pending, accepted, rejected, cancelled, completed), or 'all'
 *     responses:
 *       200:
 *         description: List of user bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookingResponse'
 */
BookingRouter.get(
  "/user",
  auth(Object.values(roles)),
  validation(validators.getUserBookingsSchema),
  getUserBookings,
);

/**
 * @swagger
 * /booking/saturdays:
 *   get:
 *     summary: Get the date of the upcoming Saturday
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming Saturday date in YYYY-MM-DD format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                   example: "2026-03-21"
 */
BookingRouter.get("/saturdays", auth(Object.values(roles)), getUpcomingSaturday);

/**
 * @swagger
 * /booking/availability:
 *   post:
 *     summary: Set/Update multiple availability days for the instructor
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [availableDates]
 *             example:
 *               availableDates:
 *                 - { "date": "2026-03-22", "from": "09:00", "to": "12:00" }
 *                 - { "date": "2026-03-23", "from": "14:00", "to": "18:00" }
 *                 - { "date": "2026-03-24", "from": "10:00", "to": "22:00" }
 *             properties:
 *               rotationType:
 *                 type: string
 *                 enum: [weekly, monthly, permanent]
 *                 required: true
 *                 description: >
 *                   Range limit for adding dates.
 *                   'weekly': Can add for current and next week (14 days).
 *                   'monthly': Can add for current and next month.
 *                   Past dates are automatically cleaned up when viewing availability.
 *                 example: "weekly"
 *               from:
 *                 type: string
 *                 description: Default start time for all dates (if not specified per date)
 *                 example: "09:00"
 *               to:
 *                 type: string
 *                 description: Default end time for all dates
 *                 example: "17:00"
 *               availableDates:
 *                 type: array
 *                 description: "List of dates. Can be strings ('YYYY-MM-DD') or objects {date, from, to}"
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                       format: date
 *                       example: "2026-03-22"
 *                     - type: object
 *                       required: [date]
 *                       properties:
 *                         date:
 *                           type: string
 *                           format: date
 *                         from:
 *                           type: string
 *                         to:
 *                           type: string
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
BookingRouter.post(
  "/availability",
  auth(Object.values(roles)),
  validation(validators.setAvailabilitySchema),
  setAvailability,
);

/**
 * @swagger
 * /booking/availability/add:
 *   post:
 *     summary: Add or update a specific availability day (must be a future date)
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, from, to]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-22"
 *               from:
 *                 type: string
 *                 example: "09:00"
 *               to:
 *                 type: string
 *                 example: "17:00"
 *               rotationType:
 *                 type: string
 *                 enum: [weekly, monthly, permanent]
 *                 description: Update the instructor's default rotation type
 *                 example: "weekly"
 *     responses:
 *       200:
 *         description: Availability added/updated
 */
BookingRouter.post(
  "/availability/add",
  auth(Object.values(roles)),
  validation(validators.addAvailabilityDaySchema),
  addAvailabilityDay,
);

/**
 * @swagger
 * /booking/availability/{idOrDate}:
 *   delete:
 *     summary: Delete a specific availability day or slot
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrDate
 *         required: true
 *         schema:
 *           type: string
 *           description: Either a date (YYYY-MM-DD) or a specific slot ID
 *           example: "2026-03-22"
 *     responses:
 *       200:
 *         description: Availability removed
 */
BookingRouter.delete(
  "/availability/:idOrDate",
  auth(Object.values(roles)),
  validation(validators.deleteAvailabilitySchema),
  deleteAvailabilityDay,
);


/**
 * @swagger
 * /booking/availability/{instructorId}:
 *   get:
 *     summary: Get available dates for an instructor
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: instructorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability retrieved
 */
BookingRouter.get(
  "/availability/:instructorId",
  auth(Object.values(roles)),
  validation(
    joi.object({
      instructorId: generalFields.id.required(),
    }),
  ),
  getAvailability,
);

/**
 * @swagger
 * /booking:
 *   post:
 *     summary: Create a new booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instructorId
 *               - date
 *               - time
 *               - duration_mins
 *             properties:
 *               instructorId:
 *                 type: string
 *                 description: ID of the instructor to book for
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date exactly in YYYY-MM-DD format
 *                 example: "2025-12-25"
 *               time:
 *                 type: string
 *                 description: Time exactly in HH:mm or HH:mm:ss format (24-hour clock)
 *                 example: "14:00"
 *               duration_mins:
 *                 type: integer
 *                 example: 60
 *               isFree:
 *                 type: boolean
 *                 description: >
 *                   If true, the session will be free (uses student's `freeHours` and increases mentor's `helpTotalHours`).
 *                   If false (default), and the instructor is a Mentor, it will be a paid session using the mentor's `hourlyPrice`.
 *                 example: false
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       404:
 *         description: User not found
 */
BookingRouter.post(
  "/",
  auth(Object.values(roles)),
  validation(validators.createBookingSchema),
  createBooking,
);

/**
 * @swagger
 * /booking:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BookingResponse'
 */
BookingRouter.get("/", auth([roles.Admin]), getAllBookings);

/**
 * @swagger
 * /booking/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   $ref: '#/components/schemas/BookingResponse'
 *       404:
 *         description: Booking not found
 */
BookingRouter.get(
  "/:id",
  auth(Object.values(roles)),
  validation(validators.bookingIdSchema),
  getBooking,
);

/**
 * @swagger
 * /booking/{id}:
 *   patch:
 *     summary: Update booking details
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date exactly in YYYY-MM-DD format
 *                 example: "2025-12-25"
 *               time:
 *                 type: string
 *                 description: Time exactly in HH:mm or HH:mm:ss format (24-hour clock)
 *                 example: "14:00"
 *               duration_mins:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Booking updated
 *       400:
 *         description: Invalid data or booking not pending
 */
BookingRouter.patch(
  "/:id",
  auth(Object.values(roles)),
  validation(validators.updateBookingSchema),
  updateBooking,
);

/**
 * @swagger
 * /booking/{id}/changeStatus:
 *   patch:
 *     summary: Accept or Reject a booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected]
 *     responses:
 *       200:
 *         description: Booking status updated
 *       400:
 *         description: Invalid status or booking already processed
 */
BookingRouter.patch(
  "/:id/changeStatus",
  auth(Object.values(roles)),
  validation(validators.changeStatusSchema),
  changeBookingStatus,
);

/**
 * @swagger
 * /booking/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cannot cancel (already completed/rejected)
 */
BookingRouter.patch(
  "/:id/cancel",
  auth(Object.values(roles)),
  validation(validators.bookingIdSchema),
  cancelBooking,
);

/**
 * @swagger
 * /booking/{id}/complete:
 *   patch:
 *     summary: Complete a booking and submit a review
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rate
 *               - review
 *             properties:
 *               rate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       200:
 *         description: >
 *           Booking completed and review submitted.
 *           Returns the updated `instructor` object. Important: The `reviews` array inside the instructor object contains completely populated `reviewer` details (`name`, `userImage`, `role`).
 *       400:
 *         description: Cannot complete (not accepted) or already rated
 *       403:
 *         description: Only the student can complete and review
 */
BookingRouter.patch(
  "/:id/complete",
  auth(Object.values(roles)),
  validation(validators.completeBookingSchema),
  completeBooking,
);

/**
 * @swagger
 * /booking/{id}/pay:
 *   post:
 *     summary: Create a Stripe Checkout Session to pay for an accepted booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - successUrl
 *               - cancelUrl
 *             properties:
 *               successUrl:
 *                 type: string
 *                 description: Deep link or URL to redirect to on successful payment (e.g. skillswap://payment/success)
 *                 example: "https://example.com/payment/success"
 *               cancelUrl:
 *                 type: string
 *                 description: Deep link or URL to redirect to on cancelled payment
 *                 example: "https://example.com/payment/cancel"
 *               voucherId:
 *                 type: string
 *                 description: Optional ID of a purchased voucher to apply as a discount
 *                 example: "60d5ecfd4b745b162c823abc"
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 checkoutUrl:
 *                   type: string
 *                   description: Stripe Checkout URL to open in the mobile WebView
 *                 sessionId:
 *                   type: string
 *       400:
 *         description: Booking not accepted yet or already paid
 *       403:
 *         description: Unauthorized
 */
BookingRouter.post(
  "/:id/pay",
  auth(Object.values(roles)),
  validation(validators.payBookingSchema),
  createCheckoutSession,
);

/**
 * @swagger
 * /booking/{id}/confirm-payment:
 *   patch:
 *     summary: Manually confirm payment status (Fallback for failed webhooks)
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Payment not verified by Stripe
 */
BookingRouter.patch(
  "/:id/confirm-payment",
  auth(Object.values(roles)),
  validation(validators.bookingIdSchema),
  confirmPayment,
);

/**
 * @swagger
 * /booking/{id}/join:
 *   patch:
 *     summary: Join an accepted session (record attendance)
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined the session
 *       400:
 *         description: Booking is not accepted or already expired/cancelled
 *       403:
 *         description: Unauthorized (You are not part of this booking)
 */
BookingRouter.patch(
  "/:id/join",
  auth(Object.values(roles)),
  validation(validators.bookingIdSchema),
  joinSession,
);

export default BookingRouter;
