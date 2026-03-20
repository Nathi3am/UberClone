const axios = require('axios');

exports.getRoute = async (req, res) => {
  try {
    const { origin, destination, originLat, originLng, destLat, destLng } = req.body;

    let params = {};
    if (origin && destination) {
      params.origin = origin;
      params.destination = destination;
    } else if (originLat && originLng && destLat && destLng) {
      params.origin = `${originLat},${originLng}`;
      params.destination = `${destLat},${destLng}`;
    } else {
      return res.status(400).json({ error: 'origin/destination required' });
    }

    params.key = process.env.GOOGLE_MAPS_API_KEY;

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', { params });

    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      console.error('Directions no routes response', response.data);
      return res.status(500).json({ error: 'No route found', details: response.data });
    }

    const route = response.data.routes[0];
    const leg = route.legs && route.legs[0] ? route.legs[0] : null;

    res.json({
      polyline: route.overview_polyline && route.overview_polyline.points ? route.overview_polyline.points : null,
      duration: leg && leg.duration ? leg.duration.text : null,
      distance: leg && leg.distance ? leg.distance.text : null,
      raw: response.data,
    });
  } catch (error) {
    console.error('Directions error', error.response?.data || error.message || error);
    res.status(500).json({ message: 'Directions fetch failed' });
  }
};
