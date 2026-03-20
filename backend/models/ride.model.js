const mongoose = require("mongoose");
require("./user.model");
require("./captain.model");

const rideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  captain: { type: mongoose.Schema.Types.ObjectId, ref: "captain", default: null },

  pickupAddress: String,
  dropAddress: String,

  pickupCoords: {
    lat: Number,
    lng: Number,
  },
  dropCoords: {
    lat: Number,
    lng: Number,
  },
  passengers: { type: Number, default: 1 },

  vehicle: String,
  // Legacy compatibility: `fare` kept but prefer detailed fare breakdown fields below
  fare: {
    type: Number,
    required: true,
    default: 0
  },

  // New detailed fare breakdown
  baseFare: { type: Number, default: 0 },
  distanceFare: { type: Number, default: 0 },
  totalFare: { type: Number, default: 0 },

  // distance in km, duration in seconds
  distance: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash'],
    default: 'card'
  },

  status: {
    type: String,
    enum: ["searching", "accepted", "arriving", "started", "ongoing", "completed", "cancelled"],
    default: "searching",
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  driverEarnings: { type: Number, default: 0 },
  platformCommission: { type: Number, default: 0 },
  declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'captain' }],
  rating: { type: Number, default: null },
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("Ride", rideSchema);