const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  pricePerKm: { type: Number, default: 10 },
  baseFare: { type: Number, default: 5 }
  ,
  commissionRate: { type: Number, default: 20 }
  ,
  // timestamp used to scope dashboard aggregations after a manual reset
  dashboardResetAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
