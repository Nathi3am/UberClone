const rideModel = require("../models/ride.model");
const mapService = require("../services/maps.service");
const Settings = require('../models/settings.model');
const crypto = require('crypto');
const userModel = require("../models/user.model"); // Add this line to import the user model
const captainModel = require("../models/captain.model");
const { getIO } = require('../socket');

// First, define helper functions
function getOtp(num) {
    function generateOtp(num) {
        return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
    }
    return generateOtp(num);
}

// Simplified fare calculator using maps service
const mapsService = require("./maps.service");

module.exports.getFare = async (pickup, dropoff) => {
    if (!pickup || !dropoff) {
        throw new Error('pickup and dropoff are required');
    }

    const distanceKm = await mapsService.getDistance(pickup, dropoff);
    const calculateFare = require('../utils/calculateFare');
    const fare = await calculateFare(distanceKm);

    return {
        distanceKm,
        fare: Number(fare)
    };
};

// Then define and export createRide
module.exports.createRide = async ({ user, pickup, destination, vehicle }) => {
    if (!user || !pickup || !destination || !vehicle) {
        throw new Error('All fields are required');
    }

    try {
        const latestUser = await userModel.findById(user._id); // Fetch the latest user data
        const fares = await getFare(pickup, destination);
        const ride = new rideModel({
            user: latestUser,
            pickup: pickup,
            destination: destination,
            otp: getOtp(6),
            fare: fares && fares.fare ? fares.fare : 0,
            distance: fares && fares.distanceKm ? fares.distanceKm : null,
            vehicle: vehicle
        });

        await ride.save();
        return ride;
    } catch (error) {
        console.error('Error creating ride:', error);
        throw new Error('Failed to create ride: ' + error.message);
    }
};

module.exports.confirmRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'accepted',
        captain: captain._id
    });

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');
    //console.log("Ride id of new ride is ", rideId);

    if (!ride) {
        throw new Error('Ride not found');
    }

    // Fetch the latest user data
    const latestUser = await userModel.findById(ride.user._id);
    ride.user = latestUser;

    // Emit the ride-confirmed event to the user
    // sendMessageToSocketId(ride.user.socketId, 'ride-confirmed', ride);

    return ride;
};

module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    // OTP is optional. If an OTP exists on the ride record, require it; else allow captain to start without OTP.
    if (ride.otp) {
        if (!otp) throw new Error('OTP required');
        if (ride.otp !== otp) throw new Error('Invalid OTP');
    }

    // Fetch the latest user data
    const latestUser = await userModel.findById(ride.user._id);
    ride.user = latestUser;

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    });

    return ride;
};

module.exports.endRide = async ({ rideId, captain }) => {
    if (!rideId) {
        throw new Error('Ride id is required');
    }

    const ride = await rideModel.findOne({
        _id: rideId,
        captain: captain._id
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }
    // Allow completion from several possible statuses
    if (!['ongoing', 'started', 'accepted', 'arriving'].includes(ride.status)) {
        throw new Error('Ride not in a completable state');
    }

    // mark ride completed and set completedAt
    ride.status = 'completed';
    ride.completedAt = new Date();
    await ride.save();

    // Fetch latest related records
    const latestUser = await userModel.findById(ride.user._id);
    const latestCaptain = await captainModel.findById(ride.captain._id);

    // ADD MONEY TO DRIVER TOTAL
    try {
        const canonicalFare = Number(ride.totalFare || ride.fare || ride.price || 0) || 0;
        // compute commission from settings
        let commissionRateDecimal = 0.20;
        try {
            const s = await Settings.findOne();
            if (s && typeof s.commissionRate === 'number') commissionRateDecimal = Number(s.commissionRate) / 100;
        } catch (e) { commissionRateDecimal = 0.20; }

        const platformCommission = Number((canonicalFare * commissionRateDecimal).toFixed(2));
        const driverEarnings = Number((canonicalFare - platformCommission).toFixed(2));

        // persist computed values on ride (helpful for auditing)
        try {
            ride.platformCommission = platformCommission;
            ride.driverEarnings = driverEarnings;
            await ride.save();
        } catch (e) {}

        latestCaptain.totalEarnings = (latestCaptain.totalEarnings || 0) + Number(driverEarnings || 0);
        // update nested wallet object if present
        try {
            latestCaptain.wallet = latestCaptain.wallet || {};
            // always record total earned (fare) for analytics
            latestCaptain.wallet.totalEarned = (latestCaptain.wallet.totalEarned || 0) + Number(canonicalFare || 0);

            const isCash = (ride.paymentMethod || 'card') === 'cash';
            if (isCash) {
                // For CASH rides, platform commission is owed to platform; accumulate commission but DO NOT add driver's earnings to available balance
                latestCaptain.wallet.totalCommission = (latestCaptain.wallet.totalCommission || 0) + Number(platformCommission || 0);
                // legacy walletBalance should not increase for cash until admin marks payout
            } else {
                // For non-cash (card) rides, driver receives immediate available payout
                latestCaptain.wallet.balance = (latestCaptain.wallet.balance || 0) + Number(driverEarnings || 0);
                // maintain backward compatibility field for available balance
                latestCaptain.walletBalance = (latestCaptain.walletBalance || 0) + Number(driverEarnings || 0);
            }
        } catch (e) {}
        await latestCaptain.save();

            // Emit consolidated wallet and owed updates
            try {
                const io = getIO && getIO();
                if (io && latestCaptain && latestCaptain._id) {
                    const available = (latestCaptain.wallet && typeof latestCaptain.wallet.balance === 'number') ? latestCaptain.wallet.balance : (latestCaptain.walletBalance || 0);
                    // compute per-driver owed (prefer stored wallet.totalCommission, fallback to aggregation)
                    let owedToPlatform = Number(latestCaptain.wallet.totalCommission || 0) || 0;
                    try {
                        if (!owedToPlatform) {
                            const agg = await rideModel.aggregate([
                                { $match: { captain: latestCaptain._id, paymentMethod: 'cash', isPaid: { $ne: true }, paymentStatus: { $ne: 'paid' } } },
                                { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", { $multiply: ["$fare", 0.2] }] } } } }
                            ]).exec();
                            owedToPlatform = (agg && agg[0] && agg[0].total) ? Number(agg[0].total) : owedToPlatform;
                        }
                    } catch (err) {
                        // ignore aggregation errors, keep owedToPlatform as computed from wallet
                    }

                    const driverPayout = Number((available - owedToPlatform).toFixed(2));

                    try { io.to(latestCaptain._id.toString()).emit('wallet-updated', { driverId: latestCaptain._id.toString(), wallet: latestCaptain.wallet, availableForPayout: available, owedToPlatform, driverPayout }); } catch (e) {}
                    try { io.to(`captain_${latestCaptain._id}`).emit('wallet-updated', { driverId: latestCaptain._id.toString(), wallet: latestCaptain.wallet, availableForPayout: available, owedToPlatform, driverPayout }); } catch (e) {}
                    try { io.to(latestCaptain._id.toString()).emit('ride-completed', ride); } catch (e) {}

                    // compute global owed-to-platform total and notify admins
                    try {
                        const Ride = require('../models/ride.model');
                        const globalRes = await Ride.aggregate([
                            { $match: { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
                            { $group: { _id: null, total: { $sum: { $ifNull: ['$platformCommission', 0] } } } }
                        ]);
                        const totalOwed = (globalRes && globalRes[0] && globalRes[0].total) ? globalRes[0].total : 0;
                        try { io.to('admins').emit('owed-updated', { driverId: latestCaptain._id.toString(), owedToPlatform, totalOwed: Number(totalOwed || 0), driverPayout }); } catch (e) {}
                    } catch (e) {
                        // ignore admin notify errors
                    }
                }
            } catch (e) {}
    } catch (err) {
        console.error('Failed updating captain earnings:', err && err.message ? err.message : err);
    }

    // CLEAR ACTIVE RIDE FROM USER
    try {
        if (latestUser) {
            latestUser.activeRide = null;
            await latestUser.save();
        }
    } catch (err) {
        console.error('Failed clearing user activeRide:', err && err.message ? err.message : err);
    }

    // After marking completed, add a summary to the captain's pastRides
    try {
        const summary = {
            rideId: ride._id,
            user: ride.user?._id || null,
            pickupAddress: ride.pickupAddress || ride.pickup || ride.pickupAddress,
            dropAddress: ride.dropAddress || ride.destination || ride.dropAddress,
            pickupCoords: ride.pickupCoords || ride.pickup_coords || (ride.pickup && ride.pickupCoords) || {},
            dropCoords: ride.dropCoords || ride.drop_coords || (ride.destination && ride.dropCoords) || {},
            distance: ride.distance || ride.distanceKm || null,
            price: ride.price || ride.fare || null,
            durationSeconds: (ride.duration && (ride.duration.value || ride.durationSeconds)) || ride.durationSeconds || null,
            etaDisplay: ride.etaDisplay || null,
            locationHistory: ride.locationHistory || [],
            completedAt: ride.completedAt || new Date()
        };

        await captainModel.findByIdAndUpdate(captain._id, { $push: { pastRides: summary } });
    } catch (err) {
        // don't block completion if we can't write history
        console.error('Failed adding past ride to captain:', err && err.message ? err.message : err);
    }

    return await rideModel.findById(ride._id).populate('user').populate('captain');
};