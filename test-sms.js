
require("dotenv").config();

const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testSMS() {
  try {
    const result = await client.messages.create({
      to: "+918523912881",
      from: process.env.TWILIO_PHONE_NUMBER,
      body: "sms_appointment_reminders",
    });

    console.log("SMS request accepted by Twilio.");
    console.log("Message SID:", result.sid);
    console.log("Message status:", result.status);
  } catch (error) {
    console.error("SMS test failed:", error.message);
    console.error("Twilio error code:", error.code);
    console.error("HTTP status:", error.status);
  }
}

testSMS();
