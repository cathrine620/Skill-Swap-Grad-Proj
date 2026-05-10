import { Router } from "express";
import * as storeController from "./controller/store.controller.js";
import * as validators from "./store.validation.js";
import { validation } from "../../middleware/validation.js";
import { auth, roles } from "../../middleware/auth.js";
import { fileUplode, fileVaildation } from "../../../utils/multer.cloudinary.js";

const StoreRouter = Router();

/**
 * @swagger
 * /store:
 *   get:
 *     summary: Get all available store items
 *     description: >
 *       Returns list of store items. For non-admin users, items of type 'voucher' or 'hours' will include an `isLocked` field
 *       if the user has already purchased that type within the last 7 days (weekly limit).
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of store items
 */
StoreRouter.get(
  "/",
  auth(Object.values(roles)),
  storeController.getStoreItems
);

/**
 * @swagger
 * /store/purchases:
 *   get:
 *     summary: Get current user purchase history
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user purchases
 */
StoreRouter.get(
  "/purchases",
  auth(Object.values(roles)),
  storeController.getUserPurchases
);

/**
 * @swagger
 * /store/purchase:
 *   post:
 *     summary: Purchase an item using points
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId]
 *             properties:
 *               itemId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item purchased successfully
 */
StoreRouter.post(
  "/purchase",
  auth(Object.values(roles)),
  validation(validators.purchaseItemSchema),
  storeController.purchaseItem
);

/**
 * @swagger
 * /store/add:
 *   post:
 *     summary: Add a new item to the store (Admin)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, type, priceInPoints, value]
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [voucher, hours, theme]
 *               priceInPoints:
 *                 type: number
 *               value:
 *                 type: string
 *                 description: Hours amount, discount value, or theme name
 *               validityDays:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               img:
 *                 type: string
 *                 format: binary
 *                 description: Store item image
 *     responses:
 *       201:
 *         description: Item added successfully
 */
StoreRouter.post(
  "/add",
  auth([roles.Admin]),
  fileUplode(fileVaildation.image).single("img"),
  validation(validators.addStoreItemSchema),
  storeController.addStoreItem
);

/**
 * @swagger
 * /store/{itemId}:
 *   patch:
 *     summary: Update an item in the store (Admin)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *               priceInPoints:
 *                 type: number
 *               value:
 *                 type: string
 *               validityDays:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               img:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
StoreRouter.patch(
  "/:itemId",
  auth([roles.Admin]),
  fileUplode(fileVaildation.image).single("img"),
  validation(validators.updateStoreItemSchema),
  storeController.updateStoreItem
);

/**
 * @swagger
 * /store/{itemId}:
 *   delete:
 *     summary: Delete an item from the store (Admin)
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 */
StoreRouter.delete(
  "/:itemId",
  auth([roles.Admin]),
  validation(validators.deleteStoreItemSchema),
  storeController.deleteStoreItem
);

export default StoreRouter;
