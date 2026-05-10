import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, "../firebase-service-account.json");

try {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }

  if (serviceAccount) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully.");
    }
  } else {
    console.warn("Firebase credentials not found (env or file)! Notifications will not work.");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error.message);
}

export const sendPushNotification = async ({ fcmToken, title, body, data = {} }) => {
  if (!fcmToken) return false;

  const message = {
    token: fcmToken,
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      title: String(title),
      body: String(body),
    },
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("FCM Notification sent successfully:", response);
    return true;
  } catch (err) {
    console.error("FCM send error:", err.message);
    return false;
  }
};

export const sendMulticastNotification = async ({ fcmTokens, title, body, data = {} }) => {
  if (!fcmTokens || fcmTokens.length === 0) return;

  const validTokens = fcmTokens.filter(Boolean);
  if (validTokens.length === 0) return;

  const message = {
    tokens: validTokens,
    notification: {
      title,
      body,
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Sent ${response.successCount} notifications successfully.`);
  } catch (err) {
    console.error("FCM multicast error:", err.message);
  }
};

export const notifyNewMessage = (fcmToken, { senderName, chatId, senderId }) =>
  sendPushNotification({
    fcmToken,
    title: "New Message",
    body: `${senderName} sent you a message`,
    data: { type: "chat_message", chat_id: String(chatId), sender_id: String(senderId) },
  });

export const notifyRequestAccepted = (fcmToken, { bookingId, instructorName }) =>
  sendPushNotification({
    fcmToken,
    title: "Request Accepted",
    body: `${instructorName} accepted your session request`,
    data: { type: "request_accepted", booking_id: String(bookingId) },
  });

export const notifyRequestRejected = (fcmToken, { bookingId, instructorName }) =>
  sendPushNotification({
    fcmToken,
    title: "Request Rejected",
    body: `${instructorName} rejected your session request`,
    data: { type: "request_rejected", booking_id: String(bookingId) },
  });

export const notifySessionStarted = (fcmToken, { bookingId }) =>
  sendPushNotification({
    fcmToken,
    title: "Session Started",
    body: "The session has started, join now!",
    data: { type: "session_started", booking_id: String(bookingId) },
  });

export const notifySessionReminder = (fcmToken, { bookingId, minutesBefore = 15 }) =>
  sendPushNotification({
    fcmToken,
    title: "Session Reminder",
    body: `Your session will start in ${minutesBefore} minutes`,
    data: { type: "session_reminder", booking_id: String(bookingId) },
  });

export const notifyRatingRequest = (fcmToken, { bookingId, instructorName }) =>
  sendPushNotification({
    fcmToken,
    title: "Rate Your Session",
    body: `How was your session with ${instructorName}? Share your feedback`,
    data: { type: "rating_request", booking_id: String(bookingId) },
  });

export const notifyNewBooking = (fcmToken, { studentName, bookingId }) =>
  sendPushNotification({
    fcmToken,
    title: "New Session Request",
    body: `You have a new session request from ${studentName}`,
    data: { type: "new_booking", booking_id: String(bookingId) },
  });

export const notifyBookingCancelled = (fcmToken, { cancellerName, bookingId }) =>
  sendPushNotification({
    fcmToken,
    title: "Session Cancelled",
    body: `${cancellerName} has cancelled the session`,
    data: { type: "booking_cancelled", booking_id: String(bookingId) },
  });
