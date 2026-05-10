import chatModel from "../../../DB/models/chat.model.js";
import messageModel from "../../../DB/models/message.model.js";
import trackModel from "../../../DB/models/track.model.js";
import userModel from "../../../DB/models/user.model.js";
import { asyncHandler } from "../../../utils/errorHandling.js";
import { triggerPusher } from "../../../utils/pusher.js";
import { sendNotification } from "../../../utils/notificationService.js";
import { NOTIFICATION_TYPES } from "../../../utils/notificationTypes.js";

export const createTrack = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const isTrack = await trackModel.findOne({ name: name.trim() });
  if (isTrack) {
    return next(new Error("Track already exists", { cause: 400 }));
  }
  const track = await trackModel.create({
    name: name.trim(),
    slug,
    description,
  });
  return res.status(201).json({ message: "Track created successfully", track });
});

export const getAllTracks = asyncHandler(async (req, res, next) => {
  const tracks = await trackModel.find();
  return res.status(200).json({ message: "Done", tracks });
});

export const joinTrack = asyncHandler(async (req, res, next) => {
  const { trackId } = req.params;
  const userId = req.user._id;

  const track = await trackModel.findById(trackId);
  if (!track) return next(new Error("Track not found", { cause: 404 }));

  let chat = await chatModel.findOne({ type: "track", trackId });
  if (!chat) {
    chat = await chatModel.create({
      type: "track",
      trackId,
      name: `${track.name} Group`,
      participants: [userId],
    });
  } else {
    await chatModel.findByIdAndUpdate(chat._id, {
      $addToSet: { participants: userId },
    });
  }

  return res.status(200).json({ message: "Joined track successfully", chat });
});

export const getMyChats = asyncHandler(async (req, res, next) => {
  const chats = await chatModel
    .find({
      $or: [
        { type: "global" },
        {
          participants: req.user._id,
          type: { $in: ["track", "private", "group"] },
        },
      ],
    })
    .populate("lastMessage")
    .populate("participants", "name userImage email")
    .populate("trackId", "name")
    .sort({ updatedAt: -1 });

  return res.status(200).json({ message: "Done", chats });
});

export const createPrivateChat = asyncHandler(async (req, res, next) => {
  const { partnerId } = req.body;

  if (partnerId === req.user._id.toString()) {
    return next(new Error("Cannot chat with yourself", { cause: 400 }));
  }

  const partner = await userModel.findById(partnerId);
  if (!partner) {
    return next(new Error("User not found", { cause: 404 }));
  }

  let chat = await chatModel.findOne({
    type: "private",
    participants: { $all: [req.user._id, partnerId] },
  });

  if (!chat) {
    chat = await chatModel.create({
      type: "private",
      participants: [req.user._id, partnerId],
    });
  }

  return res.status(200).json({ message: "Chat ready", chat });
});

export const sendMessage = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;
  const { content, type = "text", replyTo } = req.body;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  if (chat.type !== "global") {
    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return next(
        new Error(
          "Unauthorized: You must join this chat before sending messages",
          {
            cause: 403,
          },
        ),
      );
    }
  }

  if (replyTo) {
    const repliedMsg = await messageModel.findOne({ _id: replyTo, chatId });
    if (!repliedMsg) {
      return next(
        new Error("Reply target message not found in this chat", {
          cause: 404,
        }),
      );
    }
  }

  const user = await userModel
    .findById(req.user._id)
    .select("name activeTheme");

  const message = await messageModel.create({
    chatId,
    senderId: req.user._id,
    content,
    messageType: type,
    replyTo: replyTo || null,
    themeId: user?.activeTheme || null,
  });

  chat.lastMessage = message._id;
  await chat.save();

  const roomName = chatId.toString();

  const populatedMessage = await messageModel
    .findById(message._id)
    .populate("senderId", "name userImage role")
    .populate("themeId", "title value img")
    .populate({
      path: "replyTo",
      select: "content messageType senderId createdAt",
      populate: { path: "senderId", select: "name userImage role" },
    });

  await triggerPusher(roomName, "receive_message", {
    chatId: roomName,
    senderId: populatedMessage.senderId._id,
    message: populatedMessage.content,
    messageType: populatedMessage.messageType,
    timestamp: (() => {
      const date = new Date(populatedMessage.createdAt);
      date.setHours(date.getHours() + 3);
      return date;
    })(),
    timeOnly: (() => {
      const date = new Date(populatedMessage.createdAt);
      date.setHours(date.getHours() + 3);
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    })(),
    replyTo: populatedMessage.replyTo || null,
    senderData: {
      userName: populatedMessage.senderId.name,
      userImage: populatedMessage.senderId.userImage,
    },
    theme: populatedMessage.themeId
      ? {
          id: populatedMessage.themeId._id,
          title: populatedMessage.themeId.title,
          value: populatedMessage.themeId.value,
          image: populatedMessage.themeId.img?.secure_url || "",
        }
      : null,
  });

  const participantsToNotify = chat.type === "global" ? [] : chat.participants;
  if (chat.type !== "global") {
    for (const participantId of participantsToNotify) {
      await triggerPusher(`user_chats_${participantId}`, "chat_list_update", {
        chatId: chat._id,
        lastMessage: {
          content: message.content,
          createdAt: message.createdAt,
        },
      });
    }
  } else {
    await triggerPusher("global_chats", "chat_list_update", {
      chatId: chat._id,
      lastMessage: {
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  }

  if (chat.type !== "global") {
    const otherParticipantIds = chat.participants.filter(
      (p) => p.toString() !== req.user._id.toString(),
    );

    if (otherParticipantIds.length > 0) {
      for (const participantId of otherParticipantIds) {
        await sendNotification(
          participantId.toString(),
          NOTIFICATION_TYPES.CHAT_MESSAGE,
          {
            senderName: user.name || "Someone",
            chatId: chatId.toString(),
            senderId: req.user._id.toString(),
          },
        );
      }
    }
  }

  const responseData = populatedMessage.toObject();
  if (responseData.themeId) {
    responseData.theme = {
      id: responseData.themeId._id,
      title: responseData.themeId.title,
      value: responseData.themeId.value,
      image: responseData.themeId.img?.secure_url || "",
    };
    delete responseData.themeId;
  } else {
    responseData.theme = null;
  }

  return res.status(201).json({ message: "Sent", data: responseData });
});

export const getMessages = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  if (chat.type !== "global") {
    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );
    if (!isParticipant) {
      return next(
        new Error("Unauthorized: You are not a participant in this chat", {
          cause: 403,
        }),
      );
    }
  }

  const messages = await messageModel
    .find({ chatId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("senderId", "name userImage role")
    .populate("themeId", "title value img")
    .populate({
      path: "replyTo",
      select: "content messageType senderId createdAt",
      populate: { path: "senderId", select: "name userImage role" },
    });

  const total = await messageModel.countDocuments({ chatId });

  const processedMessages = messages.map((msg) => {
    const msgObj = msg.toObject();
    if (msgObj.themeId) {
      msgObj.theme = {
        id: msgObj.themeId._id,
        title: msgObj.themeId.title,
        value: msgObj.themeId.value,
        image: msgObj.themeId.img?.secure_url || "",
      };
      delete msgObj.themeId;
    } else {
      msgObj.theme = null;
    }
    msgObj.userId = req.user._id;

    if (msgObj.createdAt) {
      const date = new Date(msgObj.createdAt);
      date.setHours(date.getHours() + 3);

      msgObj.createdAt = date;
      msgObj.timeOnly = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    return msgObj;
  });

  return res.status(200).json({
    message: "Done",
    userId: req.user._id,
    messages: processedMessages.reverse(),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export const searchMessages = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;
  const { q } = req.query;

  if (!q) {
    return next(new Error("Search query (q) is required", { cause: 400 }));
  }

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  if (chat.type !== "global") {
    const isParticipant = chat.participants.some(
      (p) => p.toString() === req.user._id.toString(),
    );
    if (!isParticipant) {
      return next(
        new Error("Unauthorized: You are not a participant in this chat", {
          cause: 403,
        }),
      );
    }
  }

  const messages = await messageModel
    .find({
      chatId,
      content: { $regex: q, $options: "i" },
      messageType: "text",
    })
    .sort({ createdAt: -1 })
    .populate("senderId", "name userImage role")
    .populate("themeId", "title value img")
    .populate({
      path: "replyTo",
      select: "content messageType senderId createdAt",
      populate: { path: "senderId", select: "name userImage role" },
    });

  const processedMessages = messages.map((msg) => {
    const msgObj = msg.toObject();
    if (msgObj.themeId) {
      msgObj.theme = {
        id: msgObj.themeId._id,
        title: msgObj.themeId.title,
        value: msgObj.themeId.value,
        image: msgObj.themeId.img?.secure_url || "",
      };
      delete msgObj.themeId;
    } else {
      msgObj.theme = null;
    }
    msgObj.userId = req.user._id;
    return msgObj;
  });

  return res.status(200).json({
    message: "Search results",
    userId: req.user._id,
    results: processedMessages,
    count: processedMessages.length,
  });
});

export const markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  if (chat.type !== "global") {
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString(),
    );
    if (!isParticipant) {
      return next(
        new Error("Unauthorized: You are not a participant in this chat", {
          cause: 403,
        }),
      );
    }
  }

  const result = await messageModel.updateMany(
    {
      chatId,
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    },
    {
      $addToSet: { readBy: userId },
    },
  );

  if (result.modifiedCount > 0) {
    await triggerPusher(chatId.toString(), "messages_read", {
      chatId: chatId.toString(),
      readByUserId: userId,
      readerData: {
        _id: userId,
        name: req.user.name,
        userImage: req.user.userImage,
        role: req.user.role,
      },
      timestamp: new Date(),
    });
  }

  return res.status(200).json({
    message: "Messages marked as read",
    modifiedCount: result.modifiedCount,
  });
});

export const editMessage = asyncHandler(async (req, res, next) => {
  const { chatId, messageId } = req.params;
  const { content } = req.body;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  const message = await messageModel.findOne({ _id: messageId, chatId });
  if (!message) return next(new Error("Message not found", { cause: 404 }));

  if (message.senderId.toString() !== req.user._id.toString()) {
    return next(
      new Error("Unauthorized: You can only edit your own messages", {
        cause: 403,
      }),
    );
  }

  message.content = content;
  await message.save();

  const populatedMessage = await messageModel
    .findById(message._id)
    .populate("senderId", "name userImage role");

  const roomName = chatId.toString();

  await triggerPusher(roomName, "message_edited", {
    chatId: roomName,
    messageId: message._id.toString(),
    newContent: content,
    updatedAt: message.updatedAt,
    senderId: populatedMessage.senderId._id,
  });

  return res
    .status(200)
    .json({ message: "Message updated successfully", data: populatedMessage });
});

export const deleteMessage = asyncHandler(async (req, res, next) => {
  const { chatId, messageId } = req.params;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  const message = await messageModel.findOne({ _id: messageId, chatId });
  if (!message) return next(new Error("Message not found", { cause: 404 }));

  if (message.senderId.toString() !== req.user._id.toString()) {
    return next(
      new Error("Unauthorized: You can only delete your own messages", {
        cause: 403,
      }),
    );
  }

  await message.deleteOne();

  if (chat.lastMessage?.toString() === messageId.toString()) {
    const previousMessage = await messageModel
      .findOne({ chatId })
      .sort({ createdAt: -1 });

    chat.lastMessage = previousMessage ? previousMessage._id : null;
    await chat.save();
  }

  const roomName = chatId.toString();

  await triggerPusher(roomName, "message_deleted", {
    chatId: roomName,
    messageId: messageId.toString(),
  });

  return res.status(200).json({
    message: "Message deleted successfully",
    deletedMessageId: messageId,
  });
});

export const leaveGroupChat = asyncHandler(async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  const chat = await chatModel.findById(chatId);
  if (!chat) return next(new Error("Chat not found", { cause: 404 }));

  if (!["group", "track"].includes(chat.type)) {
    return next(
      new Error("You can only leave group or track chats", { cause: 400 }),
    );
  }

  const isParticipant = chat.participants.some(
    (p) => p.toString() === userId.toString(),
  );

  if (!isParticipant) {
    return next(
      new Error("You are not a participant in this chat", { cause: 400 }),
    );
  }

  chat.participants = chat.participants.filter(
    (p) => p.toString() !== userId.toString(),
  );

  await chat.save();

  const roomName = chatId.toString();

  await triggerPusher(roomName, "user_left_group", {
    chatId: roomName,
    userId: userId.toString(),
    userName: req.user.name,
  });

  return res.status(200).json({ message: "Successfully left the group chat" });
});
