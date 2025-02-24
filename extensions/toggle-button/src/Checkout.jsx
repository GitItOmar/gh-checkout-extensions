import {
  reactExtension,
  Banner,
  BlockStack,
  ChoiceList,
  Choice,
  useApplyCartLinesChange,
  useCartLines,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension(
  "purchase.checkout.delivery-address.render-before",
  () => {
    return <Extension />;
  }
);

function Extension() {
  const applyCarLinesChange = useApplyCartLinesChange();
  const cartLines = useCartLines();

  const handleSelectionChange = async (selectedValue) => {
    const updatePromises = cartLines.map((line) =>
      applyCarLinesChange({
        type: "updateCartLine",
        id: line.id,
        attributes: [
          {
            key: "customer_type",
            value: selectedValue,
          },
        ],
      })
    );

    await Promise.all(updatePromises);
  };

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Banner title="Kundentyp auswählen">
        Bitte wählen Sie Ihren Kundentyp aus
      </Banner>
      <ChoiceList name="choice" value="b2b" onChange={handleSelectionChange}>
        <BlockStack>
          <Choice id="b2b">Geschäftskunde (B2B)</Choice>
          <Choice id="b2c">Privatkunde (B2C)</Choice>
        </BlockStack>
      </ChoiceList>
    </BlockStack>
  );
}
