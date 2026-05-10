import { Schema, model, Types } from "mongoose";

const chatSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["private", "group", "track", "global"],
      default: "private",
    },
    participants: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    name: {
      type: String,
      default: "",
    },
    trackId: {
      type: Types.ObjectId,
      ref: "Track",
    },
    lastMessage: {
      type: Types.ObjectId,
      ref: "Message",
    },
    admin: {
      type: Types.ObjectId,
      ref: "User",
    },
    image: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, trackId: 1 });
chatSchema.index({ updatedAt: -1 });

const chatModel = model("Chat", chatSchema);
export default chatModel;
