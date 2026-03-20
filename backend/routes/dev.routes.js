const express = require('express');
const router = express.Router();
const Settings = require('../models/settings.model');

// Dev-only endpoint to emit a test new-ride-request to drivers
router.post('/emit-test', async (req, res) => {
    try {
        const body = req.body || {};
        const distance = Number(body.distance || 5);
        const settings = await Settings.findOne().catch(() => null);
        const baseFare = (typeof body.baseFare === 'number') ? body.baseFare : (settings && typeof settings.baseFare === 'number' ? settings.baseFare : 0);
        const pricePerKm = (typeof body.pricePerKm === 'number') ? body.pricePerKm : (settings && typeof settings.pricePerKm === 'number' ? settings.pricePerKm : 0);

        const fare = Number((baseFare + (distance * pricePerKm)).toFixed(2));

        // compute commission and driver earnings using Settings
        let commissionRateDecimal = (settings && typeof settings.commissionRate === 'number') ? (settings.commissionRate / 100) : 0.20;
        const commission = Number((fare * commissionRateDecimal).toFixed(2));
        const driverEarnings = Number((fare - commission).toFixed(2));

        const payload = {
            _id: `dev-${Date.now()}`,
            rideId: `dev-${Date.now()}`,
            pickupAddress: body.pickupAddress || 'Dev Pickup',
            dropAddress: body.dropAddress || 'Dev Drop',
            distance: distance,
            fare: fare,
            driverEarnings: driverEarnings,
            platformCommission: commission,
            baseFare: baseFare,
            pricePerKm: pricePerKm,
            etaDisplay: body.etaDisplay || '5 min'
        };

        const { getIO } = require('../socket');
        const io = getIO && getIO();
        // emit to a specific captain room if provided, else broadcast
        if (io) {
            if (body.captainId) {
                io.to(body.captainId.toString()).emit('new-ride-request', payload);
            }
            try { io.to('onlineCaptains').emit('new-ride-request', payload); } catch (e) {}
            try { io.emit('new-ride-request', payload); } catch (e) {}
        }

        console.log('Dev emit payload:', payload);
        return res.status(200).json({ emitted: true, payload });
    } catch (err) {
        console.error('emit-test error:', err);
        return res.status(500).json({ message: err.message || 'error' });
    }
});

module.exports = router;
