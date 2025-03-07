import { useCallback } from "react";

const SECRET_KEY = process.env.SECRET_KEY;

const generateSignature = async (method, path, body = "") => {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID(); // Unique per request

  const data = `${method}|${path}|${timestamp}|${nonce}|${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );

  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return { signature: signatureHex, timestamp, nonce };
};

const useSecureFetch = () => {
  return useCallback(async (path, method = "GET", body = null) => {
    const bodyString = body ? JSON.stringify(body) : "";
    const { signature, timestamp, nonce } = await generateSignature(method, path, bodyString);

    const response = await fetch(`https://4e9c-87-145-168-57.ngrok-free.app${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      body: bodyString || undefined,
    });

    if (!response.ok) throw new Error("Request failed");

    return response.json();
  }, []);
};

export default useSecureFetch;
