import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/registration.js", import.meta.url), "utf8");
const { registrationRecord } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const record = registrationRecord({
  student_name: "Example Student",
  student_email: "student@example.com",
  whatsapp_number: "08012345678",
  id: "must-not-be-inserted",
});
assert.deepEqual(record, {
  student_name: "Example Student",
  student_email: "student@example.com",
  phone_number: "08012345678",
});
assert.equal(registrationRecord({ phone_number: "+2348012345678" }).phone_number, "+2348012345678");
assert.equal(Object.hasOwn(record, "whatsapp_number"), false);
console.log("Passed: form phone maps to the confirmed database column; extra fields are excluded; phone_number clients remain compatible.");
