import { gql } from "graphql-tag";
import { handleGraphQLResponseErrors, handleGraphQLUserErrors } from "../utils/errorUtils.js";

/**
 * Sets a customer metafield in Shopify
 * @param {Object} options - Options object
 * @param {string} options.customerId - Customer ID
 * @param {string} options.namespace - Metafield namespace
 * @param {string} options.key - Metafield key
 * @param {string} options.value - Metafield value
 * @param {string} options.type - Metafield type
 * @param {string} options.shop - Shop domain
 * @param {string} options.accessToken - Access token
 * @returns {Object} Customer object with updated metafield
 */
export const setCustomerMetafield = async ({
  customerId,
  namespace,
  key,
  value,
  type,
  client,
}) => {
  const operation = gql`
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          metafield(namespace: $namespace, key: $key) {
            id
            namespace
            key
            value
            type
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data, errors } = await client.request(operation?.loc.source.body, {
    variables: {
      input: {
        id: customerId,
        metafields: [
          {
            namespace,
            key,
            value,
            type,
          },
        ],
      },
      namespace,
      key,
    },
  });

  handleGraphQLResponseErrors(errors);
  handleGraphQLUserErrors(data.customerUpdate.userErrors);

  return data.customerUpdate.customer;
};
