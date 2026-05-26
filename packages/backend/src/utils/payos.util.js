import crypto from "crypto";

/**
 * Normalize a single value for signature building.
 * - null / undefined / "null" / "undefined" → ""
 * - Array → JSON.stringify with each element's keys sorted alphabetically
 * - Object → JSON.stringify
 * - Primitive → String(value)
 */
function normalizeValue(value) {
  if (value === null || value === undefined || value === "null" || value === "undefined") {
    return "";
  }
  if (Array.isArray(value)) {
    const sorted = value.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return Object.fromEntries(Object.keys(item).sort().map((k) => [k, item[k]]));
      }
      return item;
    });
    return JSON.stringify(sorted);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Build a canonical query string from an object by sorting keys alphabetically.
 * @param {Record<string, any>} obj
 * @returns {string}
 */
function buildQueryString(obj) {
  return Object.keys(obj)
    .sort()
    .map((key) => `${key}=${normalizeValue(obj[key])}`)
    .join("&");
}

/**
 * Verify a payOS webhook signature.
 * @param {Record<string, any>} data - The `data` object from the webhook payload
 * @param {string} receivedSignature - The `signature` field from the webhook payload
 * @param {string} checksumKey - PAYOS_CHECKSUM_KEY
 * @returns {boolean}
 */
export function verifyPayOSSignature(data, receivedSignature, checksumKey) {
  const queryString = buildQueryString(data);
  const computed = crypto
    .createHmac("sha256", checksumKey)
    .update(queryString)
    .digest("hex");
  if (typeof receivedSignature !== "string" || computed.length !== receivedSignature.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(receivedSignature, "utf8"));
}

/**
 * Build the signature for a payment-request creation payload.
 * Only these 5 fields are signed (alphabetical order is enforced):
 * amount, cancelUrl, description, orderCode, returnUrl
 *
 * @param {{ amount: number, cancelUrl: string, description: string, orderCode: number, returnUrl: string }} params
 * @returns {string} HMAC-SHA256 hex signature
 */
export function buildPaymentSignature({ amount, cancelUrl, description, orderCode, returnUrl }) {
  const payload = { amount, cancelUrl, description, orderCode, returnUrl };
  const queryString = buildQueryString(payload);
  return crypto
    .createHmac("sha256", process.env.PAYOS_CHECKSUM_KEY)
    .update(queryString)
    .digest("hex");
}
