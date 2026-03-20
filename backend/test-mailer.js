require('dotenv').config();
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
  logger: true,
  debug: true,
});

mailer.verify((err, success) => {
  if (err) {
    console.error('Mailer verify error full:', err);
    if (err.response) console.error('Response:', err.response);
    process.exitCode = 1;
  } else {
    console.log('Mailer verify success:', success);
  }
});

// also attempt a sendMail to a test recipient but don't rely on sending
(async () => {
  try {
    const info = await mailer.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Test email from test-mailer.js',
      text: 'This is a test',
    });
    console.log('sendMail info:', info);
  } catch (e) {
    console.error('sendMail error full:', e);
  }
})();