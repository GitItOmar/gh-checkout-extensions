import * as Sentry from "@sentry/node";

const isProduction = process.env.NODE_ENV === "production";
const VAT_ID_PATTERN = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;

const createErrorResponse = (status, message) => {
  return {
    status,
    response: {
      success: false,
      message,
    },
  };
};

const validateVatFormat = (vatId) => {
  if (!VAT_ID_PATTERN.test(vatId)) {
    return createErrorResponse(
      400,
      "Invalid VAT ID format. VAT ID should start with a 2-letter country code followed by numbers."
    );
  }
  return null;
};

const validateWithVatlayer = async (vatId) => {
  const apiKey = process.env.VATLAYER_API_KEY;
  const apiUrl = `https://apilayer.net/api/validate?access_key=${apiKey}&vat_number=${vatId}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Handle database failure response from Vatlayer
    if (data.database === 'failure') {
      if (isProduction) {
        Sentry.captureMessage(
          `VAT API database failure for ID: ${vatId}`,
          "error"
        );
      }
      return createErrorResponse(503, "VAT validation service database unavailable");
    }

    if (!data.valid) {
      if (isProduction) {
        Sentry.captureMessage(
          `VAT API error: ${data.error?.info || "Unknown error"}`,
          "error"
        );
      }
      return createErrorResponse(400, "Invalid VAT ID");
    }

    return {
      status: 200,
      response: {
        success: true,
        data,
        message: undefined,
      },
    };
  } catch (error) {
    throw error; // Re-throw to be handled by the calling function
  }
};

export const validateVat = async (vatId, service) => {
  // Expected response 1: Invalid VAT format
  const formatError = validateVatFormat(vatId);
  if (formatError) {
    return formatError;
  }

  try {
    // Expected responses:
    // 1. Valid VAT
    // 2. Invalid VAT
    // 3. Database failure from Vatlayer
    const result = await validateWithVatlayer(vatId);
    return result;
  } catch (error) {
    // Unexpected error handling
    if (isProduction) {
      Sentry.captureException(error);
    }
    return createErrorResponse(500, "Failed to validate VAT ID");
  }
};
