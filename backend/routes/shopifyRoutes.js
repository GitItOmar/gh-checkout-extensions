// routes/shopifyRoutes.js
import express from "express";
import { setVatId, exemptCustomerFromTaxes } from "../controllers/shopifyController.js";

const router = express.Router();

router.post("/set-vat-id", setVatId);
router.post("/exempt-customer-from-taxes", exemptCustomerFromTaxes);

export default router;
