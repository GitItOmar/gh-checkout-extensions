export const handleGraphQLResponseErrors = (errors) => {
  if (!errors) return;

  const { networkStatusCode, message, graphQLErrors } = errors;

  const errorDetails = {
    status: networkStatusCode ?? "Unknown Status",
    message: message ?? "No message provided",
    graphqlErrors: graphQLErrors?.length ? graphQLErrors : "No GraphQL errors",
  };

  const errorMessage = `API Request Failed:
  - Status: ${errorDetails.status}
  - Message: ${errorDetails.message}
  - GraphQL Errors: ${JSON.stringify(errorDetails.graphqlErrors)}`;

  throw new Error(errorMessage);
};

export const handleGraphQLUserErrors = (userErrors) => {
  if (!userErrors || !Array.isArray(userErrors) || userErrors.length === 0)
    return;

  const formattedErrors = userErrors.map(({ field, message }) => {
    const fieldPath = field?.length ? field.join(".") : "unknown field";
    return `Field: ${fieldPath} - Message: ${message}`;
  });

  const errorMessage = `GraphQL User Errors:\n${formattedErrors.join("\n")}`;

  throw new Error(errorMessage);
};
