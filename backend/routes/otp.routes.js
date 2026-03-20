const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

const OTP_EXPIRY_MS = (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
const MAX_ATTEMPTS = 5;
const otpStore = new Map();

const mailer = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

function generateOTP(length = 6) {
    return String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
}

function storeOTP(email, code) {
    otpStore.set(String(email).toLowerCase(), {
        code,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
    });
}

function verifyOTPCode(email, code) {
    const key = String(email).toLowerCase();
    const record = otpStore.get(key);

    if (!record) {
        return { ok: false, reason: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(key);
        return { ok: false, reason: 'OTP expired. Please request a new one.' };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
        otpStore.delete(key);
        return { ok: false, reason: 'Too many attempts. Please request a new OTP.' };
    }

    record.attempts += 1;
    if (record.code !== String(code)) {
        const left = MAX_ATTEMPTS - record.attempts;
        return { ok: false, reason: `Invalid code. ${left} attempt${left === 1 ? '' : 's'} remaining.` };
    }

    otpStore.delete(key);
    return { ok: true };
}

router.post('/send-email', async (req, res) => {
    try {
        const { email } = req.body || {};

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email address.' });
        }

        if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_FROM) {
            return res.status(500).json({ success: false, message: 'Email service not configured on server.' });
        }

        const code = generateOTP();
        storeOTP(email, code);

        await mailer.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your verification code',
            text: `Your verification code is: ${code}\n\nExpires in ${Number(process.env.OTP_EXPIRY_MINUTES) || 10} minutes. Do not share this code.`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f7f8fc;border-radius:12px;">
                    <h2 style="margin:0 0 8px;color:#0ea5e9;">Verify your email</h2>
                    <p style="margin:0 0 20px;color:#334155;">Use this OTP code to continue:</p>
                    <div style="padding:16px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;text-align:center;">
                        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f172a;font-family:monospace;">${code}</span>
                    </div>
                    <p style="margin:16px 0 0;color:#64748b;font-size:12px;">This code expires in ${Number(process.env.OTP_EXPIRY_MINUTES) || 10} minutes.</p>
                </div>
            `,
        });

        return res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (err) {
        console.error('OTP send error', err?.message || err);
        return res.status(500).json({ success: false, message: 'Could not send OTP right now.' });
    }
});

router.post('/verify', (req, res) => {
    const { email, code } = req.body || {};

    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'email and code are required.' });
    }

    const result = verifyOTPCode(email, code);
    if (!result.ok) {
        return res.status(400).json({ success: false, message: result.reason });
    }

    return res.json({ success: true, message: 'Email verified successfully!' });
});

module.exports = router;
