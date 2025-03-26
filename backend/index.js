// backend/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import rateLimit from "express-rate-limit";
import vatRoutes from "./routes/vatRoutes.js";
import "./instrument.js";
import shopifyRoutes from "./routes/shopifyRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

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

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  res.statusCode = 500;
  res.end(`${res.sentry || "Internal Server Error"}\n`);
});

app.listen(PORT);

export default app;
