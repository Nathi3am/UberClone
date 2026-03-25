const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const mongoose = require('mongoose');

(async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI not set in backend/.env');
      process.exit(2);
    }
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection failed:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
