import joi from "joi";
import { Types } from "mongoose";

const validateObjectId = (value, helper) => {
  return Types.ObjectId.isValid(value)
    ? true
    : helper.message("Invalid ID format");
};

export const generalFields = {
  email: joi
    .string()
    .email({
      minDomainSegments: 2,
      maxDomainSegments: 4,
      tlds: { allow: ["com", "net"] },
    })
    .required()
    .messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
  password: joi
    .string()
    .pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/))
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "Password is required",
    }),
  confirmPassword: joi.string().valid(joi.ref("password")).required().messages({
    "any.only": "Confirm password must match password",
    "any.required": "Confirm password is required",
  }),
  id: joi.string().custom(validateObjectId).required().messages({
    "any.required": "ID is required",
    "string.base": "Invalid ID format",
  }),
  optionalId: joi.string().custom(validateObjectId).messages({
    "string.base": "Invalid ID format",
  }),
  file: joi
    .object({
      size: joi.number().positive().required(),
      path: joi.string().required(),
      filename: joi.string().required(),
      destination: joi.string().required(),
      mimetype: joi.string().required(),
      encoding: joi.string().required(),
      originalname: joi.string().required(),
      fieldname: joi.string().required(),
    })
    .required()
    .messages({
      "any.required": "File is required",
      "object.base": "Invalid file format",
    }),
  headers: joi.string().required().messages({
    "any.required": "Headers are required",
    "string.base": "Invalid headers format",
  }),
};

export const validation = (schema) => {
  return (req, res, next) => {
    let inputsData = { ...req.body, ...req.params, ...req.query };
    if (req.file) {
      inputsData[req.file.fieldname] = req.file;
    }
    if (req.files) {
      inputsData.files = req.files;
    }
    const validationResult = schema.validate(inputsData, { abortEarly: false });
    if (validationResult.error?.details) {
      const errors = validationResult.error.details.map((error) => ({
        field: error.context.label || error.path.join("."),
        message: error.message,
      }));
      return res.status(400).json({
        message: "Validation error",
        validationErrors: errors,
      });
    }
    return next();
  };
};
