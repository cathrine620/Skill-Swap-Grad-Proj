import { getIO } from "./socket.js";
import { SOCKET_EVENTS } from "./socketConfig.js";

export const socketEmit = {
  toUser: (userId, eventName, data) => {
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit(eventName, data);
      console.log(`Event '${eventName}' emitted to user: ${userId}`);
    } catch (error) {
      console.error(`Socket Emit Error (toUser):`, error.message);
    }
  },

  toChat: (chatId, messageData) => {
    try {
      const io = getIO();
      io.to(chatId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, messageData);
      console.log(`Message emitted to chat: ${chatId}`);
    } catch (error) {
      console.error(`Socket Emit Error (toChat):`, error.message);
    }
  },

  broadcast: (eventName, data) => {
    try {
      const io = getIO();
      io.emit(eventName, data);
    } catch (error) {
      console.error(`Socket Emit Error (broadcast):`, error.message);
    }
  },
};

export default socketEmit;
