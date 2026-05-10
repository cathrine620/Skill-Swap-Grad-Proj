import userModel from "../../DB/models/user.model.js";
import { verifyToken } from "../../utils/GenerateAndVerifyToken.js";

export const socketAuth = async (socket, next) => {
  try {
    let token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization ||
      socket.handshake.headers.Authorization ||
      socket.handshake.headers.token ||
      socket.handshake.query.token;

    if (!token) {
      return next(
        new Error(
          "Authentication Missing: Token required in handshake auth/query",
        ),
      );
    }

    const bearerKey = process.env.BEARER_KEY || "skill-swap ";
    if (!token.startsWith(bearerKey)) {
      return next(new Error("Authentication Error: Invalid Bearer Key"));
    }

    const rawToken = token.split(bearerKey)[1];
    if (!rawToken) {
      return next(
        new Error("Authentication Error: Token missing after Bearer Key"),
      );
    }

    const decoded = verifyToken({ token: rawToken });
    if (!decoded?.id) {
      return next(new Error("Authentication Error: Invalid Token Payload"));
    }

    const user = await userModel
      .findById(decoded.id)
      .select("userName email userImage role blockInfo");

    if (!user) {
      return next(new Error("Authentication Error: User not found"));
    }

    if (user.blockInfo?.isBlocked) {
      return next(new Error("Authentication Error: User is blocked"));
    }

    socket.user = user;
    socket.userId = user._id.toString();

    console.log(`Socket Authenticated: ${user.userName} (${user._id})`);
    next();
  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    next(new Error("Authentication Failed: " + error.message));
  }
};
