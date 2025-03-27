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
  const customerType = input?.cart?.attribute?.value;

  if (customerType === "b2c") {
    const hideOperations = input.paymentMethods
      .filter(method => 
        method.name === "Rechnungskauf für Firmenkunden" || 
        method.name === "Billie"
      )
      .map(method => ({
        hide: { paymentMethodId: method.id }
      }));

    return {
      operations: hideOperations
    };
  }

  if (!customerType || customerType === "b2b") {
    const hideOperations = input.paymentMethods
      .filter(method => method.name === "klarna_pay_later")
      .map(method => ({
        hide: { paymentMethodId: method.id }
      }));

    return {
      operations: hideOperations
    };
  }

  return NO_CHANGES;
}
