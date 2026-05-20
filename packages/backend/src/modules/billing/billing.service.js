import axios from "axios";
import { buildPaymentSignature } from "../../utils/payos.util.js";

const PAYOS_BASE_URL = "https://api-merchant.payos.vn";

function payosHeaders() {
  return {
    "x-client-id": process.env.PAYOS_CLIENT_ID,
    "x-api-key": process.env.PAYOS_API_KEY,
    "Content-Type": "application/json",
  };
}

/**
 * Create a payOS payment link.
 *
 * @param {{
 *   orderCode: number,
 *   amount: number,
 *   description: string,
 *   returnUrl: string,
 *   cancelUrl: string,
 *   buyerName?: string,
 *   buyerEmail?: string,
 *   buyerPhone?: string,
 *   items?: Array<{ name: string, quantity: number, price: number }>
 * }} params
 * @returns {Promise<{ paymentLinkId: string, checkoutUrl: string, qrCode: string }>}
 */
export async function createPaymentLink(params) {
  const { orderCode, amount, description, returnUrl, cancelUrl, buyerName, buyerEmail, buyerPhone, items } = params;

  const signature = buildPaymentSignature({ amount, cancelUrl, description, orderCode, returnUrl });

  const body = { orderCode, amount, description, returnUrl, cancelUrl, signature };
  if (buyerName) body.buyerName = buyerName;
  if (buyerEmail) body.buyerEmail = buyerEmail;
  if (buyerPhone) body.buyerPhone = buyerPhone;
  if (items?.length) body.items = items;

  const { data } = await axios.post(`${PAYOS_BASE_URL}/v2/payment-requests`, body, {
    headers: payosHeaders(),
  });

  if (data.code !== "00") {
    const err = new Error(`[payOS] createPaymentLink failed: ${data.desc}`);
    err.code = data.code;
    throw err;
  }

  return data.data;
}

/**
 * Get payment info by orderCode.
 *
 * @param {number|string} orderCode
 * @returns {Promise<object>}
 */
export async function getPaymentInfo(orderCode) {
  const { data } = await axios.get(`${PAYOS_BASE_URL}/v2/payment-requests/${orderCode}`, {
    headers: payosHeaders(),
  });

  if (data.code !== "00") {
    const err = new Error(`[payOS] getPaymentInfo failed: ${data.desc}`);
    err.code = data.code;
    throw err;
  }

  return data.data;
}

/**
 * Cancel a payOS payment link.
 *
 * @param {number|string} orderCode
 * @param {string} [reason]
 * @returns {Promise<object>}
 */
export async function cancelPaymentLink(orderCode, reason = "Cancelled by user") {
  const { data } = await axios.post(
    `${PAYOS_BASE_URL}/v2/payment-requests/${orderCode}/cancel`,
    { cancellationReason: reason },
    { headers: payosHeaders() }
  );

  if (data.code !== "00") {
    const err = new Error(`[payOS] cancelPaymentLink failed: ${data.desc}`);
    err.code = data.code;
    throw err;
  }

  return data.data;
}
