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

const ALLOWED_B2C_TITLE = "Livraison standard";

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export const run = (input) => {
  const customerType = input?.cart?.attribute?.value;
  const deliveryGroups = input.cart?.deliveryGroups ?? [];
  if (!deliveryGroups.length) return NO_CHANGES;

  const [firstGroup] = deliveryGroups;
  const { deliveryOptions = [] } = firstGroup ?? {};

  if (customerType === "b2c") {
    const allowedHandles = deliveryOptions
      .filter(({ title }) => title === ALLOWED_B2C_TITLE)
      .map(({ handle }) => handle);

    // If no allowed shipping option is found, don't change anything
    if (allowedHandles.length === 0) {
      return NO_CHANGES;
    }

    const hideOperations = deliveryOptions
      .filter(({ handle }) => !allowedHandles.includes(handle))
      .map(({ handle }) => ({
        hide: { deliveryOptionHandle: handle }
      }));

    return {
      operations: hideOperations
    };
  }

  return NO_CHANGES;
};