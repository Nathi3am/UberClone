const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const blacklistTokenModel = require('../models/blacklistToken.model');
const path = require('path');
const axios = require('axios');
const { uploadToCloudinary } = require('../config/cloudinary');

module.exports.registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { fullname, email, password } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
        const isUserAlreadyExist = await userModel.findOne({ email: emailNorm });
        if (isUserAlreadyExist) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        // prevent using an email that already belongs to a captain
        try {
            const captainModel = require('../models/captain.model');
            const existsInCaptain = await captainModel.findOne({ email: emailNorm });
            if (existsInCaptain) return res.status(400).json({ message: 'Email already exists' });
        } catch (e) {}
        const hashedPassword = await userModel.hashPassword(password);
        const user = await userService.createUsers({ firstname: fullname.firstname, lastname: fullname.lastname, email: emailNorm, password: hashedPassword });
        const token = user.generateAuthToken();
        // persist issued token for later blacklisting if needed
        try {
            user.activeTokens = user.activeTokens || [];
            user.activeTokens.push(token);
            await user.save();
        } catch (e) {}

        // set cookie for browser-based auth
        try { res.cookie('token', token); } catch (e) {}

        // return created user and token so frontend can log the user in immediately
        return res.status(201).json({ user: user, token: token });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.loginUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.warn('[login] user validation failed', {
                errors: errors.array(),
                origin: req.headers.origin || null,
                host: req.headers.host || null,
            });
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;

        console.log('[login] user login request received', {
            email: emailNorm,
            origin: req.headers.origin || null,
            host: req.headers.host || null,
            userAgent: req.headers['user-agent'] || null,
        });

        const user = await userModel.findOne({ email: emailNorm }).select('+password'); // This helps to bring the password with the query as well because we used select:false by default in model

        if (!user) {
            console.warn('[login] user not found', { email: emailNorm });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password); // This will compare the password with the hashed password in the database

        if (!isMatch) {
            console.warn('[login] invalid password', { email: emailNorm });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = user.generateAuthToken();

        // check suspended
        if (user.suspended) {
            console.warn('[login] suspended user blocked', { email: emailNorm, userId: user._id?.toString?.() || null });
            return res.status(403).json({ message: 'Your account has been suspended. Please wait for admin approval.' });
        }

        // persist issued token for later blacklisting if needed
        try {
            user.activeTokens = user.activeTokens || [];
            user.activeTokens.push(token);
            await user.save();
        } catch (e) {}

        res.cookie('token', token);

        console.log('[login] user login success', {
            email: emailNorm,
            userId: user._id?.toString?.() || null,
        });

        return res.status(200).json({ user: user, token: token });
    } catch (error) {
        console.error('[login] user login error', error && error.message ? error.message : error);
        return res.status(503).json({ message: 'Login service temporarily unavailable. Please try again.' });
    }
}

module.exports.getUserProfile = async (req, res, next) => {
    // //console.log(req.user)
    res.status(200).json({ user: req.user });
}

module.exports.logoutUser = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const blackToken = await blacklistTokenModel.create({ token: token });
    blackToken.save();
    res.clearCookie('token');
    try {
        if (req.user && req.user._id && token) {
            await userModel.findByIdAndUpdate(req.user._id, { $pull: { activeTokens: token } });
        }
    } catch (e) {}
    res.status(200).json({ message: 'Logged out successfully' });
}

module.exports.savePushToken = async (req, res, next) => {
    try {
        const pushToken = typeof req.body.pushToken === 'string' ? req.body.pushToken.trim() : '';
        if (!pushToken) {
            return res.status(400).json({ message: 'pushToken is required' });
        }

        await userModel.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { pushTokens: pushToken } },
            { new: true }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save push token' });
    }
}

module.exports.uploadProfileImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, 'profile-images');
        const imageUrl = result.secure_url;
        
        // Update user's profileImage in database
        const user = await userModel.findByIdAndUpdate(
            req.user._id,
            { profileImage: imageUrl },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            message: 'Profile image uploaded successfully',
            profileImage: imageUrl,
            user
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.updateProfile = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { phone, firstname, lastname, email } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
        const update = {};

        if (phone !== undefined) update.phone = phone;

        if (email !== undefined) {
                // ensure email is not already taken by another account
                if (email && emailNorm !== req.user.email) {
                    const existing = await userModel.findOne({ email: emailNorm });
                    if (existing && existing._id.toString() !== req.user._id.toString()) {
                        return res.status(400).json({ message: 'Email already in use' });
                    }
                    // also ensure not used by a captain
                    try {
                        const captainModel = require('../models/captain.model');
                        const existsInCaptain = await captainModel.findOne({ email: emailNorm });
                        if (existsInCaptain && String(existsInCaptain._id) !== String(req.user._id)) {
                            return res.status(400).json({ message: 'Email already in use' });
                        }
                    } catch (e) {}

                    // Require OTP verification for email changes
                    const { code } = req.body || {};
                    if (!code) {
                        return res.status(400).json({ message: 'OTP required for email change' });
                    }

                    const OTP_SERVER = process.env.OTP_SERVER_URL || 'http://localhost:5001';
                    try {
                        const resp = await axios.post(`${OTP_SERVER}/api/otp/verify`, { email: emailNorm, code }, { headers: { 'Content-Type': 'application/json' } });
                        if (!resp.data || !resp.data.success) {
                            return res.status(400).json({ message: 'OTP verification failed' });
                        }
                    } catch (err) {
                        const msg = err.response && err.response.data && err.response.data.message ? err.response.data.message : (err.message || 'OTP verify error');
                        return res.status(400).json({ message: `OTP verify failed: ${msg}` });
                    }
                }
                update.email = emailNorm;
        }

        // Allow updating firstname/lastname if provided (optional)
        if (firstname !== undefined || lastname !== undefined) {
            update.fullname = req.user.fullname || {};
            if (firstname !== undefined) update.fullname.firstname = firstname;
            if (lastname !== undefined) update.fullname.lastname = lastname;
        }

        const user = await userModel.findByIdAndUpdate(req.user._id, update, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('updateProfile error', error);
        return res.status(500).json({ error: error.message });
    }
}

module.exports.changePassword = async (req, res, next) => {
    try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            if (!currentPassword || !newPassword || typeof confirmPassword === 'undefined') return res.status(400).json({ message: 'Missing password fields' });
            if (newPassword !== confirmPassword) return res.status(400).json({ message: 'passwords dont match' });
            if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
            // require at least one digit and one special character
            const strongRe = /(?=.*\d)(?=.*[^A-Za-z0-9])/;
            if (!strongRe.test(newPassword)) return res.status(400).json({ message: 'New password must contain at least one number and one special character' });

        // fetch user with password
        const user = await userModel.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const match = await user.comparePassword(currentPassword);
        if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

        const hashed = await userModel.hashPassword(newPassword);
        user.password = hashed;
        // Optionally clear active tokens so other sessions are logged out
        try { user.activeTokens = []; } catch (e) {}
        await user.save();

        // Blacklist current token (if provided) so it cannot be used again
        try {
            const blacklistTokenModel = require('../models/blacklistToken.model');
            const token = req.cookies && req.cookies.token ? req.cookies.token : (req.headers.authorization && req.headers.authorization.split(' ')[1] ? req.headers.authorization.split(' ')[1] : null);
            if (token) {
                try {
                    await blacklistTokenModel.create({ token });
                } catch (e) {}
            }
            // clear cookie so browser no longer sends it
            try { res.clearCookie('token'); } catch (e) {}
        } catch (e) {}

        // instruct client to force logout
        return res.status(200).json({ message: 'Password changed successfully', logout: true });
    } catch (err) {
        console.error('changePassword error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.deleteAccount = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.email) return res.status(401).json({ message: 'Unauthorized' });

        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'OTP code is required' });

        const OTP_SERVER = process.env.OTP_SERVER_URL || 'http://localhost:5001';
        // verify OTP with OTP service
        try {
            const resp = await axios.post(`${OTP_SERVER}/api/otp/verify`, { email: user.email, code }, { headers: { 'Content-Type': 'application/json' } });
            if (!resp.data || !resp.data.success) {
                return res.status(400).json({ message: 'OTP verification failed' });
            }
        } catch (err) {
            const msg = err.response && err.response.data && err.response.data.message ? err.response.data.message : (err.message || 'OTP verify error');
            return res.status(400).json({ message: `OTP verify failed: ${msg}` });
        }

        // delete user
        try {
            await userModel.findByIdAndDelete(user._id);
        } catch (err) {
            return res.status(500).json({ message: 'Failed to delete account' });
        }

        // blacklist current token and clear cookie if present
        try {
            const token = req.cookies && req.cookies.token ? req.cookies.token : (req.headers.authorization && req.headers.authorization.split(' ')[1] ? req.headers.authorization.split(' ')[1] : null);
            if (token) {
                try { await blacklistTokenModel.create({ token }); } catch (e) {}
            }
            try { res.clearCookie('token'); } catch (e) {}
        } catch (e) {}

        return res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
        console.error('deleteAccount error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}