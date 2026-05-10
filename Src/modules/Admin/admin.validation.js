import joi from "joi";
import { generalFields } from "../../../utils/generalFields.js";

export const blockUserSchema = joi
  .object({
    userId: generalFields.id,
    days: joi.number().integer().min(1).max(365).required().messages({
      "number.base": "Days must be a number",
      "number.min": "Days must be at least 1",
      "number.max": "Days cannot exceed 365",
      "any.required": "Days is required",
    }),
    reason: joi.string().min(5).max(500).required().messages({
      "string.empty": "Reason is required",
      "string.min": "Reason must be at least 5 characters",
      "string.max": "Reason cannot exceed 500 characters",
      "any.required": "Reason is required",
    }),
  })
  .required();

export const warnUserSchema = joi
  .object({
    userId: generalFields.id,
    reason: joi.string().min(5).max(500).required().messages({
      "string.empty": "Reason is required",
      "string.min": "Reason must be at least 5 characters",
      "string.max": "Reason cannot exceed 500 characters",
      "any.required": "Reason is required",
    }),
  })
  .required();

export const userIdParamSchema = joi
  .object({
    userId: generalFields.id,
  })
  .required();

export const getAllUsersQuerySchema = joi
  .object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    role: joi.string().valid("Normal", "Admin", "Mentor").optional(),
    search: joi.string().allow(null, "").max(100).optional(),
    isBlocked: joi.string().valid("true", "false").optional(),
    sortBy: joi
      .string()
      .valid("createdAt", "name", "email", "warningCount", "rating")
      .optional(),
    order: joi.string().valid("asc", "desc").optional(),
  })
  .optional();

export const getSessionsQuerySchema = joi
  .object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    mentorId: generalFields.id.optional(),
    userId: generalFields.id.optional(),
    search: joi.string().allow(null, "").optional(),
  })
  .optional();

export const getPaymentsQuerySchema = joi
  .object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    status: joi.string().optional(),
    userId: generalFields.id.optional(),
    method: joi.string().optional(),
    search: joi.string().allow(null, "").optional(),
  })
  .optional();

export const getReportsQuerySchema = joi
  .object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    reportedUserId: generalFields.id.optional(),
  })
  .optional();

export const increaseFreeHoursSchema = joi
  .object({
    userId: generalFields.id.optional(),
    freeHours: joi.number().integer().min(1).required().messages({
      "number.base": "freeHours must be a number",
      "number.integer": "freeHours must be an integer",
      "number.min": "freeHours must be at least 1",
      "any.required": "freeHours is required",
    }),
  })
  .required();

export const createTrackSchema = joi
  .object({
    name: joi.string().min(2).max(100).required().messages({
      "any.required": "Track name is required",
      "string.empty": "Track name cannot be empty",
      "string.min": "Track name must be at least 2 characters",
      "string.max": "Track name cannot exceed 100 characters",
    }),
    description: joi.string().max(500).optional(),
  })
  .required();

export const addChallengeSchema = joi
  .object({
    id: generalFields.id.required(),
    challenge: joi.string().required().messages({
      "any.required": "challenge is required",
    }),
  })
  .required();

export const updateUserScoreSchema = joi
  .object({
    id: generalFields.id.optional(),
    score: joi.number().required().messages({
      "any.required": "score is required",
    }),
  })
  .required();

export const updatePointsSchema = joi
  .object({
    id: generalFields.id.optional(),
    points: joi.number().required().messages({
      "any.required": "points is required",
    }),
  })
  .required();

export const checkChallengeSchema = joi
  .object({
    iduser: generalFields.id.required(),
    challengeName: joi.string().required().messages({
      "any.required": "challengeName is required",
    }),
  })
  .required();

export const updateTrackSchema = joi
  .object({
    trackId: generalFields.id.required(),
    name: joi.string().min(2).max(100).optional(),
    description: joi.string().max(500).optional(),
  })
  .required();

export const deleteTrackSchema = joi
  .object({
    trackId: generalFields.id.required(),
  })
  .required();

export const createSkillSchema = joi
  .object({
    name: joi.string().min(2).max(100).required(),
    trackId: generalFields.id.required(),
  })
  .required();

export const updateSkillSchema = joi
  .object({
    skillId: generalFields.id.required(),
    name: joi.string().min(2).max(100).optional(),
    trackId: generalFields.id.optional(),
  })
  .required();

export const deleteSkillSchema = joi
  .object({
    skillId: generalFields.id.required(),
  })
  .required();
