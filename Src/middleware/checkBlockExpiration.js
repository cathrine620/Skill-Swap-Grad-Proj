import userModel from "../../DB/models/user.model.js";
import { asyncHandler } from "../../utils/errorHandling.js";

export const checkBlockExpiration = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (
    user.blockInfo?.isBlocked &&
    user.blockInfo?.blockedUntil &&
    user.blockInfo.blockedUntil !== null
  ) {
    const now = new Date();

    if (now > user.blockInfo.blockedUntil) {
      await userModel.findByIdAndUpdate(user._id, {
        $set: {
          "blockInfo.isBlocked": false,
          "blockInfo.blockedUntil": null,
          "blockInfo.blockReason": "",
          "blockInfo.blockedBy": null,
          "blockInfo.blockedAt": null,
          isActive: true,
        },
      });

      req.user.blockInfo.isBlocked = false;
      req.user.isActive = true;
    }
  }
  if (req.user.blockInfo?.isBlocked) {
    const message = req.user.blockInfo.blockedUntil
      ? `Your account is blocked until ${req.user.blockInfo.blockedUntil.toLocaleDateString()}. Reason: ${
          req.user.blockInfo.blockReason
        }`
      : `Your account has been permanently blocked. Reason: ${req.user.blockInfo.blockReason}`;

    return next(new Error(message, { cause: 403 }));
  }

  return next();
});
