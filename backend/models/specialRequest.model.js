const mongoose = require('mongoose');

const specialRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 250 },
  hourly: { type: Number, required: true, min: 0 },
  daily: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '' },
  availableIn: { type: String, default: 'Immediately' },
  contactName: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

const SpecialRequest = mongoose.model('SpecialRequest', specialRequestSchema);
module.exports = SpecialRequest;
