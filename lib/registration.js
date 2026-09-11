export function registrationRecord(body) {
  // Accept the existing form key, but persist the column used by reminders.
  return {
    student_name: body.student_name,
    student_email: body.student_email,
    phone_number: body.whatsapp_number ?? body.phone_number,
  };
}
