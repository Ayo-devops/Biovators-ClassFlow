import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const phoneSource = await readFile(
  new URL("../lib/phone.js", import.meta.url),
  "utf8",
);
const { normalizeWhatsAppNumber } = await import(
  "data:text/javascript;base64," + Buffer.from(phoneSource).toString("base64")
);
const registrationSource = await readFile(
  new URL("../lib/registration.js", import.meta.url),
  "utf8",
);
const registrationModule = registrationSource
  .replace('import { normalizeWhatsAppNumber } from "./phone.js";\n', "")
  .replace(
    "export function registrationRecord",
    "function registrationRecord",
  );
const registrationRecord = new Function(
  "normalizeWhatsAppNumber",
  `${registrationModule}; return registrationRecord;`,
)(normalizeWhatsAppNumber);
const record = registrationRecord({
  student_name: "Example Student",
  student_email: "student@example.com",
  whatsapp_number: "08012345678",
  id: "must-not-be-inserted",
});
assert.deepEqual(record, {
  student_name: "Example Student",
  student_email: "student@example.com",
  phone_number: "2348012345678",
});
assert.equal(
  registrationRecord({ phone_number: "+2348012345678" }).phone_number,
  "2348012345678",
);
assert.deepEqual(registrationRecord({ student_email: "email@example.com" }), {
  student_name: undefined,
  student_email: "email@example.com",
});
assert.equal(Object.hasOwn(record, "whatsapp_number"), false);
console.log("Passed: form phone maps to the confirmed database column; extra fields are excluded; phone_number clients remain compatible.");
