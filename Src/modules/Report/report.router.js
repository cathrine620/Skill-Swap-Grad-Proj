import { Router } from "express";
import { auth, roles } from "../../middleware/auth.js";
import {
  createReport,
  getAllReports,
  getReport,
  updateReport,
  deleteReport,
} from "./controller/report.controller.js";

const ReportRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report management API
 */

/**
 * @swagger
 * /report:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - reportedUser
 *             properties:
 *               reason:
 *                 type: string
 *               reportedUser:
 *                 type: string
 *                 description: ID of the user being reported
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
ReportRouter.post("/", auth(Object.values(roles)), createReport);

/**
 * @swagger
 * /report:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
ReportRouter.get("/", auth([roles.Admin]), getAllReports);

/**
 * @swagger
 * /report/{id}:
 *   get:
 *     summary: Get a report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
ReportRouter.get("/:id", auth([roles.Admin]), getReport);

/**
 * @swagger
 * /report/{id}:
 *   patch:
 *     summary: Update a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
ReportRouter.patch("/:id", auth([roles.Admin]), updateReport);

/**
 * @swagger
 * /report/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       404:
 *         description: Report not found
 *       401:
 *         description: Unauthorized
 */
ReportRouter.delete("/:id", auth([roles.Admin]), deleteReport);

export default ReportRouter;
