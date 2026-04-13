const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');
const rideModel = require('./models/ride.model');
const rideService = require('./services/ride.service');
const Settings = require('./models/settings.model');

let io;
// shared online drivers map (kept in socketStore.js so other modules can access the same reference)
const onlineDrivers = require('./socketStore');

// Validate socket origin the same way as the Express CORS in app.js
function isAllowedOrigin(origin) {
    if (!origin) return true;
    const isLocalhost =
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://127.0.0.1');
    if (isLocalhost) return true;
    const isAppLocalhost =
        origin.startsWith('capacitor://localhost') ||
        origin.startsWith('ionic://localhost') ||
        origin.startsWith('app://localhost');
    if (isAppLocalhost) return true;
    const isLan = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);
    if (isLan) return true;
    // Allow admin frontend hosted on Render
    if (origin && origin.indexOf('https://vexomoveadmin.onrender.com') === 0) return true;
    return false;
}

function initializeSocket(server) {
    // Configure CORS origins dynamically so mobile devices (on LAN) can connect
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || null; // comma-separated list
    let corsOrigin;
    if (allowedOriginsEnv) {
        const envOrigins = allowedOriginsEnv.split(',').map(s => s.trim());
        corsOrigin = (origin, cb) => {
            if (!origin || envOrigins.includes(origin) || isAllowedOrigin(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
        };
    } else {
        // Allow Capacitor, localhost, and LAN origins in all environments
        corsOrigin = (origin, cb) => {
            if (isAllowedOrigin(origin)) return cb(null, true);
            return cb(new Error('Not allowed by CORS'));
        };
    }

    io = socketIo(server, {
        cors: {
            origin: corsOrigin,
            methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);


        socket.on('join', async (data) => {
            const { userId, userType } = data;
            // store socketId on the user/captain/admin record and join a personal room
            console.log('join event from socket', socket.id, 'data=', data);
            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
                try { socket.join(userId.toString()); } catch (e) {}
            } else if (userType === 'captain') {
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
                try { socket.join(userId.toString()); } catch (e) {}
            } else if (userType === 'admin') {
                // admins join a shared 'admins' room to receive global dashboard broadcasts
                try { socket.join('admins'); } catch (e) {}
                try { await userModel.findByIdAndUpdate(userId, { socketId: socket.id }); } catch (e) {}
                try {
                    const room = io && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms ? io.sockets.adapter.rooms.get('admins') : null;
                    const count = room ? room.size : 0;
                    console.log(`[socket] admin joined admins room; admins connected=${count}`);
                } catch (e) {}
            }
        });

        // mark captain as online in socket.io room
        socket.on('captain-online', (captainId) => {
            try { socket.join('onlineCaptains'); } catch (e) {}
            console.log(`Captain ${captainId} joined onlineCaptains (socket ${socket.id})`);
        });

        // allow drivers to mark themselves online for quick socket lookup
        socket.on('driver-online', (driverId) => {
            try {
                if (driverId) {
                    onlineDrivers[driverId] = socket.id;
                    console.log('Driver online:', driverId);
                }
            } catch (e) {}
        });

        // allow drivers to mark themselves offline (cleanup)
        socket.on('driver-offline', (driverId) => {
            try {
                if (driverId && onlineDrivers && onlineDrivers[driverId]) {
                    delete onlineDrivers[driverId];
                    console.log('Driver offline:', driverId);
                }
            } catch (e) {}
        });

        // captain accepts a ride
        socket.on('accept-ride', async (rideId) => {
            try {
                // find the captain record associated with this socket
                let captain = null;
                try {
                    captain = await captainModel.findOne({ socketId: socket.id });
                } catch (e) {
                    // ignore
                }

                const update = { status: 'accepted' };
                if (captain && captain._id) update.captain = captain._id;

                const ride = await rideModel.findByIdAndUpdate(
                    rideId,
                    update,
                    { new: true }
                ).populate('user').populate('captain');

                if (ride && ride.user) {
                    // attach simple name fields for ease of client consumption
                    try {
                        if (ride.captain) {
                            const c = ride.captain;
                            ride.captainName = (c.fullname && (c.fullname.firstname || c.fullname.lastname)) ? `${c.fullname.firstname || ''} ${c.fullname.lastname || ''}`.trim() : (c.name || c.fullname || c.email || 'Driver');
                            ride.captainProfileImage = c.profileImage || null;
                            ride.vehiclePlate = (c.vehicle && c.vehicle.plate) || null;
                            ride.vehicleColor = (c.vehicle && c.vehicle.color) || null;
                            ride.captainPhone = c.phone || null;
                        }
                        if (ride.user) {
                            const u = ride.user;
                            ride.userName = (u.fullname && (u.fullname.firstname || u.fullname.lastname)) ? `${u.fullname.firstname || ''} ${u.fullname.lastname || ''}`.trim() : (u.name || u.email || 'Passenger');
                        }
                    } catch (e) {}

                    // compute ETA and attach driver-friendly fields before emitting
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

                            const captainLoc = (ride.captain && ride.captain.location) ? ride.captain.location : null;
                            const pickupLoc = ride.pickupCoords || ride.pickup || null;
                            if (captainLoc && captainLoc.ltd && captainLoc.lng && pickupLoc && pickupLoc.lat && pickupLoc.lng) {
                                const a = { lat: Number(captainLoc.ltd), lng: Number(captainLoc.lng) };
                                const b = { lat: Number(pickupLoc.lat), lng: Number(pickupLoc.lng) };
                                const distKm = haversineKm(a, b);
                                // frontend expects avg speed ~30 km/h -> 0.5 km/min => minutes = distKm / 0.5
                                etaMinutes = Math.max(1, Math.ceil(distKm / 0.5));
                            }
                        } catch (etaErr) {}

                        try {
                            if (ride.captain) {
                                ride.driverName = ride.captainName || (ride.captain.fullname && `${ride.captain.fullname.firstname || ''} ${ride.captain.fullname.lastname || ''}`.trim()) || ride.captain.email || 'Driver';
                                ride.driverImage = ride.captainProfileImage || (ride.captain.profileImage || null);
                                ride.driverLocation = (ride.captain && ride.captain.location) ? ride.captain.location : null;
                            }
                            if (etaMinutes !== null) ride.eta = etaMinutes;
                        } catch (e) {}

                    } catch (e) {}

                    // emit to the user's personal room (userId) and also emit a consistent 'ride-confirmed' event
                    try {
                        io.to(ride.user._id.toString()).emit('ride-accepted', ride);
                    } catch (e) {}
                    try {
                        io.to(ride.user._id.toString()).emit('ride-confirmed', ride);
                    } catch (e) {}

                    // Do not broadcast ride acceptance globally — only notify the rider's personal room.
                    // Global emits can cause other clients (captain UIs) to mistakenly navigate to user pages.
                }
            } catch (err) {
                // ignore
            }
        });

        // relay when captain frontend emits acceptRide (simple driver object relay)
        socket.on('acceptRide', (data) => {
            try {
                if (data && data.driver) {
                    io.emit('rideAccepted', data.driver);
                }
            } catch (e) {
                // ignore
            }
        });

        // allow a client (user) to request drivers immediately by sending the created ride
        socket.on('request-drivers', async (ride) => {
            try {
                console.log('request-drivers received, broadcasting new-ride for', ride && ride._id);
                // attach display fields if missing
                try {
                    if (ride) {
                        const fareVal = (ride.fare !== undefined && ride.fare !== null) ? ride.fare : (ride.price !== undefined && ride.price !== null ? ride.price : 0);
                        ride.fareDisplay = Number(fareVal).toFixed(2);
                        ride.priceDisplay = ride.priceDisplay || ride.fareDisplay;
                        ride.distanceDisplay = (ride.distance !== undefined && ride.distance !== null) ? Number(ride.distance).toFixed(2) : (ride.distanceDisplay || '0.00');
                    }

                    // If ride contains a user id, populate a lightweight user object so drivers see passenger name
                    try {
                        if (ride && ride.user) {
                            let userObj = null;
                            try {
                                userObj = await userModel.findById(ride.user).lean();
                            } catch (e) { userObj = null; }
                            if (userObj) {
                                // attach friendly name and a reduced user object
                                ride.userName = (userObj.fullname && (userObj.fullname.firstname || userObj.fullname.lastname)) ? `${userObj.fullname.firstname || ''} ${userObj.fullname.lastname || ''}`.trim() : (userObj.name || userObj.email || 'Passenger');
                                // include only small set of fields to avoid large payloads
                                ride.user = {
                                    _id: userObj._id,
                                    name: userObj.name || null,
                                    email: userObj.email || null,
                                    fullname: userObj.fullname || null,
                                    profileImage: userObj.profileImage || null
                                };
                            }
                        }
                    } catch (e) {}
                } catch (e) {}

                // Compute driverEarnings / platformCommission so driver popup shows net pay
                try {
                    if (ride && (typeof ride.driverEarnings === 'undefined' || ride.driverEarnings === null)) {
                        const fareVal = (typeof ride.totalFare === 'number') ? ride.totalFare : (typeof ride.fare === 'number' ? ride.fare : 0);
                        let commRate = 0.20;
                        try {
                            const s = await Settings.findOne();
                            if (s && typeof s.commissionRate === 'number') commRate = s.commissionRate / 100;
                        } catch (e) {}
                        ride.platformCommission = Number((fareVal * commRate).toFixed(2));
                        ride.driverEarnings = Number((fareVal - ride.platformCommission).toFixed(2));
                    }
                } catch (e) {}

                // emit to online captains room only (do NOT broadcast globally to all clients)
                try { io.to('onlineCaptains').emit('new-ride', ride); } catch (e) { console.error('[socket] emit new-ride to onlineCaptains failed', e); }
            } catch (err) {
                // ignore
            }
        });


        socket.on('update-location-captain', async (data) => {
            // //console.log("update-location-captain", data);
            const { userId, location } = data;

            if (!location || !location.ltd || !location.lng) {
                return socket.emit('error', { message: 'Invalid location data' });
            }

            await captainModel.findByIdAndUpdate(userId, {
                location: {
                    ltd: location.ltd,
                    lng: location.lng
                }
            });
        });

        // Receive live driver location from captain client and broadcast to others (users)
        socket.on('driverLocationUpdate', async (data) => {
            try {
                // Broadcast generic update for map viewers
                socket.broadcast.emit('updateDriverOnMap', {
                    driverId: socket.id,
                    lat: data.lat,
                    lng: data.lng,
                });

                // If rideId provided, persist driver location to ride and notify the rider directly
                if (data && data.rideId) {
                    try {
                        const ride = await rideModel.findById(data.rideId);
                        if (ride) {
                            ride.driverLocation = { lat: data.lat, lng: data.lng };
                            await ride.save();
                            console.log('[socket] saved driverLocation', { rideId: data.rideId, lat: data.lat, lng: data.lng });
                            // emit to the rider's room a driverLocation event
                            try { io.to(ride.user.toString()).emit('driverLocation', { rideId: data.rideId, lat: data.lat, lng: data.lng }); } catch (e) {}

                            // If the ride is ongoing, check proximity to dropoff and auto-complete when close
                            try {
                                const resolveDropCoords = (r) => {
                                    if (!r) return null;
                                    if (r.dropCoords && r.dropCoords.lat !== undefined && r.dropCoords.lng !== undefined) return { lat: Number(r.dropCoords.lat), lng: Number(r.dropCoords.lng) };
                                    if (r.dropoff && r.dropoff.lat !== undefined && r.dropoff.lng !== undefined) return { lat: Number(r.dropoff.lat), lng: Number(r.dropoff.lng) };
                                    if (r.destination && Array.isArray(r.destination.coordinates) && r.destination.coordinates.length >= 2) return { lat: Number(r.destination.coordinates[1]), lng: Number(r.destination.coordinates[0]) };
                                    if (r.dropoff && Array.isArray(r.dropoff.coordinates) && r.dropoff.coordinates.length >= 2) return { lat: Number(r.dropoff.coordinates[1]), lng: Number(r.dropoff.coordinates[0]) };
                                    return null;
                                };

                                const drop = resolveDropCoords(ride);
                                const rideStatus = (ride.status || '').toString();
                                if (!drop) console.log('[socket] no drop coords for ride', { rideId: data.rideId, status: rideStatus });
                                if (!(rideStatus === 'ongoing' || rideStatus === 'started')) console.log('[socket] ride status not eligible for auto-complete', { rideId: data.rideId, status: rideStatus });
                                // allow auto-complete for started/ongoing rides and for accepted rides
                                if (drop && (rideStatus === 'ongoing' || rideStatus === 'started' || rideStatus === 'accepted')) {
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

                                    const current = { lat: Number(data.lat), lng: Number(data.lng) };
                                    const distKm = haversineKm(current, { lat: drop.lat, lng: drop.lng });
                                    const thresholdKm = 0.05; // ~50 meters
                                    if (distKm <= thresholdKm) {
                                        console.log('[socket] proximity trigger', { rideId: data.rideId, dist_m: (distKm * 1000).toFixed(1) });
                                        // Avoid duplicate completions — re-read ride status from DB
                                        try {
                                            const fresh = await rideModel.findById(data.rideId).lean();
                                            if (fresh && (!fresh.status || fresh.status !== 'completed')) {
                                                // call service to complete ride (matches rideComplete handler behavior)
                                                try {
                                                    const cap = fresh && fresh.captain ? await captainModel.findById(fresh.captain) : null;
                                                    try {
                                                        const completed = await rideService.endRide({ rideId: data.rideId, captain: cap });
                                                        if (completed) {
                                                            console.log('[socket] rideService.endRide success', { rideId: data.rideId });
                                                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('rideStatusUpdate', completed); } catch (e) {}
                                                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('ride-completed', completed); } catch (e) {}
                                                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('rideCompleted', completed); } catch (e) {}
                                                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('ride-completed', completed); } catch (e) {}
                                                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('rideCompleted', completed); } catch (e) {}
                                                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('end-chat', { rideId: data.rideId }); } catch (e) {}
                                                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('end-chat', { rideId: data.rideId }); } catch (e) {}
                                                        }
                                                    } catch (e) {
                                                        console.error('[socket] rideService.endRide error', data.rideId, e);
                                                        // service failed — fallback to simple completion
                                                        try {
                                                            const r2 = await rideModel.findById(data.rideId).populate('user').populate('captain');
                                                            if (r2) {
                                                                r2.status = 'completed';
                                                                r2.completedAt = new Date();
                                                                try { if (r2.paymentMethod === 'card') { r2.paymentStatus = 'paid'; r2.isPaid = true; } } catch (ee) {}
                                                                await r2.save();
                                                                try { io.to(r2.user._id.toString()).emit('rideStatusUpdate', r2); } catch (e) {}
                                                                try { io.to(r2.user._id.toString()).emit('ride-completed', r2); } catch (e) {}
                                                                try { io.to(r2.user._id.toString()).emit('rideCompleted', r2); } catch (e) {}
                                                                try { io.to(r2.user._id.toString()).emit('end-chat', { rideId: data.rideId }); } catch (e) {}
                                                                try { if (r2.captain && r2.captain._id) io.to(r2.captain._id.toString()).emit('end-chat', { rideId: data.rideId }); } catch (e) {}
                                                            }
                                                        } catch (ee) { console.error('[socket] fallback completion error', data.rideId, ee); }
                                                    }
                                                } catch (e) { console.error('[socket] proximity completion outer error', data.rideId, e); }
                                            }
                                        } catch (e) { console.error('[socket] proximity DB read error', data.rideId, e); }
                                    }
                                }
                            } catch (e) {}
                        }
                    } catch (e) {
                        // ignore DB errors here
                    }
                }
            } catch (err) {
                // do not crash socket on errors
            }
        });

        // Allow clients to join a simple personal room by userId (explicit join-room)
        socket.on('join-user-room', (userId) => {
            try {
                if (userId) socket.join(userId.toString());
            } catch (e) {}
        });

        // alias: join-room (used by frontend) -> join personal room
        socket.on('join-room', (userId) => {
            try {
                if (userId) {
                    socket.join(userId.toString());
                    console.log('User joined room:', userId.toString());
                }
            } catch (e) {}
        });

        // Simple ride message relay API: send-ride-message -> receive-ride-message
        socket.on('send-ride-message', (data) => {
            try {
                const { rideId, senderId, receiverId, message } = data || {};
                if (!rideId || !senderId || !receiverId || !message) return;
                // emit to the receiver's personal room using io.to
                try {
                    io.to(receiverId.toString()).emit('receive-ride-message', {
                        rideId,
                        senderId,
                        message,
                        timestamp: new Date()
                    });
                } catch (e) {}
            } catch (e) {
                // ignore
            }
        });

        // New generic send-message -> receive-message (uses to/from keys)
        socket.on('send-message', (data) => {
            try {
                const { to, from, message, rideId } = data || {};
                if (!to || !from || !message) return;
                try {
                    io.to(to.toString()).emit('receive-message', {
                        rideId: rideId || null,
                        from,
                        message,
                        timestamp: new Date()
                    });
                } catch (e) {}
            } catch (e) {}
        });

        

        // Captain can signal the driver has started the trip
        socket.on('rideStart', async (rideId) => {
            try {
                const ride = await rideModel.findById(rideId).populate('user').populate('captain');
                if (!ride) return;
                ride.status = 'ongoing';
                ride.startedAt = new Date();
                await ride.save();
                try { io.to(ride.user._id.toString()).emit('rideStatusUpdate', ride); } catch (e) {}
                try { io.to(ride.user._id.toString()).emit('rideStarted', ride); } catch (e) {}
            } catch (e) {
                // ignore
            }
        });

        // Captain (or test client) signals ride completion
        socket.on('rideComplete', async (rideId) => {
            try {
                // Try to use centralized service logic which computes commission and updates wallet
                try {
                    const ride = await rideModel.findById(rideId).lean();
                    if (!ride) return;
                    if (ride.captain) {
                        const cap = await captainModel.findById(ride.captain);
                        try {
                            const completed = await rideService.endRide({ rideId: rideId, captain: cap });
                            // emit completion events to user and captain rooms
                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('rideStatusUpdate', completed); } catch (e) {}
                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('ride-completed', completed); } catch (e) {}
                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('rideCompleted', completed); } catch (e) {}
                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('ride-completed', completed); } catch (e) {}
                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('rideCompleted', completed); } catch (e) {}
                            try { if (completed && completed.user && completed.user._id) io.to(completed.user._id.toString()).emit('end-chat', { rideId }); } catch (e) {}
                            try { if (completed && completed.captain && completed.captain._id) io.to(completed.captain._id.toString()).emit('end-chat', { rideId }); } catch (e) {}

                            // Fallback emit: query latest captain wallet and emit `wallet-updated` to captain room
                            try {
                                const capId = (completed && completed.captain && (completed.captain._id || completed.captain)) ? (completed.captain._id || completed.captain) : null;
                                if (capId) {
                                    const latestCap = await captainModel.findById(capId).lean();
                                    const payout = (latestCap && latestCap.wallet && typeof latestCap.wallet.balance === 'number') ? latestCap.wallet.balance : (latestCap && latestCap.walletBalance ? latestCap.walletBalance : 0);
                                    try { io.to(capId.toString()).emit('wallet-updated', { availableForPayout: payout }); } catch (e) {}
                                    console.log('Emitted wallet-updated to captain', capId.toString(), 'payout=', payout);
                                }
                            } catch (e) { console.error('wallet-updated fallback emit failed', e); }
                            return;
                        } catch (e) {
                            // fallback to legacy behavior
                        }
                    }
                } catch (e) {}

                // Fallback: simple completion
                const ride = await rideModel.findById(rideId).populate('user').populate('captain');
                if (!ride) return;
                ride.status = 'completed';
                ride.completedAt = new Date();
                try {
                    if (ride.paymentMethod === 'card') {
                        ride.paymentStatus = 'paid';
                        ride.isPaid = true;
                    }
                } catch (e) {}
                await ride.save();
                try { io.to(ride.user._id.toString()).emit('rideStatusUpdate', ride); } catch (e) {}
                try { io.to(ride.user._id.toString()).emit('ride-completed', ride); } catch (e) {}
                try { io.to(ride.user._id.toString()).emit('rideCompleted', ride); } catch (e) {}
                try { io.to(ride.user._id.toString()).emit('end-chat', { rideId }); } catch (e) {}
                try { if (ride.captain && ride.captain._id) io.to(ride.captain._id.toString()).emit('end-chat', { rideId }); } catch (e) {}
            } catch (e) {
                // ignore
            }
        });

        // Chat relay: forward messages between rider and captain for a ride
        socket.on('send-chat-message', async (data) => {
            try {
                const { rideId, text } = data || {};
                if (!rideId || !text) return;
                const ride = await rideModel.findById(rideId).populate('user').populate('captain');
                if (!ride) return;

                // only allow chat when ride is active/accepted/started
                if (['searching', 'cancelled', 'completed'].includes(ride.status)) return;

                // determine sender type by socketId matching
                let sender = null;
                try { sender = await userModel.findOne({ socketId: socket.id }); } catch (e) {}
                let senderType = 'unknown';
                let senderId = null;
                if (sender) { senderType = 'user'; senderId = sender._id; }
                else {
                    try {
                        const cap = await captainModel.findOne({ socketId: socket.id });
                        if (cap) { senderType = 'captain'; senderId = cap._id; }
                    } catch (e) {}
                }

                const payload = {
                    rideId,
                    text,
                    from: senderType,
                    senderId: senderId ? senderId.toString() : null,
                    timestamp: new Date().toISOString()
                };

                // send to both parties (they'll filter/display appropriately)
                try { io.to(ride.user._id.toString()).emit('chat-message', payload); } catch (e) {}
                try { if (ride.captain && ride.captain._id) io.to(ride.captain._id.toString()).emit('chat-message', payload); } catch (e) {}
            } catch (e) {
                // ignore
            }
        });

        socket.on('disconnect', () => {
            // cleanup onlineDrivers map entries referencing this socket
            try {
                for (let id in onlineDrivers) {
                    if (onlineDrivers[id] === socket.id) {
                        delete onlineDrivers[id];
                        console.log(`Removed onlineDrivers entry for ${id} on disconnect`);
                    }
                }
            } catch (e) {}
        });
    });
    return io;
}

const sendMessageToSocketId = (socketId, messageObject) => {

    // //console.log({ body: messageObject, socketId: socketId });

    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        //console.log('Socket.io not initialized.');
    }
}

const emitNewRide = (ride) => {
    if (io) {
        io.emit('new-ride', ride);
    }
}

module.exports = { initializeSocket, sendMessageToSocketId, emitNewRide, ioInstance: () => io, getIO: () => io, onlineDrivers };