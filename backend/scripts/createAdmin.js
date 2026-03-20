const connectToDb = require('../db/db');
const User = require('../models/user.model');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  try {
    connectToDb();
    // wait for mongoose connection
    await new Promise((res) => setTimeout(res, 1000));

    const email = process.argv[2] || 'admin@peakuber.test';
    const password = process.argv[3] || 'password123';
    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = 'admin';
      existing.suspended = false;
      // Update password when provided to ensure we can log in with desired credentials
      if (password) {
        existing.password = await User.hashPassword(password);
      }
      await existing.save();
      console.log('Updated existing user to admin:', email);
      process.exit(0);
    }

    const user = new User({
      fullname: { firstname: 'Admin', lastname: 'User' },
      email,
      password: await User.hashPassword(password),
      role: 'admin',
      suspended: false
    });

    await user.save();
    console.log('Created admin user:', email);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin', err);
    process.exit(1);
  }
}

run();
