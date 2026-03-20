const axios = require('axios');
const captainModel = require('../models/captain.model');

const GOOGLE_API = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API;

function ensureApiKey() {
  if (!GOOGLE_API || GOOGLE_API === 'YOUR_GOOGLE_KEY_HERE' || GOOGLE_API === 'your_google_maps_api_key') {
    const err = new Error('Missing or invalid Google Maps API key. Please set GOOGLE_MAPS_API_KEY in your .env');
    err.code = 'MISSING_GOOGLE_API_KEY';
    throw err;
  }
}

module.exports.getAddressCoordinates = async (address) => {
  try {
    ensureApiKey();
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: GOOGLE_API
      }
    });

    if (response.data.status === 'OK') {
      const location = response.data.results[0].geometry.location;
      return {
        ltd: location.lat,
        lng: location.lng
      };
    } else {
      throw new Error('Unable to fetch coordinates');
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports.getDistance = async (origin, destination) => {
  if (!origin || !destination) return 0;

  ensureApiKey();

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: origin,
          destinations: destination,
          key: GOOGLE_API,
        },
      }
    );

    const element = response?.data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      // Return 0 when Google can't provide a valid distance (avoid throwing 500)
      return 0;
    }

    const distanceMeters = element.distance?.value || 0;
    const distanceKm = distanceMeters / 1000;
    return distanceKm;
  } catch (err) {
    console.error('getDistance error:', err);
    return 0;
  }
}

module.exports.getSuggestions = async (address) => {
  try {
    ensureApiKey();
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: address,
        key: GOOGLE_API
      }
    });

    if (data.status === 'OK' && data.predictions) {
      return data.predictions;
    } else {
      return [];
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
  const captains = await captainModel.find({
    location: {
      $geoWithin: {
        $centerSphere: [[ltd, lng], radius / 6371]
      }
    }
  });

  return captains;
}

module.exports.getNearbyDrivers = async (lat, lng, distance) => {
  const radiusKm = 5; // Search within 5 km radius
  try {
    const captains = await captainModel.find({ status: 'active' })
      .select('_id fullname profileImage vehicle location socketId status');

    const { pricing } = require('../config/pricing');

    const driversWithDistance = captains.map((captain) => {
      const R = 6371; // Earth's radius in kilometers
      if (!captain.location || captain.location.ltd === undefined || captain.location.lng === undefined) {
        return null;
      }

      const lat1 = lat * Math.PI / 180;
      const lat2 = captain.location.ltd * Math.PI / 180;
      const dLat = (captain.location.ltd - lat) * Math.PI / 180;
      const dLng = (captain.location.lng - lng) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const calculatedDistance = R * c;

      if (calculatedDistance > radiusKm) {
        return null;
      }

      const estimatedPrice = (calculatedDistance * pricing.perKm).toFixed(2);

      return {
        _id: captain._id,
        fullname: captain.fullname,
        profileImage: captain.profileImage,
        vehicle: captain.vehicle,
        distance: calculatedDistance.toFixed(1),
        estimatedPrice: parseFloat(estimatedPrice),
        socketId: captain.socketId,
        status: captain.status
      };
    }).filter(driver => driver !== null);

    return driversWithDistance.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    throw error;
  }
}

module.exports.getDirections = async (originLat, originLng, destLat, destLng) => {
  try {
    ensureApiKey();

    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin,
        destination,
        key: GOOGLE_API,
        mode: 'driving',
      }
    });

    if (!response || !response.data) {
      throw new Error('No directions response');
    }

    const data = response.data;
    if (data.status !== 'OK') {
      // return null gracefully
      return { status: data.status, routes: data.routes || [] };
    }

    const route = data.routes[0];
    const leg = route.legs && route.legs[0];

    return {
      overview_polyline: route.overview_polyline,
      duration: leg && leg.duration ? leg.duration : null,
      distance: leg && leg.distance ? leg.distance : null,
      raw: data
    };
  } catch (err) {
    console.error('getDirections error:', err && err.message ? err.message : err);
    throw err;
  }
}