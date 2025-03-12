import { createShopifyClient } from "../clients/shopifyClient.js";
import {
  createCustomerByEmail,
  setCustomerMetafield,
} from "../services/shopifyService.js";
import { getStoreCredentials } from "../utils/commonUtils.js";
/**
 * Controller to set a customer metafield in Shopify
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with status and data
 */
export const setVatId = async (req, res) => {
  try {
    let { customerId, email, value, shopifyDomain } = req.body;

    // Validate required fields
    if ((!customerId && !email) || !value || !shopifyDomain) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: customerId or email, value, and shopifyDomain are required",
      });
    }

    const { storeAccessToken } = getStoreCredentials(shopifyDomain);

    const client = createShopifyClient({
      shop: shopifyDomain,
      accessToken: storeAccessToken,
    });

    if (!customerId) {
      const customer = await createCustomerByEmail({
        email,
        client,
      });
      customerId = customer.id;
    }

    const customerUpdate = await setCustomerMetafield({
      customerId,
      namespace: "custom",
      key: "vat_id",
      value,
      type: "single_line_text_field",
      client,
    });

    return res.status(200).json({
      success: true,
      message: "Customer metafield set successfully",
      data: customerUpdate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to set customer metafield",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
