require('dotenv').config();
// If no remote URI provided, use local fallback for this script
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/peakuber';
const connectToDb = require('../backend/db/db');
const Captain = require('../backend/models/captain.model');

(async () => {
  try {
    await connectToDb();
    const caps = await Captain.find().sort({ createdAt: -1 }).limit(10).lean();
    const out = caps.map(c => ({
      _id: c._id,
      email: c.email,
      fullname: c.fullname,
      vehicle: c.vehicle,
      license: c.license,
      createdAt: c.createdAt
    }));
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('inspect error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
