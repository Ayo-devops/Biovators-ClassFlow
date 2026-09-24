import "server-only";

import { normalizeWhatsAppNumber } from "./phone";

function whatsappConfig() {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const apiUrl = process.env.WHATSAPP_API_URL || "http://127.0.0.1:3001";

  if (!apiKey) throw new Error("WHATSAPP_API_KEY is not configured.");
  return { apiKey, apiUrl };
}

async function whatsappRequest(path, options = {}) {
  const { apiKey, apiUrl } = whatsappConfig();
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `WhatsApp request failed with ${response.status}.`,
    );
  }

  return data;
}

export async function sendWhatsApp(phone, message) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);

  if (!normalizedPhone) return { skipped: true, reason: "missing_phone" };
  return whatsappRequest("/send", {
    method: "POST",
    body: JSON.stringify({ phone: normalizedPhone, message }),
  });
}

export async function listWhatsAppGroups() {
  return whatsappRequest("/groups");
}

export async function sendWhatsAppGroup(groupId, message) {
  return whatsappRequest("/send-group", {
    method: "POST",
    body: JSON.stringify({ groupId, message }),
  });
}
