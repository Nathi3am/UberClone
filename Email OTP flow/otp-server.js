// ─── Email OTP Backend — Nodemailer + HostAfrica SMTP ─────────────────────────
// Install:  npm install express nodemailer dotenv cors
//
// .env file:
//   EMAIL_HOST=mail.yourdomain.com
//   EMAIL_PORT=587
//   EMAIL_USER=noreply@yourdomain.com
//   EMAIL_PASS=your_email_password
//   EMAIL_FROM="My App <noreply@yourdomain.com>"
//   OTP_EXPIRY_MINUTES=10
//   PORT=4000
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env'), override: false });
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// ── Nodemailer / Console fallback for OTP delivery ─────────────────────────
let mailer;
if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('EMAIL_HOST or credentials not set — using console transport for OTPs');
  mailer = {
    sendMail: async (msg) => {
      console.log('--- OTP Console Transport ---');
      console.log('to:', msg.to);
      console.log('subject:', msg.subject);
      const codeMatch = (msg.text || '').match(/(\d{4,6})/);
      if (codeMatch) console.log('code:', codeMatch[1]);
      console.log('html snippet:', (msg.html || '').slice(0, 200));
      console.log('--- End OTP ---');
      return Promise.resolve({ accepted: [msg.to] });
    }
  };
} else {
  mailer = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });

  // Verify connection on startup
  mailer.verify((err) => {
    if (err) console.error("❌ Mailer connection failed:", err.message);
    else console.log("✅ Mailer connected to", process.env.EMAIL_HOST);
  });
}

// ── In-memory OTP store ───────────────────────────────────────────────────────
// For production: replace with a DB table or Redis
const otpStore = new Map();
const OTP_EXPIRY_MS = (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOTP(length = 6) {
  return String(crypto.randomInt(0, 10 ** length)).padStart(length, "0");
}

function storeOTP(email, code) {
  otpStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  });
}

function verifyOTPCode(email, code) {
  const key = email.toLowerCase();
  const record = otpStore.get(key);
  if (!record) return { ok: false, reason: "No OTP found. Please request a new one." };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { ok: false, reason: "OTP expired. Please request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { ok: false, reason: "Too many attempts. Please request a new OTP." };
  }
  record.attempts += 1;
  if (record.code !== String(code)) {
    const left = MAX_ATTEMPTS - record.attempts;
    return { ok: false, reason: `Invalid code. ${left} attempt${left === 1 ? "" : "s"} remaining.` };
  }
  otpStore.delete(key); // single-use
  return { ok: true };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/otp/send-email
 * Body: { email: "user@example.com" }
 */
app.post("/api/otp/send-email", async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }

  const code = generateOTP();
  storeOTP(email, code);

    // Always log the code to console for local testing (helps debugging SMTP delivery)
    try {
      console.log(`[OTP-DEBUG] code for ${email}: ${code}`);
    } catch (e) {}

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your verification code",
      text: `Your verification code is: ${code}\n\nExpires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#f4f4f8;border-radius:16px;">
          <h2 style="margin:0 0 8px;color:#6c63ff;font-size:22px;">Verify your email</h2>
          <p style="color:#555;margin:0 0 24px;font-size:15px;">Use the code below to complete your sign-in.</p>
          <div style="background:#fff;border:2px solid #6c63ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1a1a2e;font-family:monospace;">${code}</span>
          </div>
          <p style="color:#999;font-size:12px;line-height:1.6;">
            This code expires in <strong>${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>.<br>
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>`,
    });

    console.log(`[OTP] Sent to ${email}`);
    res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("[OTP] Send error:", err.message);
    otpStore.delete(email.toLowerCase());
    res.status(500).json({ success: false, message: "Could not send email. Please try again." });
  }
});

/**
 * POST /api/otp/verify
 * Body: { email: "user@example.com", code: "123456" }
 */
app.post("/api/otp/verify", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "email and code are required." });
  }

  const result = verifyOTPCode(email, code);
  if (result.ok) {
    console.log(`[OTP] ✓ Verified: ${email}`);
    res.json({ success: true, message: "Email verified successfully!" });
  } else {
    console.log(`[OTP] ✗ Failed for ${email}: ${result.reason}`);
    res.status(400).json({ success: false, message: result.reason });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.OTP_PORT || process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🔐 OTP server → http://localhost:${PORT}`);
  console.log(`   POST /api/otp/send-email`);
  console.log(`   POST /api/otp/verify\n`);
});
