// routes/shopifyRoutes.js
import express from "express";
import { exemptCustomerFromTaxes } from "../controllers/shopifyController.js";

const router = express.Router();

router.post("/exempt-customer-from-taxes", exemptCustomerFromTaxes);

export default router;
