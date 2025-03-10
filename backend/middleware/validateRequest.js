// middleware/validateRequest.js
import crypto from "crypto";

const SECRET_KEY = process.env.SECRET_KEY;

const validateRequest = (req, res, next) => {
  const {
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": signature,
  } = req.headers;

  const method = req.method;
  const path = req.originalUrl;
  let body = "";

  body = req.body ? JSON.stringify(req.body) : "";

  // Check if the timestamp is within an acceptable range (e.g., 5 minutes)
  const currentTime = Date.now();

  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 5 * 60 * 1000) {
    return res.status(400).json({
      message: "Request timestamp is too old or too far in the future",
    });
  }

  // Recreate the data string
  const data = `${method}|${path}|${timestamp}|${nonce}|${body}`;

  // Generate the HMAC signature
  const hmac = crypto.createHmac("sha256", SECRET_KEY);
  hmac.update(data);
  const expectedSignature = hmac.digest("hex");

  // Compare the signatures
  if (expectedSignature !== signature) {
    return res.status(403).json({ message: "Invalid signature" });
  }

  next();
};

export default validateRequest;
