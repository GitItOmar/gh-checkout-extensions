import { gql } from "graphql-tag";
import {
  handleGraphQLResponseErrors,
  handleGraphQLUserErrors,
} from "../utils/errorUtils.js";

/**
 * Updates a customer's tax exemption status in Shopify
 * @param {Object} params - Parameters for updating tax exemption
 * @param {string} params.customerId - Customer's ID
 * @param {string} params.taxExemption - Tax exemption status (e.g., "EXEMPT", "NOT_EXEMPT")
 * @param {Object} params.client - Shopify GraphQL client
 * @returns {Promise<Object>} The updated customer data
 */
export const updateCustomerTaxExemption = async ({
  customerId,
  taxExemption,
  client,
}) => {
  if (!customerId) {
    throw new Error("Customer ID is required to update tax exemption");
  }

  if (!taxExemption) {
    throw new Error("Tax exemption status is required");
  }

  // If using EXEMPT, add tax exemptions using the dedicated mutation
  if (taxExemption === "EXEMPT") {
    const operation = gql`
      mutation customerAddTaxExemptions($customerId: ID!, $taxExemptions: [TaxExemption!]!) {
        customerAddTaxExemptions(customerId: $customerId, taxExemptions: $taxExemptions) {
          customer {
            id
            taxExempt
            taxExemptions
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
        customerId,
        taxExemptions: ["EU_REVERSE_CHARGE_EXEMPTION_RULE"],
      },
    });

    handleGraphQLResponseErrors(errors);
    handleGraphQLUserErrors(data.customerAddTaxExemptions.userErrors);

    return data.customerAddTaxExemptions.customer;
  } else {
    // For NOT_EXEMPT, remove tax exemptions using the dedicated mutation
    const operation = gql`
      mutation customerRemoveTaxExemptions($customerId: ID!, $taxExemptions: [TaxExemption!]!) {
        customerRemoveTaxExemptions(customerId: $customerId, taxExemptions: $taxExemptions) {
          userErrors {
            field
            message
          }
          customer {
            id
            taxExemptions
          }
        }
      }
    `;

    const { data, errors } = await client.request(operation?.loc.source.body, {
      variables: {
        customerId,
        taxExemptions: ["EU_REVERSE_CHARGE_EXEMPTION_RULE"],
      },
    });

    handleGraphQLResponseErrors(errors);
    handleGraphQLUserErrors(data.customerRemoveTaxExemptions.userErrors);

    return data.customerRemoveTaxExemptions.customer;
  }
};

/**
 * Creates or retrieves a customer in Shopify using an email address
 * @param {Object} params - Parameters for creating/retrieving a customer
 * @param {string} params.email - Customer's email address
 * @param {Object} params.client - Shopify GraphQL client
 * @returns {Promise<Object>} The customer data
 */
export const createCustomerByEmail = async ({ email, client }) => {
  if (!email) {
    throw new Error("Email is required to create or retrieve a customer");
  }

  // First, try to find if the customer already exists
  const findOperation = gql`
    query getCustomerByEmail($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            email
          }
        }
      }
    }
  `;

  const { data: findData, errors: findErrors } = await client.request(
    findOperation?.loc.source.body,
    {
      variables: {
        query: `email:${email}`,
      },
    }
  );

  handleGraphQLResponseErrors(findErrors);

  // If customer exists, return it
  if (findData.customers.edges.length > 0) {
    return findData.customers.edges[0].node;
  }

  // If customer doesn't exist, create a new one
  const createOperation = gql`
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data, errors } = await client.request(
    createOperation?.loc.source.body,
    {
      variables: {
        input: {
          email,
        },
      },
    }
  );

  handleGraphQLResponseErrors(errors);
  handleGraphQLUserErrors(data.customerCreate.userErrors);

  return data.customerCreate.customer;
};
