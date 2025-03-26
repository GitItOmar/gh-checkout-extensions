import { gql } from "graphql-tag";
import {
  handleGraphQLResponseErrors,
  handleGraphQLUserErrors,
} from "../utils/errorUtils.js";

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
          metafield(namespace: "${namespace}", key: "${key}") {
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
    },
  });

  handleGraphQLResponseErrors(errors);
  handleGraphQLUserErrors(data.customerUpdate.userErrors);

  return data.customerUpdate.customer;
};

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

  const operation = gql`
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
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
      input: {
        id: customerId,
        taxExempt: taxExemption === "EXEMPT",
      },
    },
  });

  handleGraphQLResponseErrors(errors);
  handleGraphQLUserErrors(data.customerUpdate.userErrors);

  return data.customerUpdate.customer;
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

/**
 * Retrieves a customer by email or ID from Shopify
 * @param {Object} params - Parameters for retrieving a customer
 * @param {string} params.email - Customer's email address
 * @param {string} params.customerId - Customer's ID
 * @param {Object} params.client - Shopify GraphQL client
 * @returns {Promise<Object>} The customer data
 */
export const getCustomerByEmailOrId = async ({ email, customerId, client }) => {
  if (!email && !customerId) {
    throw new Error("Email or customer ID is required");
  }

  // If we have a customerId, use the node query
  if (customerId) {
    const nodeOperation = gql`
      query getCustomer($id: ID!) {
        node(id: $id) {
          ... on Customer {
            id
            email
            metafield(namespace: "custom", key: "vat_id") {
              namespace
              key
              value
            }
          }
        }
      }
    `;

    const { data, errors } = await client.request(nodeOperation?.loc.source.body, {
      variables: {
        id: customerId,
      },
    });
    
    handleGraphQLResponseErrors(errors);
    return data.node;
  }

  // If we only have email, use the customers query
  const customerOperation = gql`
    query getCustomerByEmail($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            email
            metafield(namespace: "custom", key: "vat_id") {
              namespace
              key
              value
            }
          }
        }
      }
    }
  `;

  const { data, errors } = await client.request(customerOperation?.loc.source.body, {
    variables: {
      query: `email:${email}`,
    },
  });
  
  handleGraphQLResponseErrors(errors);

  if (data.customers.edges.length === 0) {
    throw new Error(`Customer with email ${email} not found`);
  }

  return data.customers.edges[0].node;
};
