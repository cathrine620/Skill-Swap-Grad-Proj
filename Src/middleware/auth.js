import userModel from "../../DB/models/user.model.js";
import { asyncHandler } from "../../utils/errorHandling.js";
import { verifyToken } from "../../utils/GenerateAndVerifyToken.js";

export const roles = {
  Admin: "Admin",
  Normal: "Normal",
  Mentor: "Mentor",
};
export const auth = (accessRoles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
      return next(new Error("In-valid Bearer Key", { cause: 400 }));
    }
    if (!authorization?.startsWith(process.env.BEARER_KEY)) {
      return next(new Error("In-valid Bearer Key", { cause: 400 }));
    }
    const token = authorization.split(process.env.BEARER_KEY)[1];
    if (!token) {
      return next(new Error("In-valid token", { cause: 400 }));
    }
    const decoded = verifyToken({ token });
    if (!decoded?.id) {
      return next(new Error("In-valid token payload", { cause: 400 }));
    }

    const user = await userModel
      .findById(decoded.id)
      .select(
        "userName email image role changePasswordTime blockInfo warningCount token",
      );
    if (!user) {
      return next(new Error("Not register user", { cause: 401 }));
    }

    if (user.token && user.token !== token) {
      return next(
        new Error("Session expired. Another login detected.", { cause: 401 }),
      );
    }

    if (parseInt(user.changePasswordTime?.getTime() / 1000) > decoded.iat) {
      return next(new Error("Expired token", { cause: 400 }));
    }

    if (
      user.blockInfo?.isBlocked &&
      user.blockInfo?.blockedUntil &&
      user.blockInfo.blockedUntil !== null
    ) {
      const now = new Date();
      if (now > user.blockInfo.blockedUntil) {
        user.blockInfo.isBlocked = false;
        user.blockInfo.blockedUntil = null;
        user.blockInfo.blockReason = "";
        user.blockInfo.blockedBy = null;
        user.blockInfo.blockedAt = null;
        user.isActive = true;
        await user.save();
      }
    }

    if (user.blockInfo?.isBlocked) {
      const message = user.blockInfo.blockedUntil
        ? `Your account is blocked until ${user.blockInfo.blockedUntil.toLocaleDateString()}. Reason: ${
            user.blockInfo.blockReason
          }`
        : `Your account has been permanently blocked. Reason: ${user.blockInfo.blockReason}`;
      return next(new Error(message, { cause: 403 }));
    }

    if (!accessRoles.includes(user.role)) {
      return next(new Error("Not authorized user", { cause: 403 }));
    }
    req.user = user;
    return next();
  });
};
