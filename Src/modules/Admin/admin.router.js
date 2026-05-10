import { Router } from "express";
import * as adminController from "./controller/admin.controller.js";
import * as validators from "./admin.validation.js";
import { validation } from "../../middleware/validation.js";
import { auth, roles } from "../../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get(
  "/dashboard/stats",
  auth([roles.Admin]),
  adminController.getDashboardStats,
);

/**
 * @swagger
 * /admin/dashboard/revenue-overview:
 *   get:
 *     summary: Get revenue overview for last 4 weeks
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue overview retrieved successfully
 */
router.get(
  "/dashboard/revenue-overview",
  auth([roles.Admin]),
  adminController.getRevenueOverview,
);

/**
 * @swagger
 * /admin/dashboard/user-distribution:
 *   get:
 *     summary: Get user distribution (Mentors vs Normal Users)
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User distribution retrieved successfully
 */
router.get(
  "/dashboard/user-distribution",
  auth([roles.Admin]),
  adminController.getUserDistribution,
);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with pagination and filters
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Normal, Admin, Mentor]
 *         description: Filter by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: isBlocked
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by block status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get(
  "/users",
  auth([roles.Admin]),
  validation(validators.getAllUsersQuerySchema),
  adminController.getAllUsers,
);

/**
 * @swagger
 * /admin/users/{userId}/block:
 *   patch:
 *     summary: Block user for specific number of days
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *               reason:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: User blocked successfully
 */
router.patch(
  "/users/:userId/block",
  auth([roles.Admin]),
  validation(validators.blockUserSchema),
  adminController.blockUser,
);

/**
 * @swagger
 * /admin/users/{userId}/unblock:
 *   patch:
 *     summary: Unblock user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User unblocked successfully
 */
router.patch(
  "/users/:userId/unblock",
  auth([roles.Admin]),
  validation(validators.userIdParamSchema),
  adminController.unblockUser,
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete(
  "/users/:userId",
  auth([roles.Admin]),
  validation(validators.userIdParamSchema),
  adminController.deleteUser,
);

/**
 * @swagger
 * /admin/users/{userId}/warn:
 *   post:
 *     summary: Issue warning to user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Warning issued successfully
 */
router.post(
  "/users/:userId/warn",
  auth([roles.Admin]),
  validation(validators.warnUserSchema),
  adminController.warnUser,
);

/**
 * @swagger
 * /admin/users/{userId}/warnings:
 *   get:
 *     summary: Get user warnings
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User warnings retrieved successfully
 */
router.get(
  "/users/:userId/warnings",
  auth([roles.Admin]),
  validation(validators.userIdParamSchema),
  adminController.getUserWarnings,
);

/**
 * @swagger
 * /admin/sessions:
 *   get:
 *     summary: Get all sessions (Placeholder)
 *     tags: [Admin Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions endpoint placeholder
 */
router.get(
  "/sessions",
  auth([roles.Admin]),
  validation(validators.getSessionsQuerySchema),
  adminController.getAllSessions,
);

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments (Placeholder)
 *     tags: [Admin Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments endpoint placeholder
 */
router.get(
  "/payments",
  auth([roles.Admin]),
  validation(validators.getPaymentsQuerySchema),
  adminController.getAllPayments,
);

/**
 * @swagger
 * /admin/reports:
 *   get:
 *     summary: Get all reports (Placeholder)
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports endpoint placeholder
 */
router.get(
  "/reports",
  auth([roles.Admin]),
  validation(validators.getReportsQuerySchema),
  adminController.getAllReports,
);

/**
 * @swagger
 * /admin/users/increaseFreeHours:
 *   post:
 *     summary: Increase user free hours
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - freeHours
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (optional)
 *               freeHours:
 *                 type: integer
 *                 description: Number of free hours to add
 *     responses:
 *       200:
 *         description: Free hours increased successfully
 */
router.post(
  "/users/increaseFreeHours",
  auth(Object.values(roles)),
  validation(validators.increaseFreeHoursSchema),
  adminController.increaseFreeHours,
);

/**
 * @swagger
 * /admin/users/addChallenge:
 *   post:
 *     summary: Add a challenge to user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challenge
 *             properties:
 *               id:
 *                 type: string
 *               challenge:
 *                 type: string
 *     responses:
 *       200:
 *         description: Challenge added successfully
 */
router.post(
  "/users/addChallenge",
  validation(validators.addChallengeSchema),
  adminController.addChallenge,
);

/**
 * @swagger
 * /admin/users/updateScore:
 *   post:
 *     summary: Update user total score
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               id:
 *                 type: string
 *               score:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Score updated successfully
 */
router.post(
  "/users/updateScore",
  validation(validators.updateUserScoreSchema),
  adminController.updateScore,
);

/**
 * @swagger
 * /admin/users/checkChallenge:
 *   post:
 *     summary: Check if a challenge exists for user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iduser
 *               - challengeName
 *             properties:
 *               iduser:
 *                 type: string
 *               challengeName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Result of the check
 */
router.post(
  "/users/checkChallenge",
  validation(validators.checkChallengeSchema),
  adminController.checkChallenge,
);

/**
 * @swagger
 * /admin/users/updatePoints:
 *   post:
 *     summary: Update user points
 *     tags: [Admin Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               id:
 *                 type: string
 *               points:
 *                 type: number
 *     responses:
 *       200:
 *         description: Points updated successfully
 */
router.post(
  "/users/updatePoints",
  validation(validators.updatePointsSchema),
  adminController.updatePoints,
);

/**
 * @swagger
 * /admin/tracks:
 *   post:
 *     summary: Create a new track
 *     tags: [Admin Tracks]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Track created successfully
 */
router.post(
  "/tracks",
  auth([roles.Admin]),
  validation(validators.createTrackSchema),
  adminController.createTrack,
);

/**
 * @swagger
 * /admin/tracks/{trackId}:
 *   patch:
 *     summary: Update an existing track
 *     tags: [Admin Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Track updated successfully
 */
router.patch(
  "/tracks/:trackId",
  auth([roles.Admin]),
  validation(validators.updateTrackSchema),
  adminController.updateTrack,
);

/**
 * @swagger
 * /admin/tracks/{trackId}:
 *   delete:
 *     summary: Delete a track
 *     tags: [Admin Tracks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Track deleted successfully
 */
router.delete(
  "/tracks/:trackId",
  auth([roles.Admin]),
  validation(validators.deleteTrackSchema),
  adminController.deleteTrack,
);

/**
 * @swagger
 * /admin/tracks:
 *   get:
 *     summary: Get all tracks
 *     tags: [Admin Tracks]
 *     responses:
 *       200:
 *         description: Tracks retrieved successfully
 */
router.get("/tracks", adminController.getTracks);

/**
 * @swagger
 * /admin/skills:
 *   post:
 *     summary: Add a skill to a track
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - trackId
 *             properties:
 *               name:
 *                 type: string
 *               trackId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Skill added successfully
 */
router.post(
  "/skills",
  validation(validators.createSkillSchema),
  adminController.addSkill,
);

/**
 * @swagger
 * /admin/skills/{skillId}:
 *   patch:
 *     summary: Update a skill
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill updated successfully
 */
router.patch(
  "/skills/:skillId",
  validation(validators.updateSkillSchema),
  adminController.updateSkill,
);

/**
 * @swagger
 * /admin/skills/{skillId}:
 *   delete:
 *     summary: Delete a skill
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skill deleted successfully
 */
router.delete(
  "/skills/:skillId",
  validation(validators.deleteSkillSchema),
  adminController.deleteSkill,
);

/**
 * @swagger
 * /admin/skills:
 *   get:
 *     summary: Get all skills
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: trackId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Skills retrieved successfully
 */
router.get("/skills", adminController.getAllSkills);

/**
 * @swagger
 * /admin/users/{userId}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
router.patch(
  "/users/:userId/role",
  auth([roles.Admin]),
  adminController.updateUserRole,
);

export default router;
