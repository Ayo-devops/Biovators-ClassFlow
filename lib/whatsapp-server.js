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
  const { timeoutMs = 25000, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...fetchOptions,
      signal: fetchOptions.signal || AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error(
        "The WhatsApp bot is taking longer than usual. Your message was not sent. Please wait a moment and try again.",
      );
    }
    throw new Error(
      "ClassFlow could not reach the WhatsApp bot. Your message was not sent. Please try again shortly.",
    );
  }
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
