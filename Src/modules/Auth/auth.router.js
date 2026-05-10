import { Router } from "express";
import * as authController from "./controller/auth.controller.js";
import * as validators from "./auth.validation.js";
import { validation } from "../../middleware/validation.js";
import { auth } from "../../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *                 pattern: "^[a-zA-Z][a-zA-Z0-9]*$"
 *                 description: Must start with a letter and contain only letters and numbers
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 pattern: "^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$"
 *                 description: At least 8 chars, 1 uppercase, 1 lowercase, 1 number
 *               confirmPassword:
 *                 type: string
 *                 description: Must match password
 *     responses:
 *       201:
 *         description: User Registered Successfully
 *       409:
 *         description: Email is Already Exist
 *       400:
 *         description: Passwords Don't Match
 *       500:
 *         description: Internal Server Error
 */

router.post(
  "/register",
  validation(validators.registerSchema),
  authController.register,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User Login Successfully
 *       404:
 *         description: Not Register Account
 *       400:
 *         description: Confirm You Email First
 *       401:
 *         description: Invalid Login Data
 *       500:
 *         description: Internal Server Error
 */
router.post("/login", validation(validators.loginSchema), authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User Logout Successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/logout",
  auth(["Normal", "Admin", "Mentor"]),
  authController.logout,
);

/**
 * @swagger
 * /auth/activation/verify:
 *   post:
 *     summary: Verify activation code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *                - email
 *                - activationCode
 *             properties:
 *                email:
 *                  type: string
 *                  format: email
 *                activationCode:
 *                  type: string
 *                  pattern: "^[0-9]{4}$"
 *     responses:
 *       200:
 *         description: Account Activated Successfully
 *       400:
 *         description: Invalid or expired code
 *       404:
 *         description: Not Register Account
 */
router.post(
  "/activation/verify",
  validation(validators.verifyActivationCodeSchema),
  authController.verifyActivationCode,
);

/**
 * @swagger
 * /auth/activation/resend:
 *   post:
 *     summary: Resend activation code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *                - email
 *             properties:
 *                email:
 *                  type: string
 *                  format: email
 *     responses:
 *       200:
 *         description: Activation Code Resent Successfully
 *       404:
 *         description: Not Register Account
 */
router.post(
  "/activation/resend",
  validation(validators.resendActivationCodeSchema),
  authController.resendActivationCode,
);

/**
 * @swagger
 * /auth/password/forgot:
 *   post:
 *     summary: Send forgot password code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification Code Sent Successfully
 *       404:
 *         description: Not Register Account
 *       500:
 *         description: Internal Server Error
 */
router.post(
  "/password/forgot",
  validation(validators.sendForgotPasswordCodeSchema),
  authController.sendForgotPasswordCode,
);

/**
 * @swagger
 * /auth/password/verify-code:
 *   post:
 *     summary: Verify forgot password code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - forgetCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               forgetCode:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 description: 6-digit code
 *     responses:
 *       200:
 *         description: Code Verified Successfully
 *       400:
 *         description: Invalid code or expired
 *       404:
 *         description: Not Register Account
 *       500:
 *         description: Internal Server Error
 */
router.post(
  "/password/verify-code",
  validation(validators.verifyForgotPasswordCodeSchema),
  authController.verifyForgotPasswordCode,
);

/**
 * @swagger
 * /auth/password/reset:
 *   patch:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - forgetCode
 *               - password
 *               - confirmPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               forgetCode:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *               password:
 *                 type: string
 *                 pattern: "^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$"
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password Changed Successfully
 *       400:
 *         description: Invalid code or expired
 *       404:
 *         description: Not Register Account
 *       409:
 *         description: New password cannot be the same as old one
 *       500:
 *         description: Internal Server Error
 */
router.patch(
  "/password/reset",
  validation(validators.resetPasswordSchema),
  authController.resetPassword,
);

/**
 * @swagger
 * /auth/complete-profile:
 *   post:
 *     summary: Complete user profile (skills and track)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - track
 *               - skills
 *             properties:
 *               userId:
 *                 type: string
 *               track:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - skillName
 *                   properties:
 *                     skillName:
 *                       type: string
 *                     experienceLevel:
 *                       type: string
 *                       enum: [Beginner, Intermediate, Expert]
 *     responses:
 *       200:
 *         description: Profile Completed Successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/complete-profile",
  validation(validators.completeProfileSchema),
  authController.completeProfile,
);

/**
 * @swagger
 * /auth/tracks:
 *   get:
 *     summary: Get all tracks (public)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Tracks retrieved successfully
 */
router.get("/tracks", authController.getAllTracks);

export default router;
