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
  
  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!data.valid) {
    if (isProduction) {
      Sentry.captureMessage(
        `VAT API error: ${data.error?.info || "Unknown error"}`,
        "error"
      );
    }
    return createErrorResponse(500, "Failed to validate VAT ID");
  }

  return {
    status: 200,
    response: {
      success: true,
      data,
      message: undefined,
    },
  };
};

export const validateVat = async (vatId, service) => {
  // Validate format first
  const formatError = validateVatFormat(vatId);
  if (formatError) {
    return formatError;
  }

  try {
    const result = await validateWithVatlayer(vatId);
    return result;
  } catch (error) {
    if (isProduction) {
      Sentry.captureException(error);
    }
    return createErrorResponse(500, "Failed to validate VAT ID");
  }
};
