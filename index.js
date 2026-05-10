import express from "express";
import bootstarp from "./Src/index.router.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { startCronJobs } from "./utils/cronJobs.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "Client")));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

await bootstarp(app, express);

startCronJobs();

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on Port ${port}`);
  console.log(`Pusher is handling real-time connections`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
