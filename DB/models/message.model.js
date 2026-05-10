import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema(
  {
    chatId: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    senderId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    readBy: [{ type: Types.ObjectId, ref: "User" }],
    localTimestamp: Date,
    replyTo: {
      type: Types.ObjectId,
      ref: "Message",
      default: null,
    },
    themeId: {
      type: Types.ObjectId,
      ref: "StoreItem",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ chatId: 1, createdAt: -1 });

const messageModel = model("Message", messageSchema);
export default messageModel;
