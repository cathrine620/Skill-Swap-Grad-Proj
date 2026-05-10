import { triggerPusher } from "./pusher.js";

export const sendPusherNotification = async (userId, { title, body, data = {} }) => {
  if (!userId) return;

  const channel = `user_${userId}`;
  const event = "notification";

  await triggerPusher(channel, event, {
    title,
    body,
    ...data,
    timestamp: new Date()
  });
};

export const notifyNewMessagePusher = (userId, { senderName, chatId, senderId }) =>
  sendPusherNotification(userId, {
    title: "New Message",
    body: `${senderName} sent you a message`,
    data: { type: "chat_message", chat_id: String(chatId), sender_id: String(senderId) },
  });

export const notifyRequestAcceptedPusher = (userId, { bookingId, instructorName }) =>
  sendPusherNotification(userId, {
    title: "Request Accepted",
    body: `${instructorName} accepted your session request`,
    data: { type: "request_accepted", booking_id: String(bookingId) },
  });

export const notifyRequestRejectedPusher = (userId, { bookingId, instructorName }) =>
  sendPusherNotification(userId, {
    title: "Request Rejected",
    body: `${instructorName} rejected your session request`,
    data: { type: "request_rejected", booking_id: String(bookingId) },
  });

export const notifySessionStartedPusher = (userId, { bookingId }) =>
  sendPusherNotification(userId, {
    title: "Session Started",
    body: "The session has started, join now!",
    data: { type: "session_started", booking_id: String(bookingId) },
  });

export const notifySessionReminderPusher = (userId, { bookingId, minutesBefore = 15 }) =>
  sendPusherNotification(userId, {
    title: "Session Reminder",
    body: `Your session will start in ${minutesBefore} minutes`,
    data: { type: "session_reminder", booking_id: String(bookingId) },
  });

export const notifyRatingRequestPusher = (userId, { bookingId, instructorName }) =>
  sendPusherNotification(userId, {
    title: "Rate Your Session",
    body: `How was your session with ${instructorName}? Share your feedback`,
    data: { type: "rating_request", booking_id: String(bookingId) },
  });

export const notifyNewBookingPusher = (userId, { studentName, bookingId }) =>
  sendPusherNotification(userId, {
    title: "New Session Request",
    body: `You have a new session request from ${studentName}`,
    data: { type: "new_booking", booking_id: String(bookingId) },
  });

export const notifyBookingCancelledPusher = (userId, { cancellerName, bookingId }) =>
  sendPusherNotification(userId, {
    title: "Session Cancelled",
    body: `${cancellerName} has cancelled the session`,
    data: { type: "booking_cancelled", booking_id: String(bookingId) },
  });
