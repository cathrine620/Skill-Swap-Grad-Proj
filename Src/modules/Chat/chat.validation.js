import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const createTrack = joi
  .object({
    name: joi.string().min(2).max(50).required(),
    description: joi.string().max(200),
  })
  .required();

export const joinTrack = joi
  .object({
    trackId: generalFields.id.required(),
  })
  .required();

export const createPrivateChat = joi
  .object({
    partnerId: generalFields.id.required(),
  })
  .required();

export const sendMessage = joi
  .object({
    chatId: generalFields.id.required(),
    content: joi.string().required(),
    type: joi.string().valid("text", "image", "file").default("text"),
  })
  .required();

export const getMessages = joi
  .object({
    chatId: generalFields.id.required(),
    page: joi.number().integer().min(1),
    limit: joi.number().integer().min(1).max(100),
  })
  .required();

export const editMessage = joi
  .object({
    chatId: generalFields.id.required(),
    messageId: generalFields.id.required(),
    content: joi.string().required(),
  })
  .required();

export const deleteMessage = joi
  .object({
    chatId: generalFields.id.required(),
    messageId: generalFields.id.required(),
  })
  .required();

export const leaveGroupChat = joi
  .object({
    chatId: generalFields.id.required(),
  })
  .required();
export const searchMessages = joi
  .object({
    chatId: generalFields.id.required(),
    q: joi.string().required(),
  })
  .required();
