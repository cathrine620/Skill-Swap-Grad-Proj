import userModel from "../../../../DB/models/user.model.js";
import { asyncHandler } from "../../../../utils/errorHandling.js";
import { sendNotification } from "../../../../utils/notificationService.js";
import { NOTIFICATION_TYPES } from "../../../../utils/notificationTypes.js";

export const saveFcmToken = asyncHandler(async (req, res, next) => {
  const { fcmToken } = req.body;

  if (!fcmToken || typeof fcmToken !== "string") {
    return next(new Error("fcmToken is required and must be a string", { cause: 400 }));
  }

  await userModel.findByIdAndUpdate(req.user._id, { fcmToken });

  return res.status(200).json({ message: "FCM token saved successfully" });
});

export const removeFcmToken = asyncHandler(async (req, res, next) => {
  await userModel.findByIdAndUpdate(req.user._id, { fcmToken: null });
  return res.status(200).json({ message: "FCM token removed successfully" });
});

export const testPushNotification = asyncHandler(async (req, res, next) => {
  const { type, payload } = req.body;
  const user = await userModel.findById(req.user._id).select("fcmToken name");

  if (!user?.fcmToken) {
    return next(
      new Error("No FCM token saved for this user", { cause: 400 })
    );
  }

  const notificationType = type || NOTIFICATION_TYPES.TEST;

  if (type && !Object.values(NOTIFICATION_TYPES).includes(type)) {
    return next(new Error(`Invalid notification type. Available types: ${Object.values(NOTIFICATION_TYPES).join(", ")}`, { cause: 400 }));
  }

  const sent = await sendNotification(req.user._id, notificationType, {
    userName: user.name,
    ...payload
  });

  if (!sent) {
    return next(new Error("Failed to send test notification", { cause: 500 }));
  }

  return res.status(200).json({ 
    message: `Test notifications (${notificationType}) sent successfully`,
    targetToken: user.fcmToken 
  });
});
