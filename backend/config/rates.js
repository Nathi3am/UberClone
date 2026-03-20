/**
 * Peak Uber Pricing wrapper that delegates to centralized pricing
 */
const { pricing } = require('./pricing');

const DEFAULTS = {
  baseFare: 20,
  perKm: (pricing && pricing.perKm) ? pricing.perKm : 8,
  perMinute: 1.5,
  minimumFare: 35,
};

function calculateRidePrice(distance, duration) {
  const RATES = DEFAULTS;
  if (!distance || !duration) {
    return RATES.minimumFare;
  }

  const distanceCost = distance * RATES.perKm;
  const durationCost = duration * RATES.perMinute;
  const totalCost = distanceCost + durationCost + RATES.baseFare;

  return Math.max(totalCost, RATES.minimumFare);
}

module.exports = { calculateRidePrice, DEFAULTS };
