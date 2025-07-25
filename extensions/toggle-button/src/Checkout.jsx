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
  Button,
  InlineLayout,
  useShippingAddress,
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
  const shippingAddress = useShippingAddress();

  // State
  const [vatId, setVatId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState(null);
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [validatedVatIds, setValidatedVatIds] = useState(new Set());
  const [isVatValidated, setIsVatValidated] = useState(false);
  const [hasCompanyFieldBeenChanged, setHasCompanyFieldBeenChanged] =
    useState(false);
  const [processedVatIds, setProcessedVatIds] = useState(new Set());
  const [hasCompanyFieldBeenBlurred, setHasCompanyFieldBeenBlurred] =
    useState(false);

  // Ref to track if VAT ID has been processed already
  const vatProcessedRef = useRef(false);
  // Ref to track previous customer type
  const previousCustomerTypeRef = useRef(customerType);

  // Block checkout if B2B customer doesn't have company name
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (customerType === "b2b" && (!companyName || companyName.trim() === "")) {
      setHasAttemptedContinue(true);
      return canBlockProgress({
        reason: translate("companyNameRequired"),
        errors: [
          {
            message: translate("companyNameRequired"),
            target: "$.cart.customerType",
          },
        ],
      });
    }
    return { behavior: "allow" };
  });

  // Clear any existing customer data on component mount to ensure fresh checkout session
  useEffect(() => {
    const clearExistingData = async () => {
      try {
        // Clear VAT metafield
        await applyMetafieldsChange({
          type: "removeMetafield",
          namespace: "checkoutblocks",
          key: "umsatzsteuer_identifikationsnu",
        });

        // Remove tax exemption if customer exists
        if (customer?.id || email) {
          await updateTaxExemption(false).catch(() => {
            // Silently handle errors for cleanup operation
          });
        }
      } catch (error) {
        // Silently handle errors for cleanup operation
      }
    };

    clearExistingData();
  }, []); // Run only once on mount

  // Set default customer type to b2b if no value is present
  useEffect(() => {
    if (!customerType) {
      applyAttributeChange({
        key: "customer_type",
        value: "b2b",
        type: "updateAttribute",
      });
    }
  }, [customerType, applyAttributeChange]);

  // Reset validation states when customer type changes
  useEffect(() => {
    // Only reset if customer type actually changed
    if (previousCustomerTypeRef.current !== customerType) {
      // Immediate reset
      setHasAttemptedContinue(false);
      setHasCompanyFieldBeenBlurred(false);
      setHasCompanyFieldBeenChanged(false);
      
      // Also reset after a micro-task to ensure React has finished updating
      setTimeout(() => {
        setHasAttemptedContinue(false);
        setHasCompanyFieldBeenBlurred(false);
        setHasCompanyFieldBeenChanged(false);
      }, 0);
      
      previousCustomerTypeRef.current = customerType;
    }
  }, [customerType]);

  // Pre-populate company field if customer has company information
  useEffect(() => {
    const prePopulateCompanyField = () => {
      // Only pre-populate if we're in B2B mode and don't already have a company name set
      if (customerType === "b2b" && !companyName) {
        // Check shipping address first (most reliable source)
        const existingCompany = shippingAddress?.company;
        
        if (existingCompany && existingCompany.trim() !== "") {
          setCompanyName(existingCompany.trim());
          setHasCompanyFieldBeenChanged(true);
        }
        // TODO: Add fallback to customer.defaultAddress.company if available
        // else if (customer?.defaultAddress?.company) {
        //   setCompanyName(customer.defaultAddress.company.trim());
        //   setHasCompanyFieldBeenChanged(true);
        // }
      }
    };

    prePopulateCompanyField();
  }, [customerType, shippingAddress, customer, companyName]);

  // Helper functions
  const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailPattern.test(email);
  };

  const isValidVatIdFormat = (vatId) => {
    const vatIdPattern = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;
    return vatIdPattern.test(vatId);
  };

  const isShippingAddressComplete = () => {
    const { firstName, lastName, address1, city, zip } = shippingAddress || {};
    return Boolean(firstName && lastName && address1 && city && zip);
  };

  const updateVatMetafield = async (value) => {
    if (!value) {
      return applyMetafieldsChange({
        type: "removeMetafield",
        namespace: "checkoutblocks",
        key: "umsatzsteuer_identifikationsnu",
      });
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
        setProcessedVatIds((prev) => new Set(prev).add(vatId));
        await updateVatMetafield(vatId);
        await updateTaxExemption(true);
      } catch (error) {
        vatProcessedRef.current = false;
      }
    };

    processValidatedVat();
  }, [isVatValidated, vatId, vatValidationResult, email]);

  // Update company field in shipping address when address is complete and company name exists
  useEffect(() => {
    const updateCompanyInAddress = async () => {
      if (
        customerType === "b2b" &&
        companyName &&
        companyName.trim() !== "" &&
        isShippingAddressComplete() &&
        shippingAddress?.company !== companyName
      ) {
        try {
          await applyShippingAddressChange({
            type: "updateShippingAddress",
            address: { company: companyName },
          });
        } catch (error) {
          // Silently handle errors for address update
        }
      }
    };

    updateCompanyInAddress();
  }, [companyName, customerType, shippingAddress, isShippingAddressComplete]);

  // Customer type selection handler
  const handleSelectionChange = async (value) => {
    // Store previous customer type to check if we need to update shipping address
    const previousCustomerType = customerType;
    
    // Apply the customer type change immediately
    applyAttributeChange({
      key: "customer_type",
      value,
      type: "updateAttribute",
    });

    // Reset ALL states after customer type change
    setHasAttemptedContinue(false);
    setHasCompanyFieldBeenBlurred(false);
    setHasCompanyFieldBeenChanged(false);
    setVatValidationResult(null);
    setIsVatValidated(false);
    setValidatedVatIds(new Set());
    setProcessedVatIds(new Set());
    vatProcessedRef.current = false;

    // Clear field values
    setCompanyName("");
    setVatId("");

    // Only update shipping address if necessary to avoid triggering validation
    if (previousCustomerType === "b2b" && value === "b2c") {
      // Clear company field when switching to B2C, but only if it has content
      const currentCompany = shippingAddress?.company;
      if (currentCompany && currentCompany.trim() !== "") {
        try {
          await applyShippingAddressChange({
            type: "updateShippingAddress",
            address: { company: "" },
          });
        } catch (error) {
          // Silently handle errors for address update
        }
      }
    }

    // If switching to B2C, remove tax exemption
    if (value === "b2c" && (customer?.id || email)) {
      await updateTaxExemption(false).catch(() => {
        // Error handling for removing tax exemption
      });
    }

    // Only clear VAT metafield if switching away from B2B
    if (previousCustomerType === "b2b" && value === "b2c") {
      await updateVatMetafield("");
    }
  };

  // Company name handlers
  const handleCompanyNameChange = (value) => {
    setCompanyName(value.slice(0, 40));
    if (value !== "") {
      setHasCompanyFieldBeenChanged(true);
    }
  };

  const handleCompanyNameBlur = async (value) => {
    // Only set blur state if we're actually in B2B mode
    if (customerType === "b2b") {
      setHasCompanyFieldBeenBlurred(true);
    }
    // Company field is now updated via useEffect when shipping address is complete
    // This avoids triggering validation during address entry
  };

  // VAT ID handlers
  const handleVatIdChange = (value) => {
    const previousVatId = vatId;
    setVatId(value);
    setVatValidationResult(null);
    setIsVatValidated(false);
    vatProcessedRef.current = false;

    // Remove previous VAT ID from processed set if it was different
    if (previousVatId && previousVatId !== value) {
      setProcessedVatIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(previousVatId);
        return newSet;
      });
    }

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

    // Check if this VAT ID has already been validated and processed in this session
    if (validatedVatIds.has(value)) {
      setIsVatValidated(true);
      
      // Only apply tax exemption and update metafield if not already processed
      if (!processedVatIds.has(value) && isValidEmail(email)) {
        setProcessedVatIds((prev) => new Set(prev).add(value));
        await updateTaxExemption(true).catch(() => {
          // Error handling for tax exemption
        });
        await updateVatMetafield(value);
      }
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

  const handleClearVatId = async () => {
    const currentVatId = vatId;
    setVatId("");
    setVatValidationResult(null);
    setIsVatValidated(false);
    vatProcessedRef.current = false;
    
    // Remove from processed VAT IDs
    if (currentVatId) {
      setProcessedVatIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentVatId);
        return newSet;
      });
    }

    if (customer?.id || email) {
      await updateTaxExemption(false).catch(() => {
        // Error handling for removing tax exemption
      });
    }

    await updateVatMetafield("");
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
            customerType === "b2b" &&
            (hasAttemptedContinue || hasCompanyFieldBeenBlurred) && 
            (!companyName || companyName.trim() === "")
              ? translate("companyNameRequired")
              : undefined
          }
          required
          maxLength={40}
        />

        <InlineLayout
          spacing={vatId ? "base" : "none"}
          columns={["fill", "auto"]}
          blockAlignment="start"
        >
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
          {vatId && (
            <Button
              onPress={handleClearVatId}
              disabled={isValidatingVat}
              kind="secondary"
            >
              {translate("clear")}
            </Button>
          )}
        </InlineLayout>

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
