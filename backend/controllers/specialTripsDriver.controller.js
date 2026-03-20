const SpecialTripsDriver = require('../models/specialTripsDriver.model');

exports.create = async (req, res) => {
  try {
    // normalize places: allow comma-separated string or array
    const payload = Object.assign({}, req.body);
    if (payload.places && typeof payload.places === 'string') {
      payload.places = payload.places.split(',').map(p => p.trim()).filter(Boolean);
    }
    if (payload.vehicleType && typeof payload.vehicleType === 'string') {
      payload.vehicleType = payload.vehicleType.trim();
    }
    if (payload.vehicleCapacity !== undefined && payload.vehicleCapacity !== null) {
      const vc = Number(payload.vehicleCapacity);
      if (isNaN(vc)) delete payload.vehicleCapacity;
      else payload.vehicleCapacity = vc;
    }
    const driver = await SpecialTripsDriver.create(payload);
    res.status(201).json({ data: driver });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const drivers = await SpecialTripsDriver.find().sort({ createdAt: -1 });
    res.json({ data: drivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const driver = await SpecialTripsDriver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Not found' });
    res.json({ data: driver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payload = Object.assign({}, req.body);
    if (payload.places && typeof payload.places === 'string') {
      payload.places = payload.places.split(',').map(p => p.trim()).filter(Boolean);
    }
    if (payload.vehicleType && typeof payload.vehicleType === 'string') {
      payload.vehicleType = payload.vehicleType.trim();
    }
    if (payload.vehicleCapacity !== undefined && payload.vehicleCapacity !== null) {
      const vc = Number(payload.vehicleCapacity);
      if (isNaN(vc)) delete payload.vehicleCapacity;
      else payload.vehicleCapacity = vc;
    }
    const driver = await SpecialTripsDriver.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!driver) return res.status(404).json({ error: 'Not found' });
    res.json({ data: driver });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const driver = await SpecialTripsDriver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Not found' });
    res.json({ data: driver });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};