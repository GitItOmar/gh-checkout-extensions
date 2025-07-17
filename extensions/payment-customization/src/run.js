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

  // Billie (Paiement sur facture) should only be visible for b2b customers
  // Hide Billie for b2c and for undefined customerType (treat as b2c)
  if (!customerType || customerType === 'b2c') {
    const hideOperations = input.paymentMethods
      .filter(
        ({ name }) =>
          name === 'Rechnungskauf für Firmenkunden' ||
          name === 'Billie' ||
          name === 'Paiement sur facture'
      )
      .map(({ id }) => ({
        hide: { paymentMethodId: id }
      }));

    return {
      operations: hideOperations
    };
  }

  // For b2b, optionally hide other payment methods if needed (example: klarna_pay_later)
  if (customerType === 'b2b') {
    const hideOperations = input.paymentMethods
      .filter(({ name }) => name === 'klarna_pay_later')
      .map(({ id }) => ({
        hide: { paymentMethodId: id }
      }));

    return {
      operations: hideOperations
    };
  }

  return NO_CHANGES;
}
