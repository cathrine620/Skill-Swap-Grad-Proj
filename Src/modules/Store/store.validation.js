import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const addStoreItemSchema = joi
  .object({
    title: joi.string().required(),
    type: joi.string().valid("voucher", "hours", "theme").required(),
    priceInPoints: joi.number().min(0).required(),
    value: joi.string().required(),
    validityDays: joi.number().min(1).optional(),
    isActive: joi.boolean().optional(),
    img: generalFields.file.optional()
  })
  .required();

export const purchaseItemSchema = joi
  .object({
    itemId: generalFields.id.required(),
  })
  .required();

export const updateStoreItemSchema = joi
  .object({
    itemId: generalFields.id.required(),
    title: joi.string().optional(),
    type: joi.string().valid("voucher", "hours", "theme").optional(),
    priceInPoints: joi.number().min(0).optional(),
    value: joi.string().optional(),
    validityDays: joi.number().min(1).optional(),
    isActive: joi.boolean().optional(),
    img: generalFields.file.optional()
  })
  .required();

export const deleteStoreItemSchema = joi
  .object({
    itemId: generalFields.id.required(),
  })
  .required();
