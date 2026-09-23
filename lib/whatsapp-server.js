import "server-only";

import { normalizeWhatsAppNumber } from "./phone";

export async function sendWhatsApp(phone, message) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const apiUrl = process.env.WHATSAPP_API_URL || "http://127.0.0.1:3001";
  const normalizedPhone = normalizeWhatsAppNumber(phone);

  if (!normalizedPhone) return { skipped: true, reason: "missing_phone" };
  if (!apiKey) throw new Error("WHATSAPP_API_KEY is not configured.");

  const response = await fetch(`${apiUrl}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ phone: normalizedPhone, message }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `WhatsApp request failed with ${response.status}.`,
    );
  }

  return data;
}
