import { createAdminApiClient } from "@shopify/admin-api-client";
import "dotenv/config";

/**
 * Creates a Shopify Admin API client based on the request context
 * @param {Object} options - Optional configuration
 * @param {string} options.shop - Shop domain (if different from default)
 * @param {string} options.accessToken - Access token for the shop (if different from default)
 * @returns {Object} Shopify Admin API client
 */
const createShopifyClient = (options = {}) => {
  const shopDomain = options.shop;
  const accessToken = options.accessToken;

  return createAdminApiClient({
    storeDomain: shopDomain,
    apiVersion: "2025-01",
    accessToken: accessToken,
  });
};

export { createShopifyClient };
