// controllers/vatController.js
import { validateVat } from "../services/vatService.js";

export const validateVatController = async (req, res) => {
  try {
    const { vatId, service } = req.body;

    if (!vatId) {
      return res.status(400).json({
        success: false,
        message: "VAT ID is required",
      });
    }

    const result = await validateVat(vatId, service);
    return res.status(result.status).json(result.response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate VAT ID",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
