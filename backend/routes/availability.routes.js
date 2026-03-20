const express = require('express');
const router = express.Router();

// GET /api/check-email?email=...
router.get('/check-email', async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) return res.status(400).json({ available: false, message: 'Email is required' });
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
        const userModel = require('../models/user.model');
        const captainModel = require('../models/captain.model');

        const inUser = await userModel.findOne({ email: emailNorm }).lean();
        if (inUser) return res.status(200).json({ available: false, message: 'Email already exists' });

        const inCaptain = await captainModel.findOne({ email: emailNorm }).lean();
        if (inCaptain) return res.status(200).json({ available: false, message: 'Email already exists' });

        return res.status(200).json({ available: true });
    } catch (err) {
        console.error('check-email error', err && err.message ? err.message : err);
        return res.status(500).json({ available: false, message: 'Server error' });
    }
});

// GET /api/check-plate?plate=...&excludeId=optional
router.get('/check-plate', async (req, res) => {
    try {
        const plate = req.query.plate;
        if (!plate) return res.status(400).json({ available: false, message: 'Plate is required' });
        const plateRaw = String(plate || '').trim();
        const plateNorm = plateRaw.toUpperCase();
        const excludeId = req.query.excludeId;
        const captainModel = require('../models/captain.model');
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&');
        const query = { 'vehicle.plate': { $regex: `^${escapeRegex(plateNorm)}$`, $options: 'i' } };
        if (excludeId) {
            try { query._id = { $ne: excludeId }; } catch (e) {}
        }
        const found = await captainModel.findOne(query).lean();
        if (found) return res.status(200).json({ available: false, message: 'Vehicle plate already exists' });
        return res.status(200).json({ available: true });
    } catch (err) {
        console.error('check-plate error', err && err.message ? err.message : err);
        return res.status(500).json({ available: false, message: 'Server error' });
    }
});

module.exports = router;
