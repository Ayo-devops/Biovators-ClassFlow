export function normalizeWhatsAppNumber(value, countryCode = "234") {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("0")) return `${countryCode}${digits.slice(1)}`;
  return digits;
}
