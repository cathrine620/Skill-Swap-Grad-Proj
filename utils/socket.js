import { Server } from "socket.io";
import { SOCKET_CONFIG, SOCKET_EVENTS } from "./socketConfig.js";
import setupChatHandlers from "./chatHandlers.js";
import { socketAuth } from "../Src/middleware/socketAuth.js";

let io = null;
export const onlineUsers = new Map();

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, SOCKET_CONFIG);

  console.log("Socket.IO server initialized");

  io.use(socketAuth);

  setupChatHandlers(io);

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    const userId = socket.userId;
    console.log(`New client connected: ${socket.id} (User: ${userId})`);

    onlineUsers.set(userId, socket.id);

    socket.join(`user_${userId}`);
    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId, socketId: socket.id });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);

      onlineUsers.delete(userId);

      io.emit(SOCKET_EVENTS.USER_OFFLINE, { userId });
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error(`Connection error for ${socket.id}:`, error);
    });

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.error("Socket.IO not initialized");
    return;
  }
  io.to(`user_${userId}`).emit(event, data);
};

export const emitToRoom = (room, event, data) => {
  if (!io) {
    console.error("Socket.IO not initialized");
    return;
  }
  io.to(room).emit(event, data);
};

export const broadcastEvent = (event, data) => {
  if (!io) {
    console.error("Socket.IO not initialized");
    return;
  }
  io.emit(event, data);
};

export default {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRoom,
  broadcastEvent,
};
