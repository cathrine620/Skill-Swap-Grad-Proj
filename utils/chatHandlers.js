import { SOCKET_EVENTS, CHAT_ROOM, MESSAGE_TYPES } from "./socketConfig.js";
import chatModel from "../DB/models/chat.model.js";
import messageModel from "../DB/models/message.model.js";
import userModel from "../DB/models/user.model.js";
import { Types } from "mongoose";
import { sendNotification } from "./notificationService.js";
import { NOTIFICATION_TYPES } from "./notificationTypes.js";

export const setupChatHandlers = (io) => {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log(`Chat socket connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.JOIN_CHAT, async (data) => {
      try {
        const { chatId, userId } = data;
        if (!chatId || !userId) return;

        socket.join(chatId);
        console.log(`User ${userId} joined room: ${chatId}`);

        let realChatd = null;

        if (Types.ObjectId.isValid(chatId)) {
          realChatd = chatId;
        } else {
          let chat = await chatModel.findOne({ name: chatId });

          if (!chat) {
            let type = "group";
            if (chatId.startsWith("track_")) type = "track";
            if (chatId === "global_chat") type = "global";
            if (chatId.startsWith("private_")) type = "private";

            try {
              chat = await chatModel.create({
                name: chatId,
                type: type,
                participants: Types.ObjectId.isValid(userId) ? [userId] : [],
              });
            } catch (e) {
              chat = await chatModel.findOne({ name: chatId });
            }
          }
          if (chat) realChatd = chat._id;
        }

        if (realChatd) {
          const messages = await messageModel
            .find({ chatId: realChatd })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("senderId", "userName userImage");

          socket.emit("history_messages", {
            chatId,
            messages: messages.reverse(),
          });
        }

        socket.to(chatId).emit(SOCKET_EVENTS.USER_ONLINE, { userId });
      } catch (error) {
        console.error("Error joining chat:", error);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CHAT, (data) => {
      const { chatId, userId } = data;
      if (chatId) socket.leave(chatId);
    });

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      try {
        const { chatId, message, messageType = MESSAGE_TYPES.TEXT } = data;
        const senderId = socket.userId;

        if (!chatId || !senderId || !message) return;

        const timestamp = new Date();
        const msgPayload = {
          chatId,
          senderId,
          message,
          messageType,
          timestamp,
        };

        let dbChat = null;
        if (Types.ObjectId.isValid(chatId)) {
          dbChat = await chatModel.findById(chatId);
        } else {
          dbChat = await chatModel.findOne({ name: chatId });
        }

        if (dbChat && dbChat.type !== "global") {
          const isParticipant = dbChat.participants.some(
            (p) => p.toString() === senderId,
          );
          if (!isParticipant) {
            socket.emit(SOCKET_EVENTS.CHAT_ERROR, {
              message: "You are not a participant in this chat",
            });
            return;
          }
        }

        socket.to(chatId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, msgPayload);

        if (Types.ObjectId.isValid(senderId)) {
          let dbChatId = null;

          if (Types.ObjectId.isValid(chatId)) {
            dbChatId = chatId;
          } else {
            let chat = await chatModel.findOne({ name: chatId });

            if (!chat) {
              console.log(`Chat ${chatId} missing during send. Creating now...`);
              let type = "group";
              if (chatId.startsWith("track_")) type = "track";
              if (chatId === "global_chat") type = "global";
              if (chatId.startsWith("private_")) type = "private";

              try {
                chat = await chatModel.create({
                  name: chatId,
                  type: type,
                  participants: [senderId],
                });
              } catch (e) {
                chat = await chatModel.findOne({ name: chatId });
              }
            }

            if (chat) dbChatId = chat._id;
          }

          if (dbChatId) {
            const savedMsg = await messageModel.create({
              chatId: dbChatId,
              senderId,
              content: message,
              messageType,
              localTimestamp: timestamp,
            });
            console.log(`Message Persistence Success! MsgID: ${savedMsg._id}`);

            const sender = await userModel.findById(senderId).select("name");

            if (dbChat && dbChat.type !== "global") {
              const otherParticipants = dbChat.participants.filter(
                (p) => p.toString() !== senderId.toString(),
              );

              for (const participantId of otherParticipants) {
                await sendNotification(
                  participantId,
                  NOTIFICATION_TYPES.CHAT_MESSAGE,
                  {
                    senderId,
                    senderName: sender?.name || "Someone",
                    chatId: dbChatId,
                    message: messageType === "text" ? message : "Attachment",
                  },
                );
              }
            }

            await chatModel.findByIdAndUpdate(dbChatId, {
              lastMessage: savedMsg._id,
              updatedAt: new Date(),
            });
          } else {
            console.error(`DB Save Failed: Could not resolve Chat ID for ${chatId}`);
          }
        } else {
          console.warn(`Skipped DB Save: Sender ID ${senderId} is not a valid ObjectId`);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on(SOCKET_EVENTS.TYPING, (data) => {
      if (data.chatId) socket.to(data.chatId).emit(SOCKET_EVENTS.TYPING, data);
    });

    socket.on(SOCKET_EVENTS.STOP_TYPING, (data) => {
      if (data.chatId)
        socket.to(data.chatId).emit(SOCKET_EVENTS.STOP_TYPING, data);
    });
  });
};

export default setupChatHandlers;
