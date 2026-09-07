const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.in',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

async function sendSubscriptionEmail({ to, subject, title, details }) {
  const transporter = getTransporter();
  if (!transporter || !to) return false;
  const lines = Object.entries(details || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text: `${title}\n\n${lines}` });
  return true;
}

module.exports = { sendSubscriptionEmail };