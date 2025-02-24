import {
  reactExtension,
  Banner,
  BlockStack,
  ChoiceList,
  Choice,
  useAttributeValues,
  useApplyAttributeChange,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension(
  "purchase.checkout.delivery-address.render-before",
  () => {
    return <Extension />;
  }
);

function Extension() {
  const [customerType] = useAttributeValues(["customer_type"]);
  const applyAttributeChange = useApplyAttributeChange();

  const handleSelectionChange = (value) => {
    applyAttributeChange({
      key: "customer_type",
      value: value,
      type: "updateAttribute",
    });
  };

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Banner title="Kundentyp auswählen">
        Bitte wählen Sie Ihren Kundentyp aus
      </Banner>
      <ChoiceList name="choice" value={customerType || "b2b"} onChange={handleSelectionChange}>
        <BlockStack>
          <Choice id="b2b">Geschäftskunde (B2B)</Choice>
          <Choice id="b2c">Privatkunde (B2C)</Choice>
        </BlockStack>
      </ChoiceList>
    </BlockStack>
  );
}
