import joi from "joi";

export const generalFields = {
  id: joi.string().hex().length(24).required().messages({
    "string.hex": "Invalid ID format",
    "string.length": "ID must be 24 characters",
    "any.required": "ID is required",
  }),

  optionalId: joi.string().hex().length(24).optional().messages({
    "string.hex": "Invalid ID format",
    "string.length": "ID must be 24 characters",
  }),

  email: joi
    .string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email",
      "any.required": "Email is required",
    }),

  password: joi
    .string()
    .min(8)
    .max(50)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 50 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "Password is required",
    }),

  name: joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),

  optionalName: joi.string().min(2).max(50).optional().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name cannot exceed 50 characters",
  }),

  phone: joi
    .string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be 10-15 digits",
    }),

  date: joi.date().iso().messages({
    "date.format": "Date must be in ISO format",
  }),

  url: joi.string().uri().messages({
    "string.uri": "Please provide a valid URL",
  }),

  boolean: joi.boolean().messages({
    "boolean.base": "Value must be true or false",
  }),

  number: joi.number().messages({
    "number.base": "Value must be a number",
  }),

  positiveNumber: joi.number().positive().messages({
    "number.base": "Value must be a number",
    "number.positive": "Value must be positive",
  }),

  integer: joi.number().integer().messages({
    "number.base": "Value must be a number",
    "number.integer": "Value must be an integer",
  }),

  text: joi.string().min(1).max(1000).messages({
    "string.min": "Text cannot be empty",
    "string.max": "Text cannot exceed 1000 characters",
  }),

  shortText: joi.string().min(1).max(255).messages({
    "string.min": "Text cannot be empty",
    "string.max": "Text cannot exceed 255 characters",
  }),
};
