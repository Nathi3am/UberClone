const captainModel = require('../models/captain.model');
const captainSerivce = require('../services/captain.service');
const { validationResult } = require('express-validator');
const blacklistTokenModel = require('../models/blacklistToken.model');
const { uploadToCloudinary } = require('../config/cloudinary');


module.exports.registerCaptain = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { fullname, email, password, vehicle } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;

        const isCaptainAlreadyExist = await captainModel.findOne({ email: emailNorm });
        if (isCaptainAlreadyExist) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        // prevent using an email that already belongs to a regular user
        try {
            const userModel = require('../models/user.model');
            const existsInUser = await userModel.findOne({ email: emailNorm });
            if (existsInUser) return res.status(400).json({ message: 'Email already exists' });
        } catch (e) {}

        // prevent duplicate vehicle plates
        try {
                if (vehicle && vehicle.plate) {
                    // normalize plate: trim and uppercase
                    const plateRaw = String(vehicle.plate || '').trim();
                    const plateNorm = plateRaw.toUpperCase();
                    // case-insensitive check for existing plate
                    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const dup = await captainModel.findOne({ 'vehicle.plate': { $regex: `^${escapeRegex(plateNorm)}$`, $options: 'i' } });
                    if (dup) return res.status(400).json({ error: 'vehicle_plate_taken', message: 'This vehicle plate is already registered.' });
                    // ensure we store normalized plate
                    vehicle.plate = plateNorm;
                }
        } catch (e) {}

        const hashedPassword = await captainModel.hashPassword(password);

        const captain = await captainSerivce.createCaptain({
            firstname: fullname.firstname,
            lastname: fullname.lastname,
            email: emailNorm,
            password: hashedPassword,
            color: vehicle.color,
            plate: vehicle.plate,
            capacity: vehicle.capacity,
            vehicleType: vehicle.vehicleType,
            make: vehicle.make || vehicle.brand || null,
            year: vehicle.year || null,
            brand: vehicle.brand || vehicle.make || null
        });
        // If a profile image was uploaded during registration (multipart/form-data)
        try {
            if (req.file && req.file.buffer) {
                const result = await uploadToCloudinary(req.file.buffer, 'profile-images');
                captain.profileImage = result.secure_url;
            }
            captain.isApproved = false;
            await captain.save();
        } catch (e) {}
        return res.status(201).json({ message: 'Thank you for joining VexoMove. Your details are under review and awaiting admin approval. After approval, you may sign in.' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.loginCaptain = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
        const error = validationResult(req);
        if (!error.isEmpty()) {
            return res.status(400).json({ error: error.array() });
        }

        const captain = await captainModel.findOne({ email: emailNorm });
        // //console.log(captain);
        if (!captain) {
            return res.status(404).json({ message: 'Captain not found' });
        }
        if (!captain.isApproved) {
            return res.status(403).json({ message: 'Your account is under review. Please wait for admin approval.' });
        }
        if (captain.isSuspended) {
            return res.status(403).json({ message: 'Your account has been suspended. Please wait for admin approval.' });
        }
        const isMatch = await captain.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        const token = captain.generateAuthToken();
            // persist issued token so admin can blacklist on suspend
            try {
                captain.activeTokens = captain.activeTokens || [];
                captain.activeTokens.push(token);
                // create a single-device session token and persist
                const crypto = require('crypto');
                const sessionToken = (crypto.randomBytes ? crypto.randomBytes(24).toString('hex') : (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))));
                captain.activeSessionToken = sessionToken;
                await captain.save();
                res.cookie('token', token);
                return res.status(200).json({ token, deviceToken: sessionToken, captain });
            } catch (e) {
                try { res.cookie('token', token); } catch (ee) {}
                return res.status(200).json({ token, captain });
            }
    } catch (error) {
        console.error('[login] captain login error', error && error.message ? error.message : error);
        return res.status(503).json({ message: 'Login service temporarily unavailable. Please try again.' });
    }

}

module.exports.getCaptainProfile = async (req, res, next) => {
    // //console.log(req.captain);
    return res.status(200).json({ captain: req.captain });
}

module.exports.logoutCaptain = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    const blackToken = await blacklistTokenModel.create({ token });
    blackToken.save();
    // //console.log(token);
    res.clearCookie('token');
    try {
        // remove token from captain.activeTokens if available
        const captainId = req.captain && req.captain._id;
        if (captainId && token) {
            await captainModel.findByIdAndUpdate(captainId, { $pull: { activeTokens: token } });
        }
        // clear session token, go offline, and wipe FCM tokens so no push reaches a logged-out device
        try {
            if (captainId) {
                await captainModel.findByIdAndUpdate(captainId, {
                    $set: {
                        activeSessionToken: null,
                        isOnline: false,      // exclude from ride broadcast queries
                        status: 'inactive',   // belt-and-suspenders guard
                        pushTokens: []        // remove all FCM tokens — re-registered on next login
                    }
                });
            }
        } catch (e) {}
    } catch (e) {}
    return res.status(200).json({ message: 'Logged out' });
}

module.exports.savePushToken = async (req, res, next) => {
    try {
        const pushToken = typeof req.body.pushToken === 'string' ? req.body.pushToken.trim() : '';
        if (!pushToken) {
            return res.status(400).json({ message: 'pushToken is required' });
        }

        console.log(`[push-token] Saving FCM token for captain ${req.captain._id}: ${pushToken.substring(0, 20)}...`);

        await captainModel.findByIdAndUpdate(
            req.captain._id,
            { $addToSet: { pushTokens: pushToken } },
            { new: true }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[push-token] Failed to save push token:', error.message);
        return res.status(500).json({ message: 'Failed to save push token' });
    }
}

module.exports.removePushToken = async (req, res, next) => {
    try {
        const pushToken = (typeof req.body.pushToken === 'string' && req.body.pushToken.trim()) || (typeof req.query.pushToken === 'string' && req.query.pushToken.trim());
        if (!pushToken) {
            return res.status(400).json({ message: 'pushToken is required' });
        }

        console.log(`[push-token] Removing FCM token for captain ${req.captain._id}: ${pushToken.substring(0, 20)}...`);

        await captainModel.findByIdAndUpdate(
            req.captain._id,
            { $pull: { pushTokens: pushToken } },
            { new: true }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[push-token] Failed to remove push token:', error && error.message ? error.message : error);
        return res.status(500).json({ message: 'Failed to remove push token' });
    }
}

module.exports.updateCaptainProfile = async (req, res, next) => {
    try {
        const { firstname, lastname, phone, carBrand, carModel, carColor, numberPlate, carYear, vehicleType, vehicleCapacity, licenseNumber } = req.body;
        const captainId = req.captain._id;

        const updateData = {};
        
        if (firstname || lastname) {
            updateData.fullname = {
                firstname: firstname || req.captain.fullname.firstname,
                lastname: lastname || req.captain.fullname.lastname
            };
        }

        if (phone) updateData.phone = phone;

        if (carBrand || carModel || carColor || numberPlate || carYear || vehicleType || typeof vehicleCapacity !== 'undefined') {
            // if plate provided, ensure it's not used by another captain
            if (numberPlate) {
                try {
                    const plateRaw = String(numberPlate || '').trim();
                    const plateNorm = plateRaw.toUpperCase();
                    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const existing = await captainModel.findOne({ 'vehicle.plate': { $regex: `^${escapeRegex(plateNorm)}$`, $options: 'i' } });
                    if (existing && String(existing._id) !== String(captainId)) {
                        return res.status(400).json({ error: 'vehicle_plate_taken', message: 'This vehicle plate is already registered.' });
                    }
                    // normalize the plate before saving
                    numberPlate = plateNorm;
                } catch (e) {}
            }
            updateData.vehicle = {
                brand: carBrand || req.captain.vehicle.brand,
                model: carModel || req.captain.vehicle.model,
                color: carColor || req.captain.vehicle.color,
                plate: numberPlate || req.captain.vehicle.plate,
                capacity: (typeof vehicleCapacity !== 'undefined' && vehicleCapacity !== null && vehicleCapacity !== '') ? vehicleCapacity : req.captain.vehicle.capacity,
                year: carYear || req.captain.vehicle.year,
                vehicleType: vehicleType || req.captain.vehicle.vehicleType
            };
        }

        // persist license number if provided
        if (typeof licenseNumber !== 'undefined') {
            updateData.license = {
                number: licenseNumber || (req.captain.license && req.captain.license.number) || null
            };
        }

        const updatedCaptain = await captainModel.findByIdAndUpdate(captainId, updateData, { new: true });
        return res.status(200).json({ message: 'Profile updated successfully', captain: updatedCaptain });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.uploadProfileImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const captainId = req.captain._id;
        const result = await uploadToCloudinary(req.file.buffer, 'profile-images');
        const imageUrl = result.secure_url;

        const updatedCaptain = await captainModel.findByIdAndUpdate(
            captainId,
            { profileImage: imageUrl },
            { new: true }
        );

        return res.status(200).json({ 
            message: 'Profile image uploaded successfully', 
            imageUrl,
            captain: updatedCaptain 
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.uploadVehicleImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const captainId = req.captain._id;
        const result = await uploadToCloudinary(req.file.buffer, 'vehicle-images');
        const imageUrl = result.secure_url;

        const updatedCaptain = await captainModel.findByIdAndUpdate(
            captainId,
            { $set: { 'vehicle.image': imageUrl } },
            { new: true }
        );

        return res.status(200).json({
            message: 'Vehicle image uploaded successfully',
            imageUrl,
            captain: updatedCaptain
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.goOnline = async (req, res, next) => {
    try {
        const captainId = req.captain._id;
        const updated = await captainModel.findByIdAndUpdate(captainId, { isOnline: true }, { new: true });
        return res.status(200).json({ success: true, captain: updated });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.goOffline = async (req, res, next) => {
    try {
        const captainId = req.captain._id;
        const updated = await captainModel.findByIdAndUpdate(captainId, { isOnline: false }, { new: true });
        return res.status(200).json({ success: true, captain: updated });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.getAvailableDrivers = async (req, res, next) => {
    try {
        const drivers = await captainModel.find({ isOnline: true });
        return res.status(200).json(drivers);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || typeof confirmPassword === 'undefined') return res.status(400).json({ message: 'Missing password fields' });
        if (newPassword !== confirmPassword) return res.status(400).json({ message: 'passwords dont match' });
        if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
        const strongRe = /(?=.*\d)(?=.*[^A-Za-z0-9])/;
        if (!strongRe.test(newPassword)) return res.status(400).json({ message: 'New password must contain at least one number and one special character' });

        // fetch captain with password
        const captain = await captainModel.findById(req.captain._id).select('+password');
        if (!captain) return res.status(404).json({ message: 'Captain not found' });

        const match = await captain.comparePassword(currentPassword);
        if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

        const hashed = await captainModel.hashPassword(newPassword);
        captain.password = hashed;
        try { captain.activeTokens = []; } catch (e) {}
        await captain.save();

        // Blacklist current token (if provided)
        try {
            const token = req.cookies && req.cookies.token ? req.cookies.token : (req.headers.authorization && req.headers.authorization.split(' ')[1] ? req.headers.authorization.split(' ')[1] : null);
            if (token) {
                try { await blacklistTokenModel.create({ token }); } catch (e) {}
            }
            try { res.clearCookie('token'); } catch (e) {}
        } catch (e) {}

        return res.status(200).json({ message: 'Password changed successfully', logout: true });
    } catch (err) {
        console.error('captain changePassword error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Return driver stats for captain dashboard (single source of truth)
module.exports.getStats = async (req, res) => {
    try {
        const captainId = req.captain && req.captain._id;
        if (!captainId) return res.status(401).json({ message: 'Unauthorized' });

        const Ride = require('../models/ride.model');
        const driver = await captainModel.findById(captainId).lean();

        let DateTime = null;
        try {
            DateTime = require('luxon').DateTime;
        } catch (e) {
            // luxon not installed — we'll fall back to plain JS Date logic below
            DateTime = null;
        }

        // timezone can be provided via query `?tz=Africa/Johannesburg` or header `x-timezone`
        const tz = req.query.tz || req.headers['x-timezone'] || undefined;
        let todayStart, weekStart;
        try {
            if (DateTime && tz) {
                todayStart = DateTime.now().setZone(tz).startOf('day').toJSDate();
                weekStart = DateTime.now().setZone(tz).minus({ days: 7 }).startOf('day').toJSDate();
            } else {
                todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - 7);
                weekStart.setHours(0,0,0,0);
            }
        } catch (e) {
            todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0,0,0,0);
        }

        const completedRides = await Ride.find({ captain: captainId, status: 'completed' }).lean();

        const isAfter = (d, ref) => {
            if (!d) return false;
            try { return new Date(d) >= ref; } catch (e) { return false; }
        };

        const todayRides = completedRides.filter(r => isAfter(r.completedAt || r.createdAt, todayStart));
        const weekRides = completedRides.filter(r => isAfter(r.completedAt || r.createdAt, weekStart));

        const sum = (arr, field) => arr.reduce((acc, r) => acc + (Number(r[field] || 0)), 0);

        const todayEarnings = sum(todayRides, 'driverEarnings');
        const todayCommission = sum(todayRides, 'platformCommission');
        const weeklyEarnings = sum(weekRides, 'driverEarnings');
        const totalEarnings = sum(completedRides, 'driverEarnings');
        // compute trips completed today using a DB count with timezone-aware start
        let tripsToday = 0;
        try {
            tripsToday = await Ride.countDocuments({
                captain: captainId,
                status: 'completed',
                $or: [
                    { completedAt: { $gte: todayStart } },
                    { createdAt: { $gte: todayStart } }
                ]
            });
        } catch (e) {
            // fallback to in-memory count if DB count fails
            tripsToday = todayRides.length;
        }
        const avgFare = (completedRides.length > 0) ? (sum(completedRides, 'fare') / completedRides.length) : 0;

        const completionRate = (driver && typeof driver.completionRate === 'number') ? driver.completionRate : 100;
        // compute weekly average earnings per day (over last 7 days)
        const weeklyAverageEarnings = (Number(weeklyEarnings) || 0) / 7;

        // compute daily average earnings: average of per-day totals across days with activity
        const perDayTotals = [];
        try {
            if (DateTime) {
                const base = DateTime.fromJSDate(weekStart).setZone(tz || DateTime.local().zoneName).startOf('day');
                for (let i = 0; i < 7; i++) {
                    const dayStart = base.plus({ days: i }).toJSDate();
                    const dayEnd = base.plus({ days: i + 1 }).toJSDate();
                    const dayRides = weekRides.filter(r => {
                        const d = new Date(r.completedAt || r.createdAt);
                        return d >= dayStart && d < dayEnd;
                    });
                    const dayTotal = dayRides.reduce((s, r) => s + (Number(r.driverEarnings || 0)), 0);
                    perDayTotals.push(dayTotal);
                }
            } else {
                // JS Date fallback: iterate days from weekStart
                for (let i = 0; i < 7; i++) {
                    const dayStart = new Date(weekStart);
                    dayStart.setDate(weekStart.getDate() + i);
                    dayStart.setHours(0,0,0,0);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setDate(dayStart.getDate() + 1);
                    const dayRides = weekRides.filter(r => {
                        const d = new Date(r.completedAt || r.createdAt);
                        return d >= dayStart && d < dayEnd;
                    });
                    const dayTotal = dayRides.reduce((s, r) => s + (Number(r.driverEarnings || 0)), 0);
                    perDayTotals.push(dayTotal);
                }
            }
        } catch (e) {
            // on error, fallback to simple division — leave perDayTotals empty
        }

        const nonZeroDays = perDayTotals.filter(v => v > 0).length || 0;
        const sumPerDay = perDayTotals.reduce((s, v) => s + v, 0);
        const dailyAverageEarnings = nonZeroDays > 0 ? (sumPerDay / nonZeroDays) : 0;
        // compute outstanding platform commission for CASH rides that are not yet paid
        // Use stored `platformCommission` when available; otherwise approximate using settings.commissionRate (default 20%)
        let owePlatform = 0;
        try {
            let commissionRateDecimal = 0.20;
            try {
                const s = await require('../models/settings.model').findOne().catch(() => null);
                if (s && typeof s.commissionRate === 'number') commissionRateDecimal = Number(s.commissionRate) / 100;
            } catch (e) { commissionRateDecimal = 0.20; }

            owePlatform = completedRides.reduce((acc, r) => {
                const isCash = (r.paymentMethod || 'card') === 'cash';
                const paid = (r.isPaid === true) || (r.paymentStatus === 'paid');
                if (!isCash || paid) return acc;
                const stored = Number(r.platformCommission || 0);
                if (stored && stored > 0) return acc + stored;
                const fareVal = Number(r.totalFare || r.fare || 0) || 0;
                const approx = Number((fareVal * commissionRateDecimal).toFixed(2));
                return acc + approx;
            }, 0);
        } catch (e) { owePlatform = 0; }

        const storedWalletBalance = Number((driver && driver.wallet && typeof driver.wallet.balance === 'number') ? driver.wallet.balance : (driver && driver.walletBalance ? driver.walletBalance : 0));

        const driverPayout = Number((storedWalletBalance - Number(owePlatform || 0)).toFixed(2));

        return res.json({
            // `availableForPayout` is the canonical amount drivers can request payout for.
            availableForPayout: storedWalletBalance,
            walletBalance: storedWalletBalance,
            driverPayout,
            todayEarnings: Number(todayEarnings),
            todayCommission: Number(todayCommission),
            todayNet: Number(todayEarnings),
            weeklyEarnings: Number(weeklyEarnings),
            weeklyAverageEarnings: Number(Number(weeklyAverageEarnings).toFixed(2)),
            dailyAverageEarnings: Number(Number(dailyAverageEarnings).toFixed(2)),
            owePlatform: Number(Number(owePlatform).toFixed(2)),
            totalEarnings: Number(totalEarnings),
            tripsToday: Number(tripsToday),
            avgFare: Number(avgFare),
            rating: Number(driver && driver.rating ? driver.rating : 5),
            completionRate: Number(completionRate)
        });
    } catch (err) {
        console.error('getStats error:', err);
        return res.status(500).json({ message: 'Stats error' });
    }
};