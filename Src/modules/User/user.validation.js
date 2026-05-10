import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const updateProfileSchema = joi
  .object({
    userImage: generalFields.file.optional(),
    name: joi
      .string()
      .min(2)
      .max(20)
      .pattern(new RegExp(/^[a-zA-Z][a-zA-Z0-9]*$/))
      .messages({
        "string.pattern.base":
          "Name must start with a letter and contain only letters and numbers",
      }),
    profile: joi.object({
      bio: joi.string().max(500),
      skillSummary: joi.string().max(200),
      location: joi.string().max(100),
    }),
    skills: joi.array().items(
      joi.object({
        skillName: joi.string().required(),
        experienceLevel: joi
          .string()
          .valid("Beginner", "Intermediate", "Expert"),
        isVerified: joi.boolean().default(false),
        badgeLevel: joi.number().default(0),
        quizScore: joi.number().default(0),
        addedAt: joi.date().default(Date.now()),
      }),
    ),
  })
  .required();

export const changePasswordSchema = joi
  .object({
    oldPassword: generalFields.password.required(),
    newPassword: generalFields.password.required(),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required(),
  })
  .required();

export const verifySkillQuizSchema = joi
  .object({
    skillName: joi.string().required(),
    quizScore: joi.number().min(0).max(100).required(),
  })
  .required();
export const requestMentorSchema = joi
  .object({
    hourlyPrice: joi.number().min(0).required().messages({
      "number.min": "Hourly price cannot be negative",
      "any.required": "Hourly price is required when requesting to be a mentor",
    }),
  })
  .required();

export const selectThemeSchema = joi
  .alternatives()
  .try(
    joi.object({
      themeId: joi.alternatives().try(generalFields.id, joi.allow(null, "")).required(),
    }),
    joi.alternatives().try(generalFields.id, joi.allow(null, ""))
  )
  .required();
