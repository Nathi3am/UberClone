const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const userModel = require('../models/user.model');

(async () => {
  try {
    const MONGO = process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGO;
    if (!MONGO) throw new Error('MONGO_URI not set in backend/.env');
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');
    const email = (process.argv[2] || 'nkosinathiibuta@gmail.com').trim().toLowerCase();
    const newPassword = process.argv[3] || 'Slimshadyxv47!';
    const hashed = await userModel.hashPassword(newPassword);
    const user = await userModel.findOneAndUpdate({ email }, { password: hashed }, { new: true });
    if (!user) {
      console.error('User not found for', email);
      process.exit(2);
    }
    console.log('Password updated for', email);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
