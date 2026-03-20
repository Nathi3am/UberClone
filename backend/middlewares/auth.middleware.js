const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const blacklistTokenModel = require('../models/blacklistToken.model');
const captainModel = require('../models/captain.model');


module.exports.authUser = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token: token });
    if (isBlacklisted) {
        res.status(401).json({ message: 'Unauthorized, Token expired!!' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id);
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports.authCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const isBlacklisted = await blacklistTokenModel.findOne({ token: token });
    if (isBlacklisted) {
        res.status(401).json({ message: 'Unauthorized, Token expired!!' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // //console.log("decoded ", decoded);
        const captain = await captainModel.findById(decoded._id);
        if (!captain) return res.status(404).json({ message: 'Captain not found' });
        if (captain.isSuspended) return res.status(403).json({ message: 'Your account has been suspended. Please wait for admin approval.' });
        // Enforce single active session: driver must present matching session token in headers
        // Expected header: x-session-token
        const sessionHeader = (req.headers['x-session-token'] || req.headers['x-device-token'] || '').toString();
        // If captain has an activeSessionToken set, it must match the header
        if (captain.activeSessionToken) {
            if (!sessionHeader || sessionHeader !== String(captain.activeSessionToken)) {
                try {
                    console.warn('[auth] session token mismatch', {
                        captainId: String(captain._id),
                        sessionHeader: sessionHeader || null,
                        activeSessionToken: captain.activeSessionToken ? String(captain.activeSessionToken) : null
                    });
                } catch (e) {}
                return res.status(401).json({ message: 'Session expired. Your account is now active on another device.' });
            }
        }
        req.captain = captain;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}