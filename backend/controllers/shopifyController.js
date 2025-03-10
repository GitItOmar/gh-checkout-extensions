import { createShopifyClient } from "../clients/shopifyClient.js";
import { setCustomerMetafield } from "../services/shopifyService.js";
import { getStoreCredentials } from "../utils/commonUtils.js";
/**
 * Controller to set a customer metafield in Shopify
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with status and data
 */
export const setCustomerMetafieldController = async (req, res) => {
  try {
    const { customerId, namespace, key, value, type } = req.body;
    const domain = req.headers.origin || req.headers.host;

    // Validate required fields
    if (!customerId || !namespace || !key || !value || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerId, namespace, key, value, and type are required",
      });
    }

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Could not determine domain from request",
      });
    }

    const { storeHandle, storeAccessToken } = getStoreCredentials(domain);

    // Create Shopify client
    const client = createShopifyClient({
      shop: storeHandle,
      accessToken: storeAccessToken,
    });

    // Set customer metafield
    const customer = await setCustomerMetafield({
      customerId,
      namespace,
      key,
      value,
      type,
      client,
    });

    return res.status(200).json({
      success: true,
      message: "Customer metafield set successfully",
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to set customer metafield",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
