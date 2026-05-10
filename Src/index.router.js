import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "../utils/swagger.js";
import { globalErrorHandling } from "../utils/errorHandling.js";
import connectionDB from "../DB/config/connection.js";
import AuthRouter from "./modules/Auth/auth.router.js";
import UserRouter from "./modules/User/user.router.js";
import AdminRouter from "./modules/Admin/admin.router.js";
import ReportRouter from "./modules/Report/report.router.js";
import BookingRouter from "./modules/Booking/booking.router.js";
import ChatRouter from "./modules/Chat/chat.router.js";
import StoreRouter from "./modules/Store/store.router.js";
import { stripeWebhook } from "./modules/Booking/controller/payment.controller.js";

const bootstarp = async (app, express) => {
  app.post(
    "/booking/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook,
  );

  app.use(express.json());
  app.use(cors());
  app.use("/auth", AuthRouter);
  app.use("/user", UserRouter);
  app.use("/admin", AdminRouter);
  app.use("/report", ReportRouter);
  app.use("/booking", BookingRouter);
  app.use("/chat", ChatRouter);
  app.use("/store", StoreRouter);
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCssUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css",
      customJs: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.min.js",
      ],
    }),
  );
  app.all(/(.*)/, (req, res) => {
    res.status(404).json({ message: "Page not found" });
  });
  app.use(globalErrorHandling);
  await connectionDB();
};

export default bootstarp;
