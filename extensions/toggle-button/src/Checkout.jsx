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
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";
import useSecureFetch from "../hooks/useSecureFetch";

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
  const secureFetch = useSecureFetch();

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
        const data = await secureFetch("/api/validate-vat", "POST", { vatId: value });
        setVatValidationResult(data);

        if (data.success && data.data && data.data.company_name) {
          // If VAT validation returns a company name, update the company field
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

  const handleCompanyNameBlur = (value) => {
    // Update the company field in the shipping address only on blur
    applyShippingAddressChange({
      type: "updateShippingAddress",
      address: {
        company: value,
      },
    });
  };

  const handleCompanyNameChange = (value) => {
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
