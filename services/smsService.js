
const twilio = require("twilio");
require("dotenv").config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Twilio trial accounts require an approved template.
async function sendSMS(to, message) {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error("TWILIO_PHONE_NUMBER is missing in .env");
  }

  if (!to) {
    throw new Error("Recipient phone number is required");
  }

  const digits = String(to).replace(/\D/g, "");
  const phoneDigits =
    digits.startsWith("91") && digits.length === 12
      ? digits.slice(2)
      : digits;

  if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
    throw new Error("Enter a valid 10-digit Indian mobile number");
  }

  const result = await client.messages.create({
    to: `+91${phoneDigits}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: "sms_appointment_reminders",
  });

  console.log("Twilio SMS SID:", result.sid);
  console.log("Twilio SMS status:", result.status);

  return result;
}

module.exports = { sendSMS };
