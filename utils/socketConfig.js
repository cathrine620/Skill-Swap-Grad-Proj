export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  JOIN_CHAT: "join_chat",
  LEAVE_CHAT: "leave_chat",
  SEND_MESSAGE: "send_message",
  RECEIVE_MESSAGE: "receive_message",
  TYPING: "typing",
  STOP_TYPING: "stop_typing",

  MESSAGE_DELIVERED: "message_delivered",
  MESSAGE_READ: "message_read",

  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",

  ERROR: "error",
  CHAT_ERROR: "chat_error",
};

export const SOCKET_CONFIG = {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
};

export const CHAT_ROOM = {
  PRIVATE: (userId1, userId2) => {
    const [user1, user2] = [userId1, userId2].sort();
    return `private_${user1}_${user2}`;
  },

  TRACK: (trackName) => `track_${trackName}`,

  GLOBAL: "global_chat",

  USER: (userId) => `user_${userId}`,

  SESSION: (sessionId) => `session_${sessionId}`,
};

export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  SYSTEM: "system",
};

export const USER_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  AWAY: "away",
  BUSY: "busy",
};

export const SOCKET_RATE_LIMITS = {
  MESSAGE_PER_MINUTE: 30,
  TYPING_PER_MINUTE: 10,
};

export default {
  SOCKET_EVENTS,
  SOCKET_CONFIG,
  CHAT_ROOM,
  MESSAGE_TYPES,
  USER_STATUS,
  SOCKET_RATE_LIMITS,
};
