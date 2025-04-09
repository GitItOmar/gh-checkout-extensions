import {
  reactExtension,
  BlockStack,
  ChoiceList,
  Choice,
  useAttributeValues,
  useApplyAttributeChange,
  Text,
  InlineStack,
  useTranslate,
  TextField,
  useApplyShippingAddressChange,
  Spinner,
  useCustomer,
  useEmail,
  useShop,
  useBuyerJourneyIntercept,
  useApplyMetafieldsChange,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect, useRef } from "react";
import useApiClient from "../hooks/useApiClient";

const customerTypeExtension = reactExtension(
  "purchase.checkout.block.render",
  () => <CustomerTypeExtension />
);

export default customerTypeExtension;

function CustomerTypeExtension() {
  // Hooks
  const [customerType] = useAttributeValues(["customer_type"]);
  const applyAttributeChange = useApplyAttributeChange();
  const applyShippingAddressChange = useApplyShippingAddressChange();
  const applyMetafieldsChange = useApplyMetafieldsChange();
  const translate = useTranslate();
  const apiClient = useApiClient();
  const customer = useCustomer();
  const email = useEmail();
  const shop = useShop();

  // State
  const [vatId, setVatId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState(null);
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [validatedVatIds, setValidatedVatIds] = useState(new Set());
  const [isVatValidated, setIsVatValidated] = useState(false);

  // Ref to track if VAT ID has been processed already
  const vatProcessedRef = useRef(false);

  // Helper functions
  const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailPattern.test(email);
  };

  const isValidVatIdFormat = (vatId) => {
    const vatIdPattern = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;
    return vatIdPattern.test(vatId);
  };

  const isGermanVatId = (vatId) => {
    return vatId && vatId.startsWith("DE");
  };

  const isGermanStore = () => {
    return shop.myshopifyDomain.includes("germany");
  };

  const updateVatMetafield = async (value) => {
    if (!value) {
      value = "N/A"; // Use a placeholder value instead of empty string
    }

    const result = await applyMetafieldsChange({
      type: "updateMetafield",
      namespace: "checkoutblocks",
      key: "umsatzsteuer_identifikationsnu",
      valueType: "string",
      value,
    });

    return result;
  };

  const updateTaxExemption = async (exempt = true) => {
    // Don't exempt German customers in the German store
    if (exempt && isGermanStore() && isGermanVatId(vatId)) {
      return { success: true, message: "German VAT ID in German store - no exemption applied" };
    }
    
    return apiClient("/api/exempt-customer-from-taxes", "POST", {
      customerId: customer?.id ?? null,
      email: email ?? null,
      shopifyDomain: shop.myshopifyDomain,
      exempt,
    });
  };

  const validateVatId = async (vatId) => {
    if (!vatId) return;

    setIsValidatingVat(true);

    try {
      const data = await apiClient("/api/validate-vat", "POST", { vatId });
      setVatValidationResult(data);

      if (data.success) {
        setValidatedVatIds((prev) => new Set(prev).add(vatId));
        setIsVatValidated(true);
        vatProcessedRef.current = false; // Reset so we can process this new validation
      }
    } catch (error) {
      const errorMessage = (() => {
        if (error.status === 400) return translate("invalidVatId");
        if (error.status === 503) return translate("vatServiceUnavailable");
        return translate("failedToValidateVatId");
      })();

      setVatValidationResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsValidatingVat(false);
    }
  };

  // Process VAT ID when email becomes valid
  useEffect(() => {
    const processValidatedVat = async () => {
      const shouldProcess =
        isVatValidated &&
        isValidEmail(email) &&
        vatId &&
        vatValidationResult?.success &&
        !vatProcessedRef.current;

      if (!shouldProcess) {
        return;
      }

      try {
        vatProcessedRef.current = true;
        const metafieldResult = await updateVatMetafield(vatId);
        
        // Only exempt if not a German VAT ID in German store
        const shouldExempt = !(isGermanStore() && isGermanVatId(vatId));
        const exemptionResult = await updateTaxExemption(shouldExempt);
      } catch (error) {
        vatProcessedRef.current = false;
      }
    };

    processValidatedVat();
  }, [isVatValidated, vatId, vatValidationResult, email]);

  // Intercept buyer journey to validate B2B requirements
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (customerType !== "b2b" || !canBlockProgress) {
      return { behavior: "allow" };
    }

    const isCompanyMissing = !companyName || companyName.trim() === "";
    const isVatIdInvalid =
      vatId && vatValidationResult && !vatValidationResult.success;

    if (isCompanyMissing || isVatIdInvalid) {
      setHasAttemptedContinue(true);
      return {
        behavior: "block",
        reason: "Missing or invalid business information",
      };
    }

    return { behavior: "allow" };
  });

  // Customer type selection handler
  const handleSelectionChange = (value) => {
    applyAttributeChange({
      key: "customer_type",
      value,
      type: "updateAttribute",
    });
  };

  // Company name handlers
  const handleCompanyNameChange = (value) => {
    setCompanyName(value.slice(0, 40));
  };

  const handleCompanyNameBlur = async (value) => {
    applyShippingAddressChange({
      type: "updateShippingAddress",
      address: { company: value },
    });
  };

  // VAT ID handlers
  const handleVatIdChange = (value) => {
    setVatId(value);
    setVatValidationResult(null);
    setIsVatValidated(false);
    vatProcessedRef.current = false;

    // If VAT ID is cleared, remove tax exemption
    if (!value && customer?.id) {
      updateTaxExemption(false).catch(() => {
        // Error handling for removing tax exemption
      });
    }
  };

  const handleVatIdBlur = async (value) => {
    if (!value) {
      await updateVatMetafield("");
      return;
    }

    // Check if this VAT ID has already been validated successfully in this session
    if (validatedVatIds.has(value)) {
      setIsVatValidated(true);
      return;
    }

    // Basic validation before making the API request
    if (!isValidVatIdFormat(value)) {
      setVatValidationResult({
        success: false,
        message: translate("invalidVatIdFormat"),
      });
      return;
    }

    await validateVatId(value);
  };

  const renderBusinessFields = () => {
    if (customerType !== "b2b") return null;

    return (
      <BlockStack>
        <TextField
          label={translate("companyName")}
          value={companyName || ""}
          onChange={handleCompanyNameChange}
          onBlur={() => handleCompanyNameBlur(companyName || "")}
          error={
            hasAttemptedContinue && (!companyName || companyName.trim() === "")
              ? translate("companyNameRequired")
              : undefined
          }
          required
          maxLength={40}
        />

        <TextField
          label={translate("vatId")}
          value={vatId || ""}
          onChange={handleVatIdChange}
          onBlur={() => handleVatIdBlur(vatId || "")}
          disabled={isValidatingVat}
          error={
            vatValidationResult && !vatValidationResult.success
              ? vatValidationResult.message
              : undefined
          }
        />

        {isValidatingVat && (
          <InlineStack spacing="tight" blockAlignment="center">
            <Spinner size="small" />
            <Text size="small">{translate("validatingVatId")}</Text>
          </InlineStack>
        )}
      </BlockStack>
    );
  };

  return (
    <BlockStack>
      <Text size="base">{translate("customerTypeDescription")}</Text>

      {/* Customer Type Selection */}
      <ChoiceList
        name="choice"
        value={customerType || "b2b"}
        onChange={handleSelectionChange}
      >
        <InlineStack spacing="base">
          <Choice id="b2b">{translate("businessCustomer")}</Choice>
          <Choice id="b2c">{translate("privateCustomer")}</Choice>
        </InlineStack>
      </ChoiceList>

      {/* Business Customer Fields */}
      {renderBusinessFields()}
    </BlockStack>
  );
}
