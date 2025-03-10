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
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";
// import useSecureFetch from "../hooks/useSecureFetch";

const customerTypeExtension = reactExtension(
  "purchase.checkout.delivery-address.render-before",
  () => {
    return <CustomerTypeExtension />;
  }
);

export default customerTypeExtension;

function CustomerTypeExtension() {
  const [customerType] = useAttributeValues(["customer_type"]);
  const applyAttributeChange = useApplyAttributeChange();
  const translate = useTranslate();
  const [vatId, setVatId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const applyShippingAddressChange = useApplyShippingAddressChange();
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState(null);
  // const secureFetch = useSecureFetch();
  const customer = useCustomer();

  const handleSelectionChange = (value) => {
    applyAttributeChange({
      key: "customer_type",
      value: value,
      type: "updateAttribute",
    });
  };

  const handleVatIdChange = (value) => {
    setVatId(value);
    setVatValidationResult(null);
  };

  const handleVatIdBlur = async (value) => {
    if (value) {
      // Basic validation before making the API request
      const vatIdPattern = /^[A-Z]{2}[0-9A-Z+*]{2,12}$/;
      if (!vatIdPattern.test(value)) {
        setVatValidationResult({
          success: false,
          message: translate("invalidVatIdFormat"),
        });
        return;
      }

      setIsValidatingVat(true);
      try {
        // const data = await secureFetch("/api/validate-vat", "POST", { vatId: value });
        const data = { success: false, message: "VAT validation temporarily disabled" };
        setVatValidationResult(data);

        if (data.success && data.data && data.data.company_name) {
          // If VAT validation returns a company name, update the company field
          console.log("VAT validation returned company name:", data.data.company_name);
          setCompanyName(data.data.company_name);
          handleCompanyNameBlur(data.data.company_name);
        }
      } catch (error) {
        setVatValidationResult({
          success: false,
          message: translate("failedToValidateVatId"),
        });
      } finally {
        setIsValidatingVat(false);
      }
    }
  };

  const handleCompanyNameBlur = async (value) => {
    console.log("Company name blur event with value:", value);
    // Update the company field in the shipping address only on blur
    applyShippingAddressChange({
      type: "updateShippingAddress",
      address: {
        company: value,
      },
    });
    console.log("Applied shipping address change with company:", value);

    // Save company name to customer metafield
    if (customer && customer.id && value) {
      console.log("Attempting to save company name to metafield for customer:", customer.id);
      try {
        // const response = await secureFetch("/api/set-metafield", "POST", {
        //   customerId: customer.id,
        //   namespace: "customer_b2b",
        //   key: "company_name",
        //   value: value,
        //   type: "single_line_text_field"
        // });
        // console.log("Metafield save response:", response);
        console.log("Metafield save temporarily disabled");
      } catch (error) {
        console.error("Failed to save company name to metafield:", error);
      }
    } else {
      console.log("Skipping metafield save - missing data:", { 
        hasCustomer: !!customer, 
        customerId: customer?.id, 
        companyValue: value 
      });
    }
  };

  const handleCompanyNameChange = (value) => {
    console.log("Company name changed to:", value);
    setCompanyName(value);
  };

  return (
    <BlockStack>
      <Text size="base">{translate("customerTypeDescription")}</Text>
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

      {customerType === "b2b" && (
        <BlockStack>
          <TextField
            label={translate("companyName")}
            value={companyName || ""}
            onChange={handleCompanyNameChange}
            onBlur={() => handleCompanyNameBlur(companyName || "")}
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
      )}
    </BlockStack>
  );
}
