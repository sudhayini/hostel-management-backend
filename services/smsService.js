
require("dotenv").config();

async function sendSMS(to, message) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    throw new Error("TWILIO_ACCOUNT_SID is missing");
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO_AUTH_TOKEN is missing");
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

  const twilio = require("twilio");

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const result = await client.messages.create({
    to: `+91${phoneDigits}`,
    body: "sms_appointment_reminders",
  });

  console.log("Twilio SMS SID:", result.sid);
  console.log("Twilio SMS status:", result.status);

  return result;
}

module.exports = { sendSMS };
