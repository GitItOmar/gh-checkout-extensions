// routes/vatRoutes.js
import express from "express";
import { validateVatController } from "../controllers/vatController.js";

const router = express.Router();

router.post("/validate-vat", (req, res, next) => {
  validateVatController(req, res, next);
});

export default router;