const Settings = require('../models/settings.model');

/**
 * Calculate fare using server-side settings
 * @param {number} distanceInKm
 * @returns {number} fare rounded to 2 decimals
 */
const calculateFare = async (distanceInKm) => {
  const settings = await Settings.findOne();
  const base = (settings && typeof settings.baseFare === 'number') ? settings.baseFare : 0;
  const perKm = (settings && typeof settings.pricePerKm === 'number') ? settings.pricePerKm : 0;
  const fare = Number((base + (Number(distanceInKm) * perKm)).toFixed(2));
  return fare;
};

module.exports = calculateFare;
