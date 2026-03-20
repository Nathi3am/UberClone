const mongoose = require('mongoose');

const specialTripsDriverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  plateNumber: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  imageUrl: { type: String },
  hourlyRate: { type: Number, required: true },
  dayRate: { type: Number, required: true },
  places: { type: [String], default: [] }
  ,
  vehicleType: { type: String },
  vehicleCapacity: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('SpecialTripsDriver', specialTripsDriverSchema);