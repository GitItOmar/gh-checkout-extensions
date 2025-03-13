import { useCallback } from "react";

const useApiClient = () => {
  return useCallback(async (path, method = "GET", body = null) => {
    const bodyString = body ? JSON.stringify(body) : "";

    const response = await fetch(
      `https://gh-custom-checkout-extensions-225fe25bc698.herokuapp.com${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: bodyString || undefined,
      }
    );

    if (!response.ok) throw new Error("Request failed");

    return response.json();
  }, []);
};

export default useApiClient;
