import Pusher from "pusher";
import dotenv from "dotenv";
dotenv.config();

// Server-side Pusher instance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * Trigger an event on a Pusher channel
 * @param {string} channel - Channel name (e.g. "private_userId1_userId2")
 * @param {string} event   - Event name (e.g. "receive_message")
 * @param {object} data    - Payload
 */
export const triggerPusher = async (channel, event, data) => {
  try {
    await pusher.trigger(channel, event, data);
    console.log(`Pusher triggered - channel: ${channel}, event: ${event}`);
  } catch (err) {
    console.error(`Pusher trigger error:`, err.message);
  }
};

export default pusher;
