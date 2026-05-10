import { Router } from "express";
import * as chatController from "./chat.controller.js";
import { auth, roles } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import * as validators from "./chat.validation.js";

const router = Router();

/**
 * @swagger
 * /chat/track:
 *   post:
 *     summary: Create a new track (Admin only)
 *     description: >
 *       **Pusher Real-Time Chat Integration Guide for Frontend:**
 *
 *       1. Install Pusher SDK: `npm install pusher-js`
 *       2. Initialize Pusher in your frontend:
 *          ```javascript
 *          const pusher = new Pusher("YOUR_PUSHER_KEY", {
 *            cluster: "YOUR_PUSHER_CLUSTER"
 *          });
 *          ```
 *       3. To listen for messages in a chat, subscribe to the channel using the `chatId` (from the `/chat/my-chats` API):
 *          ```javascript
 *          const channel = pusher.subscribe(chatId);
 *          ```
 *       4. Bind to the `receive_message` event to get new messages instantly:
 *          ```javascript
 *          channel.bind("receive_message", (data) => {
 *            console.log("New Message:", data.message);
 *            // data format: { chatId, senderId, message, messageType, timestamp, replyTo, senderData: { name, userImage, role } }
 *          });
 *          ```
 *       5. Bind to `messages_read` to know when someone read your messages (Shows 'Seen'):
 *          ```javascript
 *          channel.bind("messages_read", (data) => {
 *            console.log("Messages read by:", data.readByUserName);
 *            // data format: { chatId, readByUserId, readByUserName, timestamp }
 *          });
 *          ```
 *     tags: [Chat]
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
  "/track",
  auth([roles.Admin]),
  validation(validators.createTrack),
  chatController.createTrack,
);

/**
 * @swagger
 * /chat/tracks:
 *   get:
 *     summary: Get all available tracks
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tracks
 */
router.get("/tracks", auth(Object.values(roles)), chatController.getAllTracks);

/**
 * @swagger
 * /chat/track/{trackId}/join:
 *   post:
 *     summary: Join a track
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackId
 *         schema:
 *           type: string
 *         required: true
 *         description: Track ID
 *     responses:
 *       200:
 *         description: Joined track successfully
 */
router.post(
  "/track/:trackId/join",
  auth(Object.values(roles)),
  validation(validators.joinTrack),
  chatController.joinTrack,
);

/**
 * @swagger
 * /chat/my-chats:
 *   get:
 *     summary: Get my chats (private and groups)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user chats
 */
router.get("/my-chats", auth(Object.values(roles)), chatController.getMyChats);

/**
 * @swagger
 * /chat/private:
 *   post:
 *     summary: Create or get existing private chat with a user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *             properties:
 *               partnerId:
 *                 type: string
 *                 description: ID of the user to chat with
 *     responses:
 *       200:
 *         description: Chat object
 */
router.post(
  "/private",
  auth(Object.values(roles)),
  validation(validators.createPrivateChat),
  chatController.createPrivateChat,
);

/**
 * @swagger
 * /chat/{chatId}/message:
 *   post:
 *     summary: Send a message to a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               replyTo:
 *                 type: string
 *                 description: ID of a message being replied to (Optional)
 *     responses:
 *       201:
 *         description: Message sent successfully. The payload includes `replyTo` (with sender details if applicable) and `senderId` (populated with name, userImage, role).
 */
router.post(
  "/:chatId/message",
  auth(Object.values(roles)),
  chatController.sendMessage,
);

/**
 * @swagger
 * /chat/{chatId}/messages:
 *   get:
 *     summary: Get messages history for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: >
 *           List of messages returned. Each message object contains:
 *           - `senderId` (object with: name, userImage, role)
 *           - `readBy` (array of userIds who saw the message)
 *           - `replyTo` (object containing the replied message content, type, createdAt, and its `senderId` populated with name, userImage, role)
 *           - `userId` (ID of current user, useful for frontend to check if `msg.senderId._id == userId` to determine if it's 'my' message).
 */
router.get(
  "/:chatId/messages",
  auth(Object.values(roles)),
  chatController.getMessages,
);

/**
 * @swagger
 * /chat/{chatId}/search:
 *   get:
 *     summary: Search for messages in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: List of messages matching the query
 */
router.get(
  "/:chatId/search",
  auth(Object.values(roles)),
  validation(validators.searchMessages),
  chatController.searchMessages,
);

/**
 * @swagger
 * /chat/{chatId}/messages/read:
 *   patch:
 *     summary: Mark all unread messages in a chat as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: >
 *           Messages marked as read successfully.
 *           *Note for Frontend:* Once this is called, a Pusher event `messages_read` is emitted to all users in the chat to update their "Seen" UI without refreshing.
 *       404:
 *         description: Chat not found
 */
router.patch(
  "/:chatId/messages/read",
  auth(Object.values(roles)),
  chatController.markMessagesAsRead,
);

/**
 * @swagger
 * /chat/{chatId}/message/{messageId}:
 *   patch:
 *     summary: Edit a message in a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 */
router.patch(
  "/:chatId/message/:messageId",
  auth(Object.values(roles)),
  validation(validators.editMessage),
  chatController.editMessage,
);

/**
 * @swagger
 * /chat/{chatId}/message/{messageId}:
 *   delete:
 *     summary: Delete a message from a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete(
  "/:chatId/message/:messageId",
  auth(Object.values(roles)),
  validation(validators.deleteMessage),
  chatController.deleteMessage,
);

/**
 * @swagger
 * /chat/{chatId}/leave:
 *   delete:
 *     summary: Leave a group or track chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successfully left the group chat
 */
router.delete(
  "/:chatId/leave",
  auth(Object.values(roles)),
  validation(validators.leaveGroupChat),
  chatController.leaveGroupChat,
);

export default router;