import joi from "joi";
import { generalFields } from "../../middleware/validation.js";

export const tokenSchema = joi
  .object({
    token: joi.string().required().messages({
      required: "tokenRequired",
    }),
  })
  .required();

export const registerSchema = joi
  .object({
    name: joi
      .string()
      .min(2)
      .max(20)
      .pattern(new RegExp(/^[a-zA-Z][a-zA-Z0-9]*$/))
      .required()
      .messages({
        required: "nameRequired",
        min: "nameInvalid",
        max: "nameInvalid",
        "string.pattern.base":
          "Name must start with a letter and contain only letters and numbers",
        base: "nameInvalid",
      }),
    email: generalFields.email,
    password: generalFields.password,
    confirmPassword: generalFields.confirmPassword,
  })
  .required();

export const loginSchema = joi
  .object({
    email: generalFields.email,
    password: generalFields.password,
  })
  .required();

export const sendForgotPasswordCodeSchema = joi
  .object({
    email: generalFields.email,
  })
  .required();

export const resetPasswordSchema = joi
  .object({
    forgetCode: joi
      .string()
      .pattern(new RegExp(/^[0-9]{6}$/))
      .required()
      .messages({
        required: "forgetCodeRequired",
        "pattern.base": "forgetCodeInvalid",
        base: "forgetCodeInvalid",
      }),
    email: generalFields.email,
    password: generalFields.password,
    confirmPassword: generalFields.confirmPassword,
  })
  .required();

export const verifyForgotPasswordCodeSchema = joi
  .object({
    forgetCode: joi
      .string()
      .pattern(new RegExp(/^[0-9]{6}$/))
      .required()
      .messages({
        required: "forgetCodeRequired",
        "pattern.base": "forgetCodeInvalid",
        base: "forgetCodeInvalid",
      }),
    email: generalFields.email,
  })
  .required();

export const verifyActivationCodeSchema = joi
  .object({
    activationCode: joi
      .string()
      .pattern(new RegExp(/^[0-9]{4}$/))
      .required()
      .messages({
        required: "activationCodeRequired",
        "pattern.base": "activationCodeInvalid",
        base: "activationCodeInvalid",
      }),
    email: generalFields.email,
  })
  .required();

export const resendActivationCodeSchema = joi
  .object({
    email: generalFields.email,
  })
  .required();

export const completeProfileSchema = joi
  .object({
    userId: generalFields.id.required(),
    track: joi.string().required(),
    skills: joi
      .array()
      .items(
        joi.object({
          skillName: joi.string().required(),
          experienceLevel: joi
            .string()
            .valid("Beginner", "Intermediate", "Expert"),
        }),
      )
      .required(),
  })
  .required();
