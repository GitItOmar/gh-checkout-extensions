import { createShopifyClient } from "../clients/shopifyClient.js";
import {
  createCustomerByEmail,
  updateCustomerTaxExemption,
} from "../services/shopifyService.js";
import { getStoreCredentials } from "../utils/commonUtils.js";

/**
 * Exempts a customer from taxes in Shopify
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response
 */
export const exemptCustomerFromTaxes = async (req, res) => {
  try {
    const { customerId, email, shopifyDomain, exempt = true } = req.body;

    // Validate required fields
    if ((!customerId && !email) || !shopifyDomain) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: customerId or email, and shopifyDomain are required",
      });
    }

    const { storeAccessToken } = getStoreCredentials(shopifyDomain);

    const client = createShopifyClient({
      shop: shopifyDomain,
      accessToken: storeAccessToken,
    });

    let customerIdToUse = customerId;

    // If no customerId is provided, create or get customer by email
    if (!customerIdToUse && email) {
      const customer = await createCustomerByEmail({
        email,
        client,
      });
      customerIdToUse = customer.id;
    }

    // Update customer tax exemption status
    const updatedCustomer = await updateCustomerTaxExemption({
      customerId: customerIdToUse,
      taxExemption: exempt ? "EXEMPT" : "NOT_EXEMPT",
      client,
    });

    return res.status(200).json({
      success: true,
      message: `Customer tax exemption ${
        exempt ? "enabled" : "disabled"
      } successfully`,
      data: updatedCustomer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update customer tax exemption status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
