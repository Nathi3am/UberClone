const mongoose = require('mongoose');
const path = require('path');
const argv = process.argv.slice(2);
const email = argv[0];
if (!email) {
  console.error('Usage: node scripts/findCaptain.js <email>');
  process.exit(1);
}

const DB = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/peakuber';
(async () => {
  try {
    await mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true });
    // require captain model
    const Captain = require(path.join(__dirname, '..', 'backend', 'models', 'captain.model'));
    const c = await Captain.findOne({ email: email }).lean();
    if (!c) {
      console.log('Captain not found for email', email);
    } else {
      console.log('Found captain:');
      console.log(JSON.stringify({ _id: c._id, email: c.email, vehicle: c.vehicle }, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('Error', err && err.message ? err.message : err);
    process.exit(2);
  }
})();