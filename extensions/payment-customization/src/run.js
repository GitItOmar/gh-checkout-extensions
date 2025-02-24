// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const firstLineAttribute = input?.cart?.lines[0]?.attribute?.value;
  console.log('First line attribute:', firstLineAttribute);

  if (firstLineAttribute === "b2c") {
    const hideOperations = input.paymentMethods
      .filter(method => method.name === "Rechnungskauf für Firmenkunden")
      .map(method => ({
        hide: { paymentMethodId: method.id }
      }));

    console.log('B2C customer - hiding Billie payment method:', hideOperations);
    return {
      operations: hideOperations
    };
  }

  if (!firstLineAttribute || firstLineAttribute === "b2b") {
    const hideOperations = input.paymentMethods
      .filter(method => method.name === "klarna_pay_later")
      .map(method => ({
        hide: { paymentMethodId: method.id }
      }));

    console.log('B2B customer - hiding Klarna payment method:', hideOperations);
    return {
      operations: hideOperations
    };
  }

  console.log('No customer type detected - no payment methods hidden');
  return NO_CHANGES;
}
