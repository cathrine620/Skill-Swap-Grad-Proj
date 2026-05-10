import joi from "joi";
import { Types } from "mongoose";
import { generalFields } from "../../middleware/validation.js";
export { generalFields };

export const createBookingSchema = joi
  .object({
    instructorId: generalFields.id.required().messages({
      "any.required": "Instructor ID is required",
    }),
    date: joi
      .string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Date must be in YYYY-MM-DD format (e.g., 2026-12-01)",
        "any.required": "Date is required",
      }),
    time: joi
      .string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
      .required()
      .messages({
        "string.pattern.base":
          "Time must be in HH:mm or HH:mm:ss format (e.g., 14:30)",
        "any.required": "Time is required",
      }),
    duration_mins: joi.number().integer().min(15).required().messages({
      "number.min": "Duration must be at least 15 minutes",
      "any.required": "Duration is required",
    }),
    isFree: joi.boolean().optional().default(false),
  })
  .required();

export const updateBookingSchema = joi
  .object({
    id: generalFields.id.required(),
    date: joi
      .string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .messages({
        "string.pattern.base":
          "Date must be in YYYY-MM-DD format (e.g., 2026-12-01)",
      }),
    time: joi
      .string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
      .messages({
        "string.pattern.base":
          "Time must be in HH:mm or HH:mm:ss format (e.g., 14:30)",
      }),
    duration_mins: joi.number().integer().min(15),
  })
  .required();

export const changeStatusSchema = joi
  .object({
    id: generalFields.id.required(),
    status: joi.string().valid("accepted", "rejected").required().messages({
      "any.only": "Status must be either accepted or rejected",
      "any.required": "Status is required",
    }),
  })
  .required();

export const bookingIdSchema = joi
  .object({
    id: generalFields.id.required(),
  })
  .required();

export const getUserBookingsSchema = joi
  .object({
    status: joi
      .string()
      .valid(
        "pending",
        "accepted",
        "rejected",
        "cancelled",
        "completed",
        "all",
        "request",
        "requested",
      )
      .optional()
      .messages({
        "any.only": "Invalid status parameter",
      }),
  })
  .required();

export const payBookingSchema = joi
  .object({
    id: generalFields.id.required(),
    successUrl: joi.string().uri().required().messages({
      "string.uri": "successUrl must be a valid URL or deep link",
      "any.required": "successUrl is required",
    }),
    cancelUrl: joi.string().uri().required().messages({
      "string.uri": "cancelUrl must be a valid URL or deep link",
      "any.required": "cancelUrl is required",
    }),
    voucherId: generalFields.optionalId.allow(null, ""),
  })
  .required();

export const setAvailabilitySchema = joi
  .object({
    rotationType: joi.string().valid("weekly", "monthly", "permanent").required(),
    from: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    to: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    availableDates: joi
      .array()
      .items(
        joi.alternatives().try(
          joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
          joi.object({
            date: joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
            from: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
            to: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
          })
        )
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one available date is required",
        "any.required": "availableDates is required",
      }),
  })
  .required();

export const addAvailabilityDaySchema = joi
  .object({
    date: joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    from: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    to: joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    rotationType: joi.string().valid("weekly", "monthly", "permanent").required(),
  })
  .required();

export const completeBookingSchema = joi
  .object({
    id: generalFields.id.required(),
    rate: joi.number().min(0).max(5).required().messages({
      "number.min": "Rate must be between 0 and 5",
      "number.max": "Rate must be between 0 and 5",
      "any.required": "Rate is required",
    }),
    review: joi.string().allow("").optional(),
  })
  .required();

export const deleteAvailabilitySchema = joi
  .object({
    idOrDate: joi.alternatives().try(
      joi.string().custom((value, helper) => {
        if (Types.ObjectId.isValid(value)) return value;
        return helper.message("Invalid ID format");
      }),
      joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).required().messages({
      "any.required": "An ID or Date is required to delete availability",
    }),
  })
  .required();

