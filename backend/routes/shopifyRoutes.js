// routes/shopifyRoutes.js
import express from "express";
import { setVatId } from "../controllers/shopifyController.js";

const router = express.Router();

router.post("/set-vat-id", setVatId);

export default router;
