import { useCallback } from "react";

const useApiClient = () => {
  return useCallback(async (path, method = "GET", body = null) => {
    const bodyString = body ? JSON.stringify(body) : "";

    const response = await fetch(
      `https://88df-2a02-810b-880-9e00-1151-30e3-f2ca-b557.ngrok-free.app${path}`,
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
