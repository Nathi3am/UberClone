const express = require('express');
const axios = require('axios');
const router = express.Router();
const userModel = require('../models/user.model');

const OTP_SERVER = process.env.OTP_SERVER_URL || 'http://localhost:5001';

// POST /api/auth/forgot-password
// body: { email }
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  try {
    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    // Forward to OTP service to send email
    const sendResp = await axios.post(`${OTP_SERVER}/api/otp/send-email`, { email });
    return res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('forgot-password error', err?.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-reset-otp
// body: { email, code }
router.post('/verify-reset-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code are required' });
  try {
    const verifyResp = await axios.post(`${OTP_SERVER}/api/otp/verify`, { email, code });
    if (verifyResp.data && verifyResp.data.success) return res.json({ success: true });
    return res.status(400).json({ success: false, message: verifyResp.data?.message || 'Invalid code' });
  } catch (err) {
    console.error('verify-reset-otp error', err?.response?.data || err.stack || err.message || err);
    if (err.response && err.response.data) {
      return res.status(err.response.status || 400).json({ success: false, message: err.response.data.message || 'Invalid or expired code' });
    }
    return res.status(400).json({ success: false, message: 'Invalid or expired code' });
  }
});

// POST /api/auth/reset-password
// body: { email, code, newPassword }
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields' });
  try {
    // verify OTP first
    const verifyResp = await axios.post(`${OTP_SERVER}/api/otp/verify`, { email, code });
    if (!(verifyResp.data && verifyResp.data.success)) return res.status(400).json({ success: false, message: 'Invalid or expired code' });

    const user = await userModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    const hashed = await userModel.hashPassword(newPassword);
    user.password = hashed;
    await user.save();

    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('reset-password error', err?.response?.data || err.stack || err.message || err);
    if (err.response && err.response.data) {
      return res.status(err.response.status || 400).json({ success: false, message: err.response.data.message || 'Failed to reset password' });
    }
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

module.exports = router;
