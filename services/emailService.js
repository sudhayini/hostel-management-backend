const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  return transporter.sendMail({
    from: `"Hostel Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendEmail };
