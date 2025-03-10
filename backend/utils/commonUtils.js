export const getStoreCredentials = (shop) => {
  if (!shop) {
    throw new Error("Shop parameter is required to get store credentials");
  }

  // Extract store handle from domain
  const domainParts = shop.split(".");
  const storeHandleRaw = domainParts[0];

  // Format store handle for environment variable names
  const storeHandleFormatted = storeHandleRaw.toUpperCase().replace(/-/g, "_");

  // Construct environment variable names
  const accessTokenVarName = `${storeHandleFormatted}_ACCESS_TOKEN`;
  const storeHandleVarName = `${storeHandleFormatted}_STORE_HANDLE`;

  // Get values from environment variables
  const storeAccessToken = process.env[accessTokenVarName];
  const storeHandle = process.env[storeHandleVarName];

  if (!storeAccessToken || !storeHandle) {
    throw new Error(`Credentials not found for shop: ${shop}`);
  }

  return { storeHandle, storeAccessToken };
};
