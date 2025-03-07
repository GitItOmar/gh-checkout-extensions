// services/vatService.js
import fetch from "node-fetch";
import * as Sentry from "@sentry/node";

const isProduction = process.env.NODE_ENV === "production";

export const validateVat = async (vatId) => {
  const vatIdPattern = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;
  if (!vatIdPattern.test(vatId)) {
    return {
      status: 400,
      response: {
        success: false,
        message:
          "Invalid VAT ID format. VAT ID should start with a 2-letter country code followed by numbers.",
      },
    };
  }

  const apiKey = process.env.VATCHECKAPI_KEY;
  const apiUrl = `https://api.vatcheckapi.com/v2/check?vat_number=${encodeURIComponent(
    vatId
  )}`;

  const response = await fetch(apiUrl, {
    headers: {
      apikey: apiKey,
    },
  });

  if (response.status === 429) {
    if (isProduction) {
      Sentry.captureMessage(
        "Rate limit exceeded from VAT validation API",
        "warning"
      );
    }
    return {
      status: 429,
      response: {
        success: false,
        message: "Rate limit exceeded. Please try again later.",
      },
    };
  }

  if (response.status === 401 || response.status === 403) {
    if (isProduction) {
      Sentry.captureMessage("Invalid or unauthorized VAT API key", "error");
    }
    return {
      status: 500,
      response: {
        success: false,
        message: "Server configuration error",
      },
    };
  }

  const data = await response.json();
  const isValid = data.checksum_valid === true;

  return {
    status: 200,
    response: {
      success: isValid,
      data,
      message: isValid ? undefined : "Invalid VAT ID",
    },
  };
};
