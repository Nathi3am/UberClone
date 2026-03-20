const mapService = require('../services/maps.service');
const { validationResult } = require('express-validator');
const rideService = require('../services/ride.service');
const { pricing } = require('../config/pricing');

module.exports.getCoordinates = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const address = req.query.address;
        const coordinates = await mapService.getAddressCoordinates(address);
        res.json(coordinates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.getDistance = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const origin = req.query.origin;
        const destination = req.query.destination;
        const distance = await mapService.getDistance(origin, destination);
        res.json(distance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.getSuggestions = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const address = req.query.address;
        const suggestions = await mapService.getSuggestions(address);
        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.getPrices = async (req, res) => {
    try {
        const { origin, destination } = req.query;

        if (!origin || !destination) {
            return res.status(400).json({ message: 'Missing origin or destination' });
        }

        // Use Google Directions route distance primarily (real driving distance).
        // Also fetch Distance Matrix distance and prefer the larger value between the two
        // to avoid under-reporting distances when one API returns a shorter/ambiguous result.
        let distanceKm = 0;
        try {
            const originCoords = await mapService.getAddressCoordinates(origin);
            const destCoords = await mapService.getAddressCoordinates(destination);

            // Try Directions API first (preferred for driving distance)
            if (originCoords && destCoords && originCoords.ltd && originCoords.lng && destCoords.ltd && destCoords.lng) {
                const directions = await mapService.getDirections(originCoords.ltd, originCoords.lng, destCoords.ltd, destCoords.lng);
                const leg = directions && directions.distance ? directions.distance : (directions && directions.raw && directions.raw.routes && directions.raw.routes[0] && directions.raw.routes[0].legs && directions.raw.routes[0].legs[0] ? directions.raw.routes[0].legs[0] : null);
                if (leg && leg.distance && typeof leg.distance.value === 'number') {
                    distanceKm = leg.distance.value / 1000;
                }
            }

            // Also fetch Distance Matrix and pick the larger (more conservative / realistic) distance
            try {
                const dm = await mapService.getDistance(origin, destination);
                let dmKm = 0;
                if (typeof dm === 'number') dmKm = dm;
                else if (dm && typeof dm.distanceValue === 'number') dmKm = dm.distanceValue / 1000;
                else if (dm && typeof dm.distanceKm === 'number') dmKm = dm.distanceKm;

                if (dmKm > distanceKm) distanceKm = dmKm;
            } catch (dmErr) {
                // ignore distance matrix failure
            }
        } catch (err) {
            // If geocode/directions fails entirely, fall back to Distance Matrix alone
            try {
                const distanceData = await mapService.getDistance(origin, destination);
                if (typeof distanceData === 'number') {
                    distanceKm = distanceData;
                } else if (distanceData && typeof distanceData.distanceValue === 'number') {
                    distanceKm = distanceData.distanceValue / 1000;
                } else if (distanceData && typeof distanceData.distanceKm === 'number') {
                    distanceKm = distanceData.distanceKm;
                }
            } catch (err2) {
                // leave distanceKm = 0
            }
        }

        const pricePerKm = (pricing && pricing.perKm) ? pricing.perKm : 7.8; // R7.80 per km
        const totalPrice = Math.round(distanceKm * pricePerKm);

        return res.json({
            distance: distanceKm,
            price: totalPrice,
        });
    } catch (err) {
        console.error('PRICE ERROR:', err && err.message ? err.message : err);
        res.status(500).json({ message: 'Price calculation failed' });
    }
};

module.exports.getDirections = async (req, res, next) => {
    try {
        const { originLat, originLng, destLat, destLng } = req.query;
        if (!originLat || !originLng || !destLat || !destLng) {
            return res.status(400).json({ message: 'Missing origin or destination coordinates' });
        }

        const directions = await mapService.getDirections(originLat, originLng, destLat, destLng);
        return res.status(200).json(directions);
    } catch (err) {
        console.error('directions error', err);
        return res.status(500).json({ message: err.message || 'Failed to fetch directions' });
    }
}

// Public directions proxy (no auth) - same behavior as getDirections but without auth middleware
module.exports.getDirectionsPublic = async (req, res, next) => {
    try {
        const { originLat, originLng, destLat, destLng } = req.query;
        if (!originLat || !originLng || !destLat || !destLng) {
            return res.status(400).json({ message: 'Missing origin or destination coordinates' });
        }

        const directions = await mapService.getDirections(originLat, originLng, destLat, destLng);
        return res.status(200).json(directions);
    } catch (err) {
        console.error('directions-proxy error', err && err.message ? err.message : err);
        return res.status(500).json({ message: err.message || 'Failed to fetch directions' });
    }
}

module.exports.getNearbyDrivers = async (req, res, next) => {
    try {
        const { lat, lng } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ message: 'Invalid latitude or longitude' });
        }

        const nearbyDrivers = await mapService.getNearbyDrivers(latitude, longitude);
        res.json(nearbyDrivers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
