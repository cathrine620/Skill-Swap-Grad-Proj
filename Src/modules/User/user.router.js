import { Router } from "express";
import * as userController from "./controller/user.controller.js";
import * as notificationController from "./controller/notification.controller.js";
import * as validators from "./user.validation.js";
import { validation } from "../../middleware/validation.js";
import { auth } from "../../middleware/auth.js";
import {
  fileUplode,
  fileVaildation,
} from "../../../utils/multer.cloudinary.js";

const router = Router();

/**
 * @swagger
 * /user/top-scorers:
 *   get:
 *     summary: Get top 3 users with the highest scores (Leaderboard)
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Top 3 users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       totalScore: { type: number }
 */
router.get("/top-scorers", userController.getTopScorers);

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile management
 */

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Profile retrieved successfully.
 *           Payload includes: `reviews` array containing populated `reviewer` details, `purchasedThemes` (list of owned themes), and `activeTheme` (current selected theme).
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/profile",
  auth(["Normal", "Admin", "Mentor"]),
  userController.getProfile,
);

/**
 * @swagger
 * /user/points:
 *   get:
 *     summary: Get user points and scores
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Optional user ID to get points for. If not provided, gets points for the authenticated user.
 *     responses:
 *       200:
 *         description: Points retrieved successfully.
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/points",
  auth(["Normal", "Admin", "Mentor"]),
  userController.getUserPoints,
);

/**
 * @swagger
 * /user/all-users:
 *   get:
 *     summary: Get all users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Normal, Mentor, Admin]
 *         description: Filter by user role
 *       - in: query
 *         name: track
 *         schema:
 *           type: string
 *         description: Filter by track slug or name
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Minimum rating (0-5)
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *         description: Maximum rating (0-5)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum hourly price (for Mentors)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum hourly price (for Mentors)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name (case-insensitive)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [rate_desc, rate_asc, name_asc, name_desc]
 *         description: Sort criteria
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: >
 *           Users retrieved successfully with pagination details.
 *           Payload includes: `reviews` array for each user containing populated `reviewer` object with details: `name`, `userImage`, and `role`.
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/all-users",
  userController.getAllUsers,
);

/**
 * @swagger
 * /user/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 20
 *                 pattern: "^[a-zA-Z][a-zA-Z0-9]*$"
 *               profile:
 *                 type: object
 *                 properties:
 *                   bio:
 *                     type: string
 *                     maxLength: 500
 *                   skillSummary:
 *                     type: string
 *                     maxLength: 200
 *                   location:
 *                     type: string
 *                     maxLength: 100
 *               skills:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     skillName:
 *                       type: string
 *                     experienceLevel:
 *                       type: string
 *                       enum: [Beginner, Intermediate, Expert]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/profile",
  auth(["Normal", "Admin", "Mentor"]),
  validation(validators.updateProfileSchema),
  fileUplode(fileVaildation.image).single("userImage"),
  userController.updateProfile,
);

/**
 * @swagger
 * /user/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               cPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid old password
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/change-password",
  auth(["Normal", "Admin", "Mentor"]),
  validation(validators.changePasswordSchema),
  userController.changePassword,
);

/**
 * @swagger
 * /user/delete:
 *   delete:
 *     summary: Delete user account
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/delete",
  auth(["Normal", "Admin", "Mentor"]),
  userController.deleteUser,
);

/**
 * @swagger
 * /user/request-mentor:
 *   post:
 *     summary: Request to become a mentor
 *     description: >
 *       Updates the user role to 'Mentor' and sets their fixed hourly price.
 *       Requirements: 100+ help hours, at least one skill added, all skills verified.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hourlyPrice
 *             properties:
 *               hourlyPrice:
 *                 type: number
 *                 description: Fixed price per hour for the mentor's sessions
 *                 example: 50
 *     responses:
 *       200:
 *         description: You're now a mentor
 *       400:
 *         description: Requirements not met (hours, skills, or already mentor)
 *       404:
 *         description: User not found
 */
router.post(
  "/request-mentor",
  auth(["Normal"]),
  validation(validators.requestMentorSchema),
  userController.requestMentor,
);

/**
 * @swagger
 * /user/verify-skill-quiz:
 *   post:
 *     summary: Verify a skill based on quiz score (>= 85)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skillName
 *               - quizScore
 *             properties:
 *               skillName:
 *                 type: string
 *               quizScore:
 *                 type: number
 *     responses:
 *       200:
 *         description: Skill quiz verified.
 */
router.post(
  "/verify-skill-quiz",
  auth(["Normal", "Admin", "Mentor"]),
  validation(validators.verifySkillQuizSchema),
  userController.verifySkillQuiz,
);

/**
 * @swagger
 * /user/fcm-token:
 *   post:
 *     summary: Save or update FCM token for push notifications
 *     description: >
 *       Frontend must call this endpoint after successfully obtaining a Firebase Cloud Messaging (FCM) token from the device.
 *       This token is used by the backend to send targeted Push Notifications (e.g. Session reminders, Chat messages, Booking updates).
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging device token
 *     responses:
 *       200:
 *         description: FCM token saved successfully
 *       400:
 *         description: fcmToken is required
 */
router.post(
  "/fcm-token",
  auth(["Normal", "Admin", "Mentor"]),
  notificationController.saveFcmToken,
);

/**
 * @swagger
 * /user/fcm-token:
 *   delete:
 *     summary: Remove FCM token (call on logout)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FCM token removed successfully
 */
router.delete(
  "/fcm-token",
  auth(["Normal", "Admin", "Mentor"]),
  notificationController.removeFcmToken,
);

/**
 * @swagger
 * /user/fcm-token/test:
 *   post:
 *     summary: Send a test push notification with a custom type (debug only)
 *     description: >
 *       Use this to test how the mobile app handles different event types.
 *       Available types: `chat_message`, `request_accepted`, `request_rejected`, `session_reminder`, `session_started`, `rating_request`, `new_booking`, `booking_cancelled`, `test`.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "chat_message"
 *               payload:
 *                 type: object
 *                 example: {"chat_id": "123", "sender_name": "User 1"}
 *     responses:
 *       200:
 *         description: Test notification sent
 *       400:
 *         description: Invalid type or No FCM token saved
 */
router.post(
  "/fcm-token/test",
  auth(["Normal", "Admin", "Mentor"]),
  notificationController.testPushNotification,
);

router.patch(
  "/select-theme",
  auth(["Normal", "Admin", "Mentor"]),
  validation(validators.selectThemeSchema),
  userController.selectTheme,
);

/**
 * @swagger
 * /user/select-theme:
 *   patch:
 *     summary: Switch the user's active theme
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [themeId]
 *             properties:
 *               themeId:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the theme to activate (already purchased), or null to revert to default.
 *     responses:
 *       200:
 *         description: Theme activated successfully
 *       403:
 *         description: You do not own this theme
 */

export default router;
