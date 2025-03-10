// backend/index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";
import * as Sentry from "@sentry/node";
import vatRoutes from "./routes/vatRoutes.js";
import validateRequest from "./middleware/validateRequest.js";
import "./instrument.js";
import shopifyRoutes from "./routes/shopifyRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.VATCHECKAPI_KEY) {
  console.error("ERROR: VATCHECKAPI_KEY environment variable is not set");
  if (isProduction) {
    Sentry.captureMessage(
      "VATCHECKAPI_KEY environment variable is not set",
      "fatal"
    );
  }
  process.exit(1);
}

if (isProduction) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", validateRequest, vatRoutes);
app.use("/api", validateRequest, shopifyRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
  });
});

if (isProduction) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, _next) => {
  res.statusCode = 500;
  res.end(`${res.sentry || "Internal Server Error"}\n`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
