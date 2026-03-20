const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const { sendMessageToSocketId } = require('../socket');
const rideModel = require('../models/ride.model');
const Captain = require('../models/captain.model');
const User = require('../models/user.model');
const Settings = require('../models/settings.model');
const calculateFare = require('../utils/calculateFare');
const { sendPush } = require('../services/notification.service');

module.exports.createRide = async (req, res) => {

    console.log('Incoming ride body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // normalize incoming fields (support both old and new payloads)
    const pickupAddress = req.body.pickupAddress || req.body.pickup || req.body.pickup_address;
    const dropAddress = req.body.dropAddress || req.body.destination || req.body.drop_address || req.body.dropAddress;
    const pickupCoords = req.body.pickupCoords || req.body.pickup_coords || req.body.pickupLocation || {};
    const dropCoords = req.body.dropCoords || req.body.drop_coords || req.body.dropLocation || {};
    // Accept either `distanceInKm`, `distance`, or `distanceKm` from client — prefer explicit `distanceInKm`
    const distanceInKmProvided = (typeof req.body.distanceInKm === 'number' || (typeof req.body.distanceInKm === 'string' && req.body.distanceInKm.trim() !== '')) ? req.body.distanceInKm : undefined;
    const legacyDistance = req.body.distance || req.body.distanceKm || 0;

    try {

        if (!pickupAddress || !dropAddress) {
            return res.status(400).json({ message: 'Missing ride data' });
        }

        // Compute accurate distance and price server-side when possible
        // If client supplied an explicit distance (distanceInKm), use it verbatim and DO NOT recalculate.
        let distanceKM = (typeof distanceInKmProvided !== 'undefined') ? Number(distanceInKmProvided) : Number(legacyDistance) || 0;

        // Only attempt to compute route distance when no distance was supplied by the client
        if ((typeof distanceInKmProvided === 'undefined') && (!distanceKM || distanceKM === 0) && pickupCoords && dropCoords && pickupCoords.lat && dropCoords.lat) {
            try {
                const directions = await mapService.getDirections(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
                const leg = directions && directions.distance ? directions.distance : (directions && directions.raw && directions.raw.routes && directions.raw.routes[0] && directions.raw.routes[0].legs && directions.raw.routes[0].legs[0] ? directions.raw.routes[0].legs[0] : null);
                if (leg && leg.distance && typeof leg.distance.value === 'number') {
                    distanceKM = leg.distance.value / 1000;
                }
            } catch (err) {
                // fallback to Distance Matrix
                try {
                    const dm = await mapService.getDistance(pickupAddress, dropAddress);
                    if (typeof dm === 'number') distanceKM = dm;
                } catch (e) {
                    // leave as provided or 0
                }
            }
        }

        // Server-side fare calculation (single source of truth)
        // Use shared utils/calculateFare so estimate == saved fare
        let computedFare = 0;
        try {
            computedFare = await calculateFare(distanceKM || 0);
        } catch (e) {
            // fallback to a safe default if calculateFare fails
            let _settings = null;
            try { _settings = await Settings.findOne(); } catch (e2) { _settings = null; }
            const baseFromSettings = (_settings && typeof _settings.baseFare === 'number') ? _settings.baseFare : 20;
            const perKmFromSettings = (_settings && typeof _settings.pricePerKm === 'number') ? _settings.pricePerKm : 8;
            computedFare = Number((baseFromSettings + ((distanceKM || 0) * perKmFromSettings)).toFixed(2));
        }

        const totalFare = computedFare;
        const fare = computedFare; // canonical fare field used by frontend and driver popups

        // Apply passenger surcharge: for each passenger above 2, increase fare by 10% per passenger
        try {
            if (passengersProvided && Number(passengersProvided) > 2) {
                const extra = Number(passengersProvided) - 2;
                const multiplier = Math.pow(1.10, extra);
                const adj = Number((computedFare * multiplier).toFixed(2));
                computedFare = adj;
            }
        } catch (e) {}

        // Ensure totals reflect adjusted fare
        const adjustedTotalFare = computedFare;
        // keep canonical fields consistent
        // overwrite fare/totalFare values below when building rideData

        // compute fare breakdown fields using Settings for display only
        let settingsForBreakdown = null;
        try { settingsForBreakdown = await Settings.findOne(); } catch (e) { settingsForBreakdown = null; }
        const baseFare = (settingsForBreakdown && typeof settingsForBreakdown.baseFare === 'number') ? Number(settingsForBreakdown.baseFare) : 0;
        const distanceFare = Number((((distanceKM || 0) * ((settingsForBreakdown && typeof settingsForBreakdown.pricePerKm === 'number') ? settingsForBreakdown.pricePerKm : 0)) || 0).toFixed(2));

        // allow assigning a selected driver (captain) directly from the client
        const selectedDriverId = req.body.selectedDriverId || req.body.captain || req.body.driverId || null;
        const paymentMethod = req.body.paymentMethod || req.body.payment || 'card';
        // Accept passengers from client (passengers or passengerCount). Default to 1
        let passengersProvided = 1;
        try {
            if (typeof req.body.passengers !== 'undefined' && req.body.passengers !== null) passengersProvided = Number(req.body.passengers);
            else if (typeof req.body.passengerCount !== 'undefined' && req.body.passengerCount !== null) passengersProvided = Number(req.body.passengerCount);
            if (isNaN(passengersProvided) || passengersProvided < 1) passengersProvided = 1;
        } catch (e) { passengersProvided = 1; }
        // Enforce cash limit: disallow cash payment for rides with fare >= CASH_LIMIT
        const CASH_LIMIT = Number(process.env.CASH_LIMIT || 600); // currency units (e.g., R)
        // ensure authenticated user is present (avoid crash when auth middleware didn't set req.user)
        if (!req.user || !req.user._id) {
            console.error('createRide: missing req.user (unauthorized request). Body:', req.body);
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // If user requested cash but fare exceeds limit, reject and instruct client to use card
        if (paymentMethod === 'cash' && Number(totalFare || 0) >= CASH_LIMIT) {
            return res.status(400).json({ message: `Cash payment not allowed for fares of R${CASH_LIMIT} or more. Please use card.` });
        }

        const rideData = {
            user: req.user._id,
            pickupAddress,
            dropAddress,
            pickupCoords: pickupCoords || {},
            dropCoords: dropCoords || {},
            passengers: passengersProvided,
            distance: distanceKM,
            duration: null,
            baseFare: baseFare,
            distanceFare: distanceFare,
            totalFare: adjustedTotalFare,
            fare: adjustedTotalFare,
            paymentMethod: paymentMethod,
            paymentStatus: 'pending',
            isPaid: false,
            status: selectedDriverId ? 'pending' : 'searching',
            captain: selectedDriverId || undefined
        };

        const ride = new rideModel(rideData);
        await ride.save();
        console.log('Ride Fare Saved:', ride.fare);
        const pushNotifiedCaptainIds = new Set();

        const buildCaptainRidePushBody = async (rideDoc) => {
            const pickup = (rideDoc && rideDoc.pickupAddress) ? String(rideDoc.pickupAddress) : 'Pickup location available';
            const drop = (rideDoc && rideDoc.dropAddress) ? String(rideDoc.dropAddress) : 'Drop-off available';
            const dist = (rideDoc && typeof rideDoc.distance === 'number') ? `${rideDoc.distance.toFixed(1)} km` : '';
            const fareVal = rideDoc && (typeof rideDoc.totalFare === 'number' ? rideDoc.totalFare : rideDoc.fare);
            let earnings = '';
            if (typeof fareVal === 'number') {
                try {
                    const s = await Settings.findOne();
                    const rate = (s && typeof s.commissionRate === 'number') ? (s.commissionRate / 100) : 0.20;
                    const commission = Number((fareVal * rate).toFixed(2));
                    earnings = `R${(fareVal - commission).toFixed(2)}`;
                } catch (e) {
                    const commission = Number((fareVal * 0.20).toFixed(2));
                    earnings = `R${(fareVal - commission).toFixed(2)}`;
                }
            }
            const suffix = [dist, earnings].filter(Boolean).join(' • ');
            return suffix ? `${pickup} → ${drop} (${suffix})` : `${pickup} → ${drop}`;
        };

        const sendRideRequestPushToCaptain = async (captainDoc, rideDoc) => {
            try {
                if (!captainDoc) return;
                const captainId = captainDoc._id ? String(captainDoc._id) : null;
                if (captainId && pushNotifiedCaptainIds.has(captainId)) return;
                const tokens = Array.isArray(captainDoc.pushTokens) ? captainDoc.pushTokens : [];
                if (!tokens.length) return;

                await sendPush(
                    tokens,
                    'New Ride request',
                    await buildCaptainRidePushBody(rideDoc),
                    {
                        rideId: String((rideDoc && rideDoc._id) || (rideDoc && rideDoc.rideId) || ''),
                        type: 'new-ride-request',
                    }
                );

                if (captainId) {
                    pushNotifiedCaptainIds.add(captainId);
                }
            } catch (e) {
                // do not block ride creation on push errors
            }
        };

        const sendRideRequestPushToOnlineCaptains = async (rideDoc) => {
            try {
                const onlineCaptains = await Captain.find({
                    isApproved: true,
                    isOnline: true,
                    status: 'active',
                }).select('_id pushTokens socketId').lean();

                for (const captain of onlineCaptains) {
                    await sendRideRequestPushToCaptain(captain, rideDoc);
                }
            } catch (e) {
                // do not block ride creation on push errors
            }
        };

        // If a captain was pre-selected, notify only that captain's personal room (or socketId)
        try {
            if (selectedDriverId) {
                const rideWithCaptain = await rideModel.findById(ride._id).populate('user').populate('captain');
                const { getIO } = require('../socket');
                const io = getIO && getIO();
                // notify by captain socketId if available, else send to their room (captain id)
                try {
                    // legacy full object notification
                    if (rideWithCaptain && rideWithCaptain.captain && rideWithCaptain.captain.socketId) {
                        sendMessageToSocketId(rideWithCaptain.captain.socketId, { event: 'new-ride', data: rideWithCaptain });
                    } else if (io && io.to) {
                        io.to(selectedDriverId.toString()).emit('new-ride', rideWithCaptain);
                    }

                    // also send compact server-truth payload so driver popups always show the saved fare
                    // compute canonical driver-facing fare: prefer explicit base+distance breakdown
                    const computedCaptainFare = Number((rideWithCaptain && (Number(rideWithCaptain.baseFare || 0) + Number(rideWithCaptain.distanceFare || rideWithCaptain.totalFare || rideWithCaptain.fare || 0))) || 0);
                    // include pricePerKm and baseFare so client can recompute if needed
                    let captainPricePerKm = 0;
                    try {
                        const s = await Settings.findOne();
                        captainPricePerKm = (s && typeof s.pricePerKm === 'number') ? s.pricePerKm : 0;
                    } catch (e) { captainPricePerKm = 0; }

                    // compute driver earnings using Settings.commissionRate (do not persist)
                    let driverEarningsForEmit = computedCaptainFare;
                    let platformCommissionForEmit = 0;
                    try {
                        const s = await Settings.findOne();
                        const commissionRateDecimal = (s && typeof s.commissionRate === 'number') ? (s.commissionRate / 100) : 0.20;
                        platformCommissionForEmit = Number((computedCaptainFare * commissionRateDecimal).toFixed(2));
                        driverEarningsForEmit = Number((computedCaptainFare - platformCommissionForEmit).toFixed(2));
                    } catch (e) {
                        platformCommissionForEmit = Number((computedCaptainFare * 0.20).toFixed(2));
                        driverEarningsForEmit = Number((computedCaptainFare - platformCommissionForEmit).toFixed(2));
                    }

                    const compactForCaptain = {
                        _id: rideWithCaptain._id,
                        rideId: rideWithCaptain._id,
                        pickupAddress: rideWithCaptain.pickupAddress,
                        dropAddress: rideWithCaptain.dropAddress,
                        distance: rideWithCaptain.distance,
                        fare: computedCaptainFare,
                        driverEarnings: driverEarningsForEmit,
                        platformCommission: platformCommissionForEmit,
                        passengers: rideWithCaptain.passengers || passengersProvided,
                        pricePerKm: captainPricePerKm,
                        baseFare: (typeof rideWithCaptain.baseFare === 'number') ? rideWithCaptain.baseFare : 0
                    };
                    try {
                        // attach computed earnings to the full ride object for this emit (do not persist)
                        try {
                            rideWithCaptain.driverEarnings = driverEarningsForEmit;
                            rideWithCaptain.platformCommission = platformCommissionForEmit;
                        } catch (e) {}

                        // attach simple user fields so driver popup can display passenger name
                        try {
                            if (rideWithCaptain && rideWithCaptain.user) {
                                const u = rideWithCaptain.user;
                                rideWithCaptain.userName = (u.fullname && (u.fullname.firstname || u.fullname.lastname)) ? `${u.fullname.firstname || ''} ${u.fullname.lastname || ''}`.trim() : (u.name || u.email || 'Passenger');
                                rideWithCaptain.userProfileImage = u.profileImage || null;
                            }
                        } catch (e) {}

                        // send full ride object (server single source of truth)
                        if (rideWithCaptain && rideWithCaptain.captain && rideWithCaptain.captain.socketId) {
                            sendMessageToSocketId(rideWithCaptain.captain.socketId, { event: 'new-ride-request', data: rideWithCaptain });
                        } else if (io && io.to) {
                            io.to(selectedDriverId.toString()).emit('new-ride-request', rideWithCaptain);
                        }

                        await sendRideRequestPushToCaptain(rideWithCaptain && rideWithCaptain.captain, rideWithCaptain);
                    } catch (e) {}
                } catch (e) {
                    // ignore notify errors
                }
            }
        } catch (notifyCaptainErr) {
            // ignore
        }

        // emit to online captains room via socket helper (if available) using populated ride
        try {
            const rideWithUser = await rideModel.findById(ride._id).populate('user').populate('captain');
            const { getIO } = require('../socket');
            const io = getIO && getIO();
                if (io && io.to) {
                // ensure price/distance are present and formatted for clients
                    try {
                        // Prefer explicit breakdown if available: baseFare + distanceFare
                        const baseVal = Number(rideWithUser.baseFare || 0);
                        const distanceComponent = Number(rideWithUser.distanceFare || rideWithUser.totalFare || rideWithUser.fare || 0);
                        const fareVal = Number((baseVal + distanceComponent) || 0);
                        const distVal = rideWithUser.distance || 0;
                        // attach formatted fields and canonical totals
                        rideWithUser.fare = Number(fareVal);
                        rideWithUser.totalFare = Number(fareVal);
                        rideWithUser.fareDisplay = Number(fareVal).toFixed(2);
                        rideWithUser.distanceDisplay = Number(distVal).toFixed(2);

                        // attach simple user fields for driver UI convenience
                        try {
                            if (rideWithUser && rideWithUser.user) {
                                const u = rideWithUser.user;
                                rideWithUser.userName = (u.fullname && (u.fullname.firstname || u.fullname.lastname)) ? `${u.fullname.firstname || ''} ${u.fullname.lastname || ''}`.trim() : (u.name || u.email || 'Passenger');
                                rideWithUser.userProfileImage = u.profileImage || null;
                            }
                        } catch (e) {}

                    // Attach trip duration / ETA when possible (seconds)
                    try {
                        let durationSeconds = null;
                        const pcoords = (rideWithUser.pickupCoords || {});
                        const dcoords = (rideWithUser.dropCoords || {});
                        if (pcoords.lat && pcoords.lng && dcoords.lat && dcoords.lng) {
                            try {
                                const directions = await mapService.getDirections(pcoords.lat, pcoords.lng, dcoords.lat, dcoords.lng);
                                if (directions && directions.duration && typeof directions.duration.value === 'number') {
                                    durationSeconds = directions.duration.value;
                                }
                            } catch (dirErr) {
                                // ignore directions failure
                            }
                        }

                        // Fallback estimate based on distance (assume avg 40 km/h)
                        if (!durationSeconds) {
                            const fallbackSecs = Math.round(((distVal || 0) / 40) * 3600);
                            durationSeconds = fallbackSecs > 0 ? fallbackSecs : null;
                        }

                        if (durationSeconds) {
                            rideWithUser.duration = { value: durationSeconds };
                            rideWithUser.durationSeconds = durationSeconds;
                            // simple human-readable ETA like "36 min"
                            const mins = Math.round(durationSeconds / 60);
                            if (mins < 60) rideWithUser.etaDisplay = `${mins} min`;
                            else {
                                const hrs = Math.floor(mins / 60);
                                const rmins = mins % 60;
                                rideWithUser.etaDisplay = rmins === 0 ? `${hrs} hr` : `${hrs} hr ${rmins} min`;
                            }
                        }
                    } catch (attachErr) {
                        // ignore ETA attach errors
                    }
                } catch (e) {
                    // ignore formatting errors
                }

                // Build a compact payload that drivers should use (server-calculated fare)
                // include pricePerKm so clients can compute breakdowns consistently
                let pricePerKmVal = 0;
                try {
                    const settingsDoc = await Settings.findOne();
                    pricePerKmVal = (settingsDoc && typeof settingsDoc.pricePerKm === 'number') ? settingsDoc.pricePerKm : 0;
                } catch (e) {
                    pricePerKmVal = 0;
                }

                        // compute driver earnings for broadcast payload (do not persist)
                        const canonicalFare = (typeof rideWithUser.totalFare === 'number') ? rideWithUser.totalFare : (rideWithUser.fare || 0);
                        let platformCommissionBroadcast = 0;
                        let driverEarningsBroadcast = canonicalFare;
                        try {
                            const s = await Settings.findOne();
                            const commissionRateDecimal = (s && typeof s.commissionRate === 'number') ? (s.commissionRate / 100) : 0.20;
                            platformCommissionBroadcast = Number((canonicalFare * commissionRateDecimal).toFixed(2));
                            driverEarningsBroadcast = Number((canonicalFare - platformCommissionBroadcast).toFixed(2));
                        } catch (e) {
                            platformCommissionBroadcast = Number((canonicalFare * 0.20).toFixed(2));
                            driverEarningsBroadcast = Number((canonicalFare - platformCommissionBroadcast).toFixed(2));
                        }

                        const compactPayload = {
                            _id: rideWithUser._id,
                            rideId: rideWithUser._id,
                            pickupAddress: rideWithUser.pickupAddress,
                            dropAddress: rideWithUser.dropAddress,
                            distance: rideWithUser.distance,
                            fare: canonicalFare,
                            driverEarnings: driverEarningsBroadcast,
                            platformCommission: platformCommissionBroadcast,
                            passengers: rideWithUser.passengers || 1,
                            pricePerKm: pricePerKmVal,
                            baseFare: (typeof rideWithUser.baseFare === 'number') ? rideWithUser.baseFare : 0
                        };
                        // attach computed earnings to the full ride object so all emits carry server-calculated values
                        try {
                            rideWithUser.driverEarnings = driverEarningsBroadcast;
                            rideWithUser.platformCommission = platformCommissionBroadcast;
                        } catch (e) {}

                // Only broadcast to online captains if no specific driver was selected
                if (!selectedDriverId) {
                    console.log('Emitting new-ride to onlineCaptains for ride', rideWithUser._id);
                    // send full ride object as single source of truth
                    try { io.to('onlineCaptains').emit('new-ride', rideWithUser); } catch (e) {}
                    try { io.to('onlineCaptains').emit('new-ride-request', compactPayload); } catch (e) {}
                    await sendRideRequestPushToOnlineCaptains(rideWithUser);

                    // Also emit globally as a fallback for any captains that may not have joined the room
                    try { io.emit('new-ride', rideWithUser); } catch (e) {}
                    try { io.emit('new-ride-request', compactPayload); } catch (e) {}
                } else {
                    // already notified the selected driver above (but ensure selected driver gets full ride object)
                    try {
                        // attach computed earnings to full ride object for selected driver emit
                        try {
                            rideWithUser.driverEarnings = driverEarningsBroadcast;
                            rideWithUser.platformCommission = platformCommissionBroadcast;
                        } catch (e) {}
                        io.to(selectedDriverId.toString()).emit('new-ride-request', rideWithUser);
                    } catch (e) {}
                }
                }
        } catch (e) {
            // ignore io emit errors
        }

        // Attach transient driverEarnings/platformCommission to created ride response
        try {
            const canonicalFareResp = typeof ride.fare === 'number' ? ride.fare : (ride.totalFare || ride.price || 0);
            const sdoc = await Settings.findOne().catch(() => null);
            const commissionRateDecimalResp = (sdoc && typeof sdoc.commissionRate === 'number') ? (sdoc.commissionRate / 100) : 0.20;
            const platformCommissionResp = Number((canonicalFareResp * commissionRateDecimalResp).toFixed(2));
            const driverEarningsResp = Number((canonicalFareResp - platformCommissionResp).toFixed(2));
            // attach to response object (do not persist)
            try { ride = ride.toObject ? ride.toObject() : ride; } catch (e) {}
            ride.driverEarnings = driverEarningsResp;
            ride.platformCommission = platformCommissionResp;
        } catch (e) {
            // ignore attach errors
        }

        res.status(201).json(ride);

        // Optionally notify nearby captains if pickup coordinates provided
        try {
            if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
                const captainsInRadius = await mapService.getCaptainsInTheRadius(pickupCoords.lat, pickupCoords.lng, 2);
                const rideWithUser = await rideModel.findOne({ _id: ride._id }).populate('user');

                // prefetch settings once for nearby notifications
                let settingsForNearby = null;
                try { settingsForNearby = await Settings.findOne(); } catch (e) { settingsForNearby = null; }

                captainsInRadius.forEach((captain) => {
                    try {
                        if (selectedDriverId && String(captain._id) !== String(selectedDriverId)) {
                            return;
                        }

                        sendMessageToSocketId(captain.socketId, {
                            event: 'new-ride',
                            data: rideWithUser,
                        });
                    } catch (e) {}
                    try {
                        const canonicalFare = (typeof rideWithUser.totalFare === 'number') ? rideWithUser.totalFare : (rideWithUser.fare || 0);
                        let platformCommissionNearby = 0;
                        let driverEarningsNearby = canonicalFare;
                        try {
                            const s = settingsForNearby;
                            const commissionRateDecimal = (s && typeof s.commissionRate === 'number') ? (s.commissionRate / 100) : 0.20;
                            platformCommissionNearby = Number((canonicalFare * commissionRateDecimal).toFixed(2));
                            driverEarningsNearby = Number((canonicalFare - platformCommissionNearby).toFixed(2));
                        } catch (e) {
                            platformCommissionNearby = Number((canonicalFare * 0.20).toFixed(2));
                            driverEarningsNearby = Number((canonicalFare - platformCommissionNearby).toFixed(2));
                        }

                        const compactForCaptain = {
                            _id: rideWithUser._id,
                            rideId: rideWithUser._id,
                            pickupAddress: rideWithUser.pickupAddress,
                            dropAddress: rideWithUser.dropAddress,
                            distance: rideWithUser.distance,
                            fare: canonicalFare,
                            driverEarnings: driverEarningsNearby,
                            platformCommission: platformCommissionNearby
                        };
                        sendMessageToSocketId(captain.socketId, {
                            event: 'new-ride-request',
                            data: compactForCaptain,
                        });
                    } catch (e) {}

                    try {
                        sendRideRequestPushToCaptain(captain, rideWithUser);
                    } catch (e) {}
                });
            }
        } catch (notifyErr) {
            // don't block creation on notification errors
            //console.log('notifyErr', notifyErr);
        }

    } catch (err) {
        console.error('createRide unexpected error:', err && (err.stack || err));
        return res.status(500).json({ message: err && err.message ? err.message : 'Internal Server Error' });
    }
};

module.exports.getRideHistory = async (req, res) => {
    try {
        console.log('getRideHistory called for user:', req.user && req.user._id);
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        // Support pagination, filtering and simple text search for user ride history
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        const filter = { user: userId };
        if (req.query.status && req.query.status.toString().toLowerCase() !== 'all') filter.status = req.query.status.toString().toLowerCase();
        if (req.query.paymentMethod && req.query.paymentMethod.toString().toLowerCase() !== 'all') filter.paymentMethod = req.query.paymentMethod.toString().toLowerCase();

        if (req.query.q && req.query.q.trim().length > 0) {
            const q = req.query.q.trim();
            filter.$or = [
                { pickupAddress: { $regex: q, $options: 'i' } },
                { dropAddress: { $regex: q, $options: 'i' } }
            ];
        }

        let total = 0;
        let rides = [];
        try {
            total = await rideModel.countDocuments(filter);
            rides = await rideModel.find(filter).populate('captain').populate('user').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        } catch (populateErr) {
            console.error('getRideHistory.populate error:', populateErr && populateErr.stack ? populateErr.stack : populateErr);
            total = 0;
            rides = [];
        }

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.status(200).json({ total, page, limit, totalPages, rides });
    } catch (err) {
        console.error('getRideHistory error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getFareEstimate = async (req, res) => {
    try {
        // support either direct distanceInKm or coordinate pair inputs
        let { distanceInKm, pickupCoords, dropCoords } = req.body || {};
        let passengersReq = 1;
        try {
            if (typeof req.body.passengers !== 'undefined' && req.body.passengers !== null) passengersReq = Number(req.body.passengers);
            else if (typeof req.body.passengerCount !== 'undefined' && req.body.passengerCount !== null) passengersReq = Number(req.body.passengerCount);
            if (isNaN(passengersReq) || passengersReq < 1) passengersReq = 1;
        } catch (e) { passengersReq = 1; }
        let distanceKm = null;
        if (typeof distanceInKm === 'number' && !isNaN(distanceInKm)) {
            distanceKm = Number(distanceInKm);
        } else if (pickupCoords && dropCoords && pickupCoords.lat && dropCoords.lat) {
            const toRad = (v) => (v * Math.PI) / 180;
            const haversineKm = (a, b) => {
                const R = 6371; // km
                const dLat = toRad(b.lat - a.lat);
                const dLon = toRad(b.lng - a.lng);
                const lat1 = toRad(a.lat);
                const lat2 = toRad(b.lat);
                const sinDLat = Math.sin(dLat / 2);
                const sinDLon = Math.sin(dLon / 2);
                const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
                const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
                return R * c;
            };
            distanceKm = haversineKm(pickupCoords, dropCoords);
        } else {
            return res.status(400).json({ message: 'Missing distanceInKm or pickupCoords/dropCoords' });
        }

        const estimate = await calculateFare(distanceKm);
        // Apply passenger surcharge to estimate when >2 passengers
        let finalEstimate = estimate;
        try {
            if (passengersReq && Number(passengersReq) > 2) {
                const extra = Number(passengersReq) - 2;
                const multiplier = Math.pow(1.10, extra);
                finalEstimate = Number((estimate * multiplier).toFixed(2));
            }
        } catch (e) {}
        console.log('Estimate Fare:', finalEstimate, 'for distanceKm:', distanceKm, 'passengers:', passengersReq);
        return res.status(200).json({ distance: Number(distanceKm.toFixed(3)), estimate: finalEstimate, passengers: passengersReq });
    } catch (err) {
        console.error('cancelRide error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: err.message || 'Internal server error' });
    }
}

module.exports.getPendingRides = async (req, res) => {
    try {
        const captainId = req.captain && req.captain._id ? req.captain._id : null;
        const query = {
            status: { $in: ['pending', 'searching'] },
        };

        if (captainId) {
            query.$or = [
                { declinedBy: { $exists: false } },
                { declinedBy: { $nin: [captainId] } },
            ];
        }

        const pendingRides = await rideModel.find(query).populate('user').populate('captain');

        // Attach driverEarnings / platformCommission so driver popups show net pay, not gross fare
        let commissionRateDecimal = 0.20;
        try {
            const s = await Settings.findOne();
            if (s && typeof s.commissionRate === 'number') commissionRateDecimal = s.commissionRate / 100;
        } catch (e) {}

        const ridesWithEarnings = pendingRides.map((ride) => {
            try {
                const r = ride.toObject ? ride.toObject() : Object.assign({}, ride);
                const canonicalFare = typeof r.totalFare === 'number' ? r.totalFare : (r.fare || 0);
                r.platformCommission = Number((canonicalFare * commissionRateDecimal).toFixed(2));
                r.driverEarnings = Number((canonicalFare - r.platformCommission).toFixed(2));
                return r;
            } catch (e) {
                return ride;
            }
        });

        return res.status(200).json(ridesWithEarnings);
    } catch (err) {
        console.error('cancelRideById error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: err.message || 'Internal server error' });
    }
}

module.exports.getCompletedRides = async (req, res) => {
    try {
        const captainId = req.captain._id;

        // pagination params
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (page - 1) * limit;

        // filters
        const filter = { captain: captainId };
        // allow status override (e.g., all/completed/accepted)
        if (req.query.status) {
            const st = req.query.status.toString().toLowerCase();
            if (st !== 'all') filter.status = st;
        } else {
            // default to completed
            filter.status = 'completed';
        }
        if (req.query.paymentMethod) {
            filter.paymentMethod = req.query.paymentMethod;
        }

        // basic text search on pickup/drop addresses
        if (req.query.q && req.query.q.trim().length > 0) {
            const q = req.query.q.trim();
            filter.$or = [
                { pickupAddress: { $regex: q, $options: 'i' } },
                { dropAddress: { $regex: q, $options: 'i' } }
            ];
        }

        const total = await rideModel.countDocuments(filter);
        const rides = await rideModel.find(filter).populate('user').populate('captain').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.status(200).json({ total, page, limit, totalPages, rides });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { pickup, destination } = req.query;

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.confirmRide = async (req, res) => {
    // //console.log("ride confirmation sent")
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });
        // //console.log(ride.user.socketId)
        // //console.log(ride.user.socketId)
        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-confirmed',
            data: ride
        })

        return res.status(200).json(ride);
    } catch (err) {

        //console.log(err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });

        // //console.log(ride);

        sendMessageToSocketId(ride.user.socketId, {
            event: 'ride-started',
            data: ride
        })

        // also emit status update to user's room
        try {
            const { getIO } = require('../socket');
            const io = getIO && getIO();
            if (io && ride && ride.user && ride.user._id) {
                try { io.to(ride.user._id.toString()).emit('rideStatusUpdate', ride); } catch (e) {}
            }
        } catch (e) {}

        // FCM push to user
        try {
            const userDoc = await User.findById(ride.user._id || ride.user).select('pushTokens').lean();
            const tokens = (userDoc && userDoc.pushTokens) ? userDoc.pushTokens : [];
            await sendPush(tokens, 'Your ride has started', 'Hang tight — you\'re on your way!', { rideId: String(ride._id) });
        } catch (e) {}

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.endRide = async (req, res) => {
    const { rideId } = req.body;

    try {
        const ride = await rideModel.findById(rideId)
            .populate('user')
            .populate('captain');

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // mark completed
        ride.status = 'completed';
        ride.completedAt = new Date();

        // Determine canonical fare
        const fare = Number(ride.totalFare || ride.fare || 0);

        // Commission calculation using Settings.commissionRate (percentage)
        let commission = 0;
        try {
            const Settings = require('../models/settings.model');
            const settings = await Settings.findOne();
            const commissionRateDecimal = (settings && typeof settings.commissionRate === 'number') ? (settings.commissionRate / 100) : 0.20;
            commission = Number((fare * commissionRateDecimal).toFixed(2));
        } catch (e) {
            commission = Number((fare * 0.20).toFixed(2));
        }
        const driverEarnings = Number((fare - commission).toFixed(2));

        ride.platformCommission = commission;
        ride.driverEarnings = driverEarnings;

        if (ride.paymentMethod === 'card') {
            ride.paymentStatus = 'paid';
            ride.isPaid = true;
        }

        await ride.save();

        // Update captain total earnings using model method (atomic)
        try {
            if (ride.captain) {
                await Captain.findByIdAndUpdate(ride.captain._id || ride.captain, {
                    $inc: { totalEarnings: driverEarnings }
                });
            }
        } catch (e) {
            // non-fatal
            console.error('Failed updating captain totalEarnings in endRide:', e && e.message ? e.message : e);
        }

        // Emit socket events
        try {
            const io = req.app && req.app.get && req.app.get('io');
            if (io && ride.user && ride.user._id) {
                io.to(ride.user._id.toString()).emit('ride-ended', { rideId: ride._id, fare });
            }
            if (io && ride.captain && (ride.captain._id || ride.captain)) {
                const captainRoom = (ride.captain._id) ? ride.captain._id.toString() : String(ride.captain);
                io.to(captainRoom).emit('ride-completed', { rideId: ride._id, earnings: driverEarnings });
            }
            try { if (io && typeof io.emit === 'function') io.emit('rideUpdated', ride); } catch (e) {}
        } catch (e) {}

        // FCM push to user and captain
        try {
            const userDoc = await User.findById(ride.user._id || ride.user).select('pushTokens').lean();
            const userTokens = (userDoc && userDoc.pushTokens) ? userDoc.pushTokens : [];
            await sendPush(userTokens, 'Ride complete', `Your trip is done. Fare: R${fare.toFixed ? fare.toFixed(2) : fare}`, { rideId: String(ride._id) });
        } catch (e) {}
        try {
            const captainDoc = await Captain.findById(ride.captain && (ride.captain._id || ride.captain)).select('pushTokens').lean();
            const captainTokens = (captainDoc && captainDoc.pushTokens) ? captainDoc.pushTokens : [];
            await sendPush(captainTokens, 'Ride complete', `Earnings added: R${driverEarnings}`, { rideId: String(ride._id) });
        } catch (e) {}

        try {
            const io = req.app && req.app.get && req.app.get('io');
            // Notify admin dashboard listeners with updated completed-today count
            try {
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);
                // count by completedAt so we include rides finished today even if created earlier
                const completedTodayCount = await rideModel.countDocuments({ status: 'completed', completedAt: { $gte: todayStart } });
                try {
                    console.log('[dashboard-emit] emitting dashboard-ride-completed count=', Number(completedTodayCount || 0));
                    io.to('admins').emit('dashboard-ride-completed', { completedToday: Number(completedTodayCount || 0) });
                } catch (e) {
                    console.error('[dashboard-emit] failed to emit dashboard-ride-completed', e && e.message ? e.message : e);
                }
            } catch (e) {
                console.error('[dashboard-emit] failed to compute completedToday count', e && e.message ? e.message : e);
            }
        } catch (e) {}

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.acceptRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const rideId = req.params.id;

    try {
        const ride = await rideModel.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        // If ride already accepted, allow idempotent accept by the same captain (return OK)
        if (ride.status === 'accepted') {
            try {
                const existingCaptainId = String(ride.captain || '');
                const requestingCaptainId = String(req.captain && req.captain._id ? req.captain._id : '');
                if (existingCaptainId && requestingCaptainId && existingCaptainId === requestingCaptainId) {
                    const populated = await rideModel.findById(ride._id).populate('user').populate('captain');
                    return res.status(200).json(populated);
                }
                return res.status(400).json({ message: 'Ride already accepted' });
            } catch (e) {
                return res.status(500).json({ message: e && e.message ? e.message : 'Internal Server Error' });
            }
        }

        // Allow accepting rides that are in 'pending' or 'searching' (created without pre-selected captain)
        if (!['pending', 'searching'].includes(ride.status)) {
            return res.status(400).json({ message: 'Ride not available for acceptance' });
        }

        ride.status = 'accepted';
        ride.captain = req.captain._id;
        await ride.save();

        const populated = await rideModel.findById(ride._id).populate('user').populate('captain');

        // attach simple name fields for client convenience
        try {
            if (populated.captain) {
                const c = populated.captain;
                populated.captainName = (c.fullname && (c.fullname.firstname || c.fullname.lastname)) ? `${c.fullname.firstname || ''} ${c.fullname.lastname || ''}`.trim() : (c.name || c.fullname || c.email || 'Driver');
                populated.captainProfileImage = c.profileImage || null;
                populated.vehiclePlate = (c.vehicle && c.vehicle.plate) || null;
                populated.vehicleColor = (c.vehicle && c.vehicle.color) || null;
                populated.captainPhone = c.phone || null;
            }
            if (populated.user) {
                const u = populated.user;
                populated.userName = (u.fullname && (u.fullname.firstname || u.fullname.lastname)) ? `${u.fullname.firstname || ''} ${u.fullname.lastname || ''}`.trim() : (u.name || u.email || 'Passenger');
            }
        } catch (e) {}

        // notify user directly by socket id if available (fallback)
        try {
            if (populated.user && populated.user.socketId) {
                sendMessageToSocketId(populated.user.socketId, {
                    event: 'ride-confirmed',
                    data: populated,
                });
            }
        } catch (notifyErr) {
            // ignore notification errors
        }

        // Also emit a canonical 'ride-accepted' event (and 'rideAccepted') to the user's socket room so connected clients
        // that joined their personal room receive the active ride and can auto-open it.
        try {
            const { getIO } = require('../socket');
            const io = getIO && getIO();
            if (io && populated && populated.user && populated.user._id) {
                try {
                    // compute ETA (minutes) using captain location if available
                    let etaMinutes = null;
                    try {
                        const toRad = (v) => (v * Math.PI) / 180;
                        const haversineKm = (a, b) => {
                            const R = 6371; // km
                            const dLat = toRad(b.lat - a.lat);
                            const dLon = toRad(b.lng - a.lng);
                            const lat1 = toRad(a.lat);
                            const lat2 = toRad(b.lat);
                            const sinDLat = Math.sin(dLat / 2);
                            const sinDLon = Math.sin(dLon / 2);
                            const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
                            const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
                            return R * c;
                        };

                        const captainLoc = (populated.captain && populated.captain.location) ? populated.captain.location : null;
                        const pickupLoc = populated.pickupCoords || populated.pickup || null;
                        if (captainLoc && captainLoc.ltd && captainLoc.lng && pickupLoc && pickupLoc.lat && pickupLoc.lng) {
                            const a = { lat: Number(captainLoc.ltd), lng: Number(captainLoc.lng) };
                            const b = { lat: Number(pickupLoc.lat), lng: Number(pickupLoc.lng) };
                            const distKm = haversineKm(a, b);
                            // assume average speed 40 km/h => 0.6667 km/min => minutes = distKm / 0.6667 ~= distKm * 1.5
                            etaMinutes = Math.max(1, Math.ceil(distKm * 1.5));
                        }
                    } catch (etaErr) {}

                    // attach friendly driver fields and ETA
                    try {
                        if (populated.captain) {
                            populated.driverName = populated.captainName || (populated.captain.fullname && `${populated.captain.fullname.firstname || ''} ${populated.captain.fullname.lastname || ''}`.trim()) || populated.captain.email || 'Driver';
                            populated.driverImage = populated.captainProfileImage || (populated.captain.profileImage || null);
                            populated.driverLocation = (populated.captain && populated.captain.location) ? populated.captain.location : null;
                        }
                        if (etaMinutes !== null) populated.eta = etaMinutes;
                    } catch (e) {}

                    io.to(populated.user._id.toString()).emit('ride-accepted', populated);
                } catch (e) {}
                try { io.to(populated.user._id.toString()).emit('rideStatusUpdate', populated); } catch (e) {}
                // extra compatibility event name for some clients
                try { io.to(populated.user._id.toString()).emit('rideAccepted', populated); } catch (e) {}
            }
        } catch (e) {
            // ignore
        }

        // FCM push to user
        try {
            const driverName = populated.captainName || 'Your driver';
            const userDoc = await User.findById(populated.user && (populated.user._id || populated.user)).select('pushTokens').lean();
            const tokens = (userDoc && userDoc.pushTokens) ? userDoc.pushTokens : [];
            await sendPush(tokens, 'Ride accepted! 🚗', `${driverName} is on the way to pick you up.`, { rideId: String(rideId) });
        } catch (e) {}

        // FCM push to captain (new ride request)
        try {
            const captainDoc = await Captain.findById(req.captain._id).select('pushTokens').lean();
            const tokens = (captainDoc && captainDoc.pushTokens) ? captainDoc.pushTokens : [];
            await sendPush(tokens, 'New ride accepted', `Pick up: ${populated.pickupAddress || ''}`, { rideId: String(rideId) });
        } catch (e) {}

        return res.status(200).json(populated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.declineRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const rideId = req.params.id;

    try {
        const ride = await rideModel.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        if (!['pending', 'searching'].includes(String(ride.status))) {
            return res.status(400).json({ message: 'Ride is no longer available' });
        }

        await rideModel.findByIdAndUpdate(rideId, { $addToSet: { declinedBy: req.captain._id } });

        const updated = await rideModel.findById(rideId).populate('user').populate('captain');

        return res.status(200).json(updated);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.cancelRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        console.log('cancelRide called, user=', req.user && req.user._id, 'rideId=', rideId);
        const ride = await rideModel.findById(rideId).populate('captain').populate('user');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        // only the user who created the ride can cancel
        const rideUserId = ride.user && ride.user._id ? String(ride.user._id) : (ride.user ? String(ride.user) : null);
        const reqUserId = req.user && req.user._id ? String(req.user._id) : null;
        if (!reqUserId || !rideUserId || rideUserId !== reqUserId) {
            return res.status(403).json({ message: 'Not authorized to cancel this ride' });
        }

        ride.status = 'cancelled';
        // sanitize legacy/invalid paymentStatus values that would fail enum validation
        try {
            if (ride.paymentStatus && !['pending', 'paid'].includes(String(ride.paymentStatus))) {
                ride.paymentStatus = 'pending';
            }
            ride.isPaid = (String(ride.paymentStatus) === 'paid');
        } catch (e) {}
        await ride.save();

        // notify captain if assigned (best-effort)
        try {
            console.log('cancelRide: ride cancelled, id=', ride._id, 'captain=', ride.captain && (ride.captain._id || ride.captain));
            if (ride.captain && (ride.captain.socketId || (ride.captain._id && true))) {
                try {
                    const { getIO, onlineDrivers } = require('../socket');
                    const io = getIO && getIO();
                    // prefer socketId if available
                    if (ride.captain.socketId) {
                        sendMessageToSocketId(ride.captain.socketId, { event: 'ride-cancelled', data: { rideId: ride._id, message: 'Passenger cancelled the ride' } });
                        // extra safety emits
                        try { sendMessageToSocketId(ride.captain.socketId, { event: 'end-chat', data: { rideId: ride._id } }); } catch (e) {}
                        try { sendMessageToSocketId(ride.captain.socketId, { event: 'rideStatusUpdate', data: ride }); } catch (e) {}
                        console.log('cancelRide: sent via captain.socketId');
                    } else if (onlineDrivers && ride.captain._id && onlineDrivers[String(ride.captain._id)]) {
                        const sid = onlineDrivers[String(ride.captain._id)];
                        if (io) {
                            io.to(sid).emit('ride-cancelled', { rideId: ride._id, message: 'Passenger cancelled the ride' });
                            // extra safety emits
                            try { io.to(sid).emit('end-chat', { rideId: ride._id }); } catch (e) {}
                            try { io.to(sid).emit('rideStatusUpdate', ride); } catch (e) {}
                        }
                        console.log('cancelRide: emitted to onlineDrivers socket', sid);
                    } else if (io && ride.captain._id) {
                        try { io.to(String(ride.captain._id)).emit('ride-cancelled', { rideId: ride._id, message: 'Passenger cancelled the ride' }); } catch (e) {}
                        try { io.to(String(ride.captain._id)).emit('end-chat', { rideId: ride._id }); } catch (e) {}
                        try { io.to(String(ride.captain._id)).emit('rideStatusUpdate', ride); } catch (e) {}
                        console.log('cancelRide: emitted to captain room');
                    }
                } catch (e) {
                    console.error('cancelRide: emit internal error', e && e.stack ? e.stack : e);
                }
            } else {
                console.log('cancelRide: no captain info to notify');
            }
        } catch (e) {
            console.error('cancelRide: unexpected error during notify', e && e.stack ? e.stack : e);
        }

        return res.status(200).json({ message: 'Ride cancelled', ride });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.cancelRideById = async (req, res) => {
    try {
        // support both /:id/cancel and /:rideId/cancel
        const rideId = req.params.rideId || req.params.id;
        console.log('cancelRideById called, user=', req.user && req.user._id, 'rideId=', rideId);
        const ride = await rideModel.findById(rideId).populate('captain').populate('user');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        // only the user who created the ride can cancel
        const rideUserId = ride.user && ride.user._id ? String(ride.user._id) : (ride.user ? String(ride.user) : null);
        const reqUserId = req.user && req.user._id ? String(req.user._id) : null;
        if (!reqUserId || !rideUserId || rideUserId !== reqUserId) {
            return res.status(403).json({ message: 'Not authorized to cancel this ride' });
        }

        ride.status = 'cancelled';
        // sanitize legacy/invalid paymentStatus values that would fail enum validation
        try {
            if (ride.paymentStatus && !['pending', 'paid'].includes(String(ride.paymentStatus))) {
                ride.paymentStatus = 'pending';
            }
            ride.isPaid = (String(ride.paymentStatus) === 'paid');
        } catch (e) {}
        await ride.save();

        // Notify captain via socket room and socketId when available (best-effort)
        try {
            const { getIO, onlineDrivers } = require('../socket');
            const io = getIO && getIO();
            console.log('cancelRideById: cancelling ride', ride._id, 'captain=', ride.captain && ride.captain._id);
            // emit full ride-status update to the user room as well so any connected clients sync
            try { if (io && ride.user && ride.user._id) io.to(ride.user._id.toString()).emit('rideStatusUpdate', ride); } catch (e) { console.error('cancelRideById: user room emit failed', e); }
            // Notify assigned driver/captain if present
            const driverId = (ride.captain && (ride.captain._id || ride.captain)) ? (ride.captain._id ? String(ride.captain._id) : String(ride.captain)) : (ride.driver ? String(ride.driver) : null);
            if (driverId) {
                try {
                    // prefer direct socketId if captain object contains it
                    if (ride.captain && ride.captain.socketId) {
                        const { sendMessageToSocketId } = require('../socket');
                        sendMessageToSocketId(ride.captain.socketId, { event: 'ride-cancelled', data: { rideId: ride._id, message: 'Passenger cancelled the ride' } });
                        try { sendMessageToSocketId(ride.captain.socketId, { event: 'end-chat', data: { rideId: ride._id } }); } catch (e) {}
                        try { sendMessageToSocketId(ride.captain.socketId, { event: 'rideStatusUpdate', data: ride }); } catch (e) {}
                        console.log('cancelRideById: sentMessageToSocketId', ride.captain.socketId);
                    } else {
                        // fallback to onlineDrivers map then captain room
                        const { onlineDrivers } = require('../socket');
                        if (onlineDrivers && onlineDrivers[driverId]) {
                            const sid = onlineDrivers[driverId];
                            if (io) {
                                io.to(sid).emit('ride-cancelled', { rideId: ride._id, message: 'Passenger cancelled the ride' });
                                try { io.to(sid).emit('end-chat', { rideId: ride._id }); } catch (e) {}
                                try { io.to(sid).emit('rideStatusUpdate', ride); } catch (e) {}
                            }
                            console.log('cancelRideById: emitted to onlineDrivers socketId', sid);
                        } else if (io) {
                            try { io.to(driverId.toString()).emit('ride-cancelled', { rideId: ride._id, message: 'Passenger cancelled the ride' }); } catch(e) { console.error('cancelRideById: emit to driver room failed', e); }
                            try { io.to(driverId.toString()).emit('end-chat', { rideId: ride._id }); } catch(e) {}
                            try { io.to(driverId.toString()).emit('rideStatusUpdate', ride); } catch(e) {}
                            console.log('cancelRideById: emitted to driver room', driverId.toString());
                        }
                    }
                } catch (e) { console.error('cancelRideById: emit/send failed', e); }
            } else {
                console.log('cancelRideById: no driver/captain info to notify');
            }
        } catch (e) {
            console.error('cancelRideById: unexpected error', e && e.stack ? e.stack : e);
        }

        return res.status(200).json({ message: 'Ride cancelled', ride });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getActiveRide = async (req, res) => {
    try {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const ride = await rideModel.findOne({
            user: userId,
            status: { $in: ['accepted', 'arriving', 'ongoing'] }
        }).populate('captain').populate('user');

        if (!ride) return res.status(200).json(null);

        const driver = ride.captain || null;

        const totalFareVal = (typeof ride.totalFare === 'number') ? ride.totalFare : ((ride.fare !== undefined && ride.fare !== null) ? Number(ride.fare) : 0);
        const response = {
            _id: ride._id,
            pickupAddress: ride.pickupAddress || ride.pickup || null,
            dropAddress: ride.dropAddress || ride.drop || null,
            baseFare: (ride.baseFare !== undefined && ride.baseFare !== null) ? Number(ride.baseFare) : null,
            distanceFare: (ride.distanceFare !== undefined && ride.distanceFare !== null) ? Number(ride.distanceFare) : null,
            totalFare: Number(totalFareVal),
            fare: Number(totalFareVal),
            paymentStatus: ride.paymentStatus || 'pending',
            isPaid: (typeof ride.isPaid === 'boolean') ? ride.isPaid : (ride.paymentStatus === 'paid'),
            status: ride.status,
            driver: driver
                ? {
                    fullName: driver.fullname ? `${driver.fullname.firstname || ''} ${driver.fullname.lastname || ''}`.trim() : (driver.name || null),
                    phone: driver.phone || null,
                    profileImage: driver.profileImage || null,
                    vehicleColor: driver.vehicle && driver.vehicle.color ? driver.vehicle.color : null,
                    vehiclePlate: driver.vehicle && driver.vehicle.plate ? driver.vehicle.plate : null,
                    vehicleModel: driver.vehicle && driver.vehicle.model ? driver.vehicle.model : null,
                }
                : null,
        };

        return res.status(200).json(response);
    } catch (err) {
        console.error('getActiveRide error', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: err.message });
    }
}

module.exports.updateRideStatus = async (req, res) => {
    try {
        const { rideId, status } = req.body;
        if (!rideId || !status) return res.status(400).json({ message: 'rideId and status required' });

        const ride = await rideModel.findByIdAndUpdate(
            rideId,
            { status },
            { new: true }
        ).populate('user').populate('captain');

        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        // Prefer req.io if available (server attaches it), otherwise fallback to socket helper
        try {
            if (req && req.io && ride.user && ride.user._id) {
                try { req.io.to(ride.user._id.toString()).emit('ride-status-updated', ride); } catch (e) {}
                if (ride.captain && ride.captain._id) try { req.io.to(ride.captain._id.toString()).emit('ride-status-updated', ride); } catch (e) {}
            } else {
                const { getIO } = require('../socket');
                const io = getIO && getIO();
                if (io && ride.user && ride.user._id) {
                    try { io.to(ride.user._id.toString()).emit('ride-status-updated', ride); } catch (e) {}
                    if (ride.captain && ride.captain._id) try { io.to(ride.captain._id.toString()).emit('ride-status-updated', ride); } catch (e) {}
                }
            }
        } catch (e) {
            // ignore emission errors
        }

        return res.status(200).json(ride);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.completeRide = async (req, res) => {
    try {
        const rideId = req.params.rideId || req.params.id || req.body.rideId;

        const ride = await rideModel.findById(rideId).populate('user').populate('captain');

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.status = 'completed';
        ride.completedAt = new Date();

        // mark payment as paid automatically if card
        try {
            if (ride.paymentMethod === 'card') {
                ride.paymentStatus = 'paid';
                ride.isPaid = true;
            }
        } catch (e) {}

        // compute commission/earnings
        try {
            const fare = Number(ride.totalFare || ride.fare || 0);
            let commission = 0;
            try {
                const Settings = require('../models/settings.model');
                const settings = await Settings.findOne();
                const commissionRateDecimal = (settings && typeof settings.commissionRate === 'number') ? (settings.commissionRate / 100) : 0.20;
                commission = Number((fare * commissionRateDecimal).toFixed(2));
            } catch (e) {
                commission = Number((fare * 0.20).toFixed(2));
            }
            const driverEarnings = Number((fare - commission).toFixed(2));
            ride.platformCommission = commission;
            ride.driverEarnings = driverEarnings;
        } catch (e) {
            ride.platformCommission = 0;
            ride.driverEarnings = 0;
        }

        await ride.save();

        // ADD earnings to captain (atomic update)
        try {
            if (ride.captain) {
                const toInc = Number(ride.driverEarnings || 0);
                await Captain.findByIdAndUpdate(ride.captain._id || ride.captain, { $inc: { totalEarnings: toInc } });
            }
        } catch (e) {
            // non-fatal
            console.error('Failed updating captain earnings in completeRide:', e && e.message ? e.message : e);
        }

        // Emit socket events if io available on app and broadcast a rideUpdated event
        try {
            const io = req.app && req.app.get && req.app.get('io');
            if (io && ride.user && ride.user._id) {
                const fare = Number(ride.totalFare || ride.fare || 0);
                io.to(ride.user._id.toString()).emit('ride-ended', { rideId: ride._id, fare });
            }
            if (io && ride.captain && ride.captain._id) {
                io.to(ride.captain._id.toString()).emit('ride-completed', { rideId: ride._id, earnings: ride.driverEarnings || 0 });
            }
            // broadcast a generic update so any listening dashboards/clients can reconcile
            try { if (io && typeof io.emit === 'function') io.emit('rideUpdated', ride); } catch (e) {}
        } catch (e) {
            // ignore socket emission errors
        }

        return res.json({ message: 'Ride completed', ride });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Complete ride failed' });
    }
};

module.exports.rateRide = async (req, res) => {
    try {
        const rideId = req.params.rideId || req.params.id || req.body.rideId;
        const { rating } = req.body;

        const ride = await rideModel.findById(rideId).populate('captain').populate('user');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.rating = Number(rating);
        await ride.save();

        // Update captain average rating
        try {
            if (ride.captain) {
                const ridesWithRating = await rideModel.find({ captain: ride.captain._id || ride.captain, rating: { $exists: true } });
                if (ridesWithRating && ridesWithRating.length) {
                    const avg = ridesWithRating.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / ridesWithRating.length;
                    await Captain.findByIdAndUpdate(ride.captain._id || ride.captain, { rating: Number(avg.toFixed(2)) });
                }
            }
        } catch (e) {
            // ignore rating update errors
            console.error('Failed to update captain rating:', e && e.message ? e.message : e);
        }

        // Clear user's activeRide so client's /rides/active shows no active ride
        try {
            if (ride.user) {
                try { await User.findByIdAndUpdate(ride.user._id || ride.user, { activeRide: null }); } catch (e) { }
                // notify the user client that their active ride was cleared
                try {
                    const { getIO } = require('../socket');
                    const io = getIO && getIO();
                    if (io && (ride.user._id || ride.user)) {
                        try { io.to((ride.user._id || ride.user).toString()).emit('activeRideCleared', { rideId: ride._id }); } catch (e) {}
                    }
                } catch (e) {}
            }
        } catch (e) {}

        // Notify the captain (driver) with a popup containing passenger name and rating
        try {
            const passengerName = (ride.user && ride.user.fullname && (ride.user.fullname.firstname || ride.user.fullname.lastname)) ? `${ride.user.fullname.firstname || ''} ${ride.user.fullname.lastname || ''}`.trim() : (ride.user && (ride.user.email || ride.user.name) || 'Passenger');
            const payload = { passengerName, rating: Number(rating), rideId: ride._id };
            try {
                if (ride.captain && ride.captain.socketId) {
                    try { sendMessageToSocketId(ride.captain.socketId, { event: 'passenger-rated', data: payload }); } catch (e) {}
                }
            } catch (e) {}
            try {
                const { getIO } = require('../socket');
                const io = getIO && getIO();
                if (io && ride.captain && (ride.captain._id || ride.captain)) {
                    try { io.to((ride.captain._id || ride.captain).toString()).emit('passenger-rated', payload); } catch (e) {}
                }
            } catch (e) {}
        } catch (e) {}

        return res.json({ message: 'Rating submitted' });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

module.exports.getRideCount = async (req, res) => {
    try {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        // Count only completed rides as "total trips"
        const filter = { user: userId, status: 'completed' };
        const count = await rideModel.countDocuments(filter);
        return res.status(200).json({ count });
    } catch (err) {
        console.error('getRideCount error:', err && (err.stack || err));
        return res.status(500).json({ message: err && err.message ? err.message : 'Internal Server Error' });
    }
}