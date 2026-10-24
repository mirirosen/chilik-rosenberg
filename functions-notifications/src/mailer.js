'use strict';
// Gmail SMTP sender (nodemailer). The account sends as itself; the password is
// a Google App Password supplied by the GMAIL_APP_PASSWORD secret.
const SENDER = 'hr20192022@gmail.com';
const SMTP = { host: 'smtp.gmail.com', port: 465, secure: true };

function createGmailSender(password, { nodemailer = require('nodemailer') } = {}) {
  let transport = null;
  return async function send({ to, subject, text, html, key, replyTo }) {
    if (!password) throw new Error('gmail-app-password-missing');
    transport ??= nodemailer.createTransport({ ...SMTP, auth: { user: SENDER, pass: password } });
    // A stable Message-ID per notice lets Gmail collapse an accidental resend.
    await transport.sendMail({
      from: { name: 'חיליק רוזנברג – סיורים קולינריים', address: SENDER },
      to, subject, text, html,
      ...(replyTo ? { replyTo } : {}),
      messageId: `<${key}@notifications.chilik-tours.com>`,
    });
  };
}
module.exports = { createGmailSender, SENDER, SMTP };
