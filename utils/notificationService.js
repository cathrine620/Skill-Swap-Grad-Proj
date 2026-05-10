import userModel from "../DB/models/user.model.js";
import { sendPushNotification } from "./firebaseNotification.js";
import { sendPusherNotification } from "./pusherNotification.js";
import { NOTIFICATION_TYPES } from "./notificationTypes.js";

const getNotificationContent = (type, payload) => {
  switch (type) {
    case NOTIFICATION_TYPES.CHAT_MESSAGE:
      return {
        title: "New Message",
        body: `${payload.senderName} sent you a message`,
        data: {
          type,
          chat_id: String(payload.chatId),
          sender_id: String(payload.senderId),
        },
      };
    case NOTIFICATION_TYPES.REQUEST_ACCEPTED:
      return {
        title: "Request Accepted",
        body: `${payload.instructorName} accepted your session request`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.REQUEST_REJECTED:
      return {
        title: "Request Rejected",
        body: `${payload.instructorName} rejected your session request`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.SESSION_STARTED:
      return {
        title: "Session Started",
        body: "The session has started, join now!",
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.SESSION_REMINDER:
      return {
        title: "Session Reminder",
        body: `Your session will start in ${payload.minutesBefore || 15} minutes`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.RATING_REQUEST:
      return {
        title: "Rate Your Session",
        body: `How was your session with ${payload.instructorName}? Share your feedback`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.NEW_BOOKING:
      return {
        title: "New Session Request",
        body: `You have a new session request from ${payload.studentName}`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.BOOKING_CANCELLED:
      return {
        title: "Session Cancelled",
        body: `${payload.cancellerName} has cancelled the session`,
        data: {
          type,
          booking_id: String(payload.bookingId),
        },
      };
    case NOTIFICATION_TYPES.TEST:
      return {
        title: "Test Notification",
        body: `Hello ${payload.userName || ""}! Notifications are working properly.`,
        data: { type },
      };
    default:
      return null;
  }
};

export const sendNotification = async (userId, type, payload = {}) => {
  console.log(`[Notification] Initiating send for userId: ${userId}, type: ${type}`);
  try {
    if (!userId || !type) return false;

    const content = getNotificationContent(type, payload);
    if (!content) {
      console.error(`[Notification] Unknown notification type: ${type}`);
      return false;
    }

    const { title, body, data } = content;

    console.log(`[Notification] Sending '${type}' to userId: ${userId}`);

    await sendPusherNotification(userId, { title, body, data });
    console.log(`[Notification] Pusher sent for userId: ${userId}`);

    const user = await userModel.findById(userId).select("fcmToken");

    if (!user) {
      console.warn(`[Notification] User not found in DB: ${userId}`);
      return false;
    }

    if (!user.fcmToken) {
      console.warn(`[Notification] No FCM token saved for userId: ${userId}.`);
      return true;
    }

    console.log(`[Notification] Sending FCM push to token: ${user.fcmToken.slice(0, 20)}...`);
    const fcmResult = await sendPushNotification({
      fcmToken: user.fcmToken,
      title,
      body,
      data,
    });

    if (!fcmResult) {
      console.error(`[Notification] FCM push failed for userId: ${userId}`);
    } else {
      console.log(`[Notification] FCM push sent successfully for userId: ${userId}`);
    }

    return true;
  } catch (error) {
    console.error("[Notification] Service Error:", error.message);
    return false;
  }
};
