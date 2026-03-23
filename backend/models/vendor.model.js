const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  title: { type: String }
}, { _id: false });

const ImageSchema = new mongoose.Schema({
  url: { type: String },
  public_id: { type: String }
}, { _id: false });

const SlotSchema = new mongoose.Schema({
  start: String,
  end: String
}, { _id: false });

const DaySchema = new mongoose.Schema({
  day: String,
  open: { type: Boolean, default: false },
  slots: [SlotSchema]
}, { _id: false });

const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  menuItems: [MenuItemSchema],
  images: [ImageSchema],
  weeklyHours: [DaySchema]
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
