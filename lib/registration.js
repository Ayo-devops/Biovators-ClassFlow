import { normalizeWhatsAppNumber } from "./phone.js";

export function registrationRecord(body) {
  // Accept the existing form key, but persist the column used by reminders.
  const phoneNumber = normalizeWhatsAppNumber(
    body.whatsapp_number ?? body.phone_number,
  );

  return {
    student_name: body.student_name,
    student_email: body.student_email,
    ...(phoneNumber ? { phone_number: phoneNumber } : {}),
  };
}
