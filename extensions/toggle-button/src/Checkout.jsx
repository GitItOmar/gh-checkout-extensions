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

  const handleSelectionChange = (value) => {
    applyAttributeChange({
      key: "customer_type",
      value: value,
      type: "updateAttribute",
    });
  };

  const handleVatIdChange = (value) => {
    setVatId(value);
  };

  const handleVatIdBlur = (value) => {
    if (value) {
      setIsValidatingVat(true);
      // Simulate VAT ID validation with a timeout
      setTimeout(() => {
        // Here you would typically validate the VAT ID
        setIsValidatingVat(false);
      }, 1500);
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
