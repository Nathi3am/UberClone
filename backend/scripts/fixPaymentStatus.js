const mongoose = require('mongoose');
require('../models/ride.model');
const Ride = mongoose.model('Ride');

const MONGO = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/peakuber';

async function run() {
  console.log('Connecting to', MONGO);
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const res = await Ride.updateMany(
      { paymentStatus: { $nin: ['pending', 'paid'] } },
      { $set: { paymentStatus: 'pending', isPaid: false } }
    );
    console.log('Migration complete. Matched:', res.matchedCount || res.n || 0, 'Modified:', res.modifiedCount || res.nModified || 0);
  } catch (err) {
    console.error('Migration failed:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
