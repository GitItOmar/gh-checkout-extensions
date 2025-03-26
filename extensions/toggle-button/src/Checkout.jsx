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
  useInstructions,
  useApplyCartLinesChange,
  useCartLines
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";
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
  const applyCartLinesChange = useApplyCartLinesChange();
  const cartLines = useCartLines();
  // State
  const [vatId, setVatId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState(null);
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [validatedVatIds, setValidatedVatIds] = useState(new Set());
  const [isVatValidated, setIsVatValidated] = useState(false);

  // Effect to handle setting VAT ID and exempting customer when email becomes valid
  useEffect(() => {
    const handleValidEmailWithValidVat = async () => {
      if (isVatValidated && isValidEmail(email) && vatId && vatValidationResult?.success) {
        try {
          // Update the checkout metafield with the validated VAT ID
          await applyMetafieldsChange({
            type: "updateMetafield",
            namespace: "custom",
            key: "vat_id",
            valueType: "string",
            value: vatId
          });
          
          const vatResponse = await apiClient("/api/set-vat-id", "POST", {
            customerId: customer?.id || null,
            value: vatId,
            email: email,
            shopifyDomain: shop.myshopifyDomain,
          });
          
          const customerId = vatResponse.data?.id || customer?.id;
          
          if (customerId) {
            await apiClient("/api/exempt-customer-from-taxes", "POST", {
              customerId: customerId,
              shopifyDomain: shop.myshopifyDomain,
            });
            
            // Force Shopify checkout to recalculate taxes by updating cart lines
            // This triggers a tax recalculation without changing the actual items
            const cartLinesUpdate = await applyCartLinesChange({
              type: "updateCartLine",
              id: cartLines[0].id, // First cart line
              quantity: 2,
              merchandiseId: null // Keep the same merchandise
            });

            if (cartLinesUpdate.type !== "success") {
              console.error("Failed to trigger tax recalculation:", cartLinesUpdate.errors);
            }
          }
        } catch (error) {
          console.error("Error setting VAT ID or exempting customer:", error);
        }
      }
    };

    handleValidEmailWithValidVat();
  }, [email, isVatValidated, vatId, vatValidationResult, customer, shop, applyMetafieldsChange, apiClient, applyCartLinesChange]);

  // Intercept buyer journey to validate B2B requirements
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (customerType === "b2b" && canBlockProgress) {
      const isCompanyMissing = !companyName || companyName.trim() === "";
      const isVatIdMissing = !vatId || vatId.trim() === "";
      const isVatIdInvalid =
        vatValidationResult && !vatValidationResult.success;

      if (isCompanyMissing || isVatIdMissing || isVatIdInvalid) {
        setHasAttemptedContinue(true);

        return {
          behavior: "block",
          reason: "Missing or invalid business information"
        };
      }
    }

    return { behavior: "allow" };
  });

  // Customer type selection handler
  const handleSelectionChange = (value) => {
    applyAttributeChange({
      key: "customer_type",
      value: value,
      type: "updateAttribute",
    });
  };

  // Company name handlers
  const handleCompanyNameChange = (value) => {
    setCompanyName(value);
  };

  const handleCompanyNameBlur = async (value) => {
    applyShippingAddressChange({
      type: "updateShippingAddress",
      address: {
        company: value,
      },
    });
  };

  // VAT ID handlers
  const handleVatIdChange = (value) => {
    setVatId(value);
    setVatValidationResult(null);
    setIsVatValidated(false);
  };

  const handleVatIdBlur = async (value) => {
    if (!value) {
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

    // Validate VAT ID with external service
    await validateVatId(value);
  };

  // Helper functions
  const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailPattern.test(email);
  };

  const isValidVatIdFormat = (vatId) => {
    const vatIdPattern = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;
    return vatIdPattern.test(vatId);
  };

  const validateVatId = async (vatId) => {
    setIsValidatingVat(true);

    try {
      const data = await apiClient("/api/validate-vat", "POST", { vatId, service: "vatlayer" });
      setVatValidationResult(data);

      if (data.success) {
        // Add to set of validated VAT IDs for this session
        setValidatedVatIds(prev => new Set(prev).add(vatId));
        setIsVatValidated(true);
      }
    } catch (error) {
      console.error("Error validating VAT ID:", error);
      setVatValidationResult({
        success: false,
        message: translate("failedToValidateVatId"),
      });
    } finally {
      setIsValidatingVat(false);
    }
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
      {customerType === "b2b" && (
        <BlockStack>
          <TextField
            label={translate("companyName")}
            value={companyName || ""}
            onChange={handleCompanyNameChange}
            onBlur={() => handleCompanyNameBlur(companyName || "")}
            error={
              hasAttemptedContinue &&
              (!companyName || companyName.trim() === "")
                ? translate("companyNameRequired")
                : undefined
            }
            required
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
                : hasAttemptedContinue && (!vatId || vatId.trim() === "")
                ? translate("vatIdRequired")
                : undefined
            }
            required
          />

          {isValidatingVat && (
            <InlineStack spacing="tight" blockAlignment="center">
              <Spinner size="small" />
              <Text size="small">{translate("validatingVatId")}</Text>
            </InlineStack>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}
