// routes/shopifyRoutes.js
import express from "express";
import { setCustomerMetafieldController } from "../controllers/shopifyController.js";

const router = express.Router();

router.post("/set-metafield", setCustomerMetafieldController);

export default router;
