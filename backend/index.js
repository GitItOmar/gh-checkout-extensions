// backend/index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";
import * as Sentry from "@sentry/node";
import vatRoutes from "./routes/vatRoutes.js";
import "./instrument.js";
import shopifyRoutes from "./routes/shopifyRoutes.js";
import rateLimit from "express-rate-limit";

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

app.set("trust proxy", 1); 

// Define rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many requests, please try again later.",
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

app.use("/api", vatRoutes);
app.use("/api", shopifyRoutes);

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
