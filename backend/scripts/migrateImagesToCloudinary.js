/**
 * Migration script: Upload all local images to Cloudinary and update DB references.
 *
 * Usage:  node scripts/migrateImagesToCloudinary.js
 *
 * What it does:
 *  1. Reads every file in backend/uploads/
 *  2. Uploads each to Cloudinary (profile-images folder)
 *  3. Updates User.profileImage, Captain.profileImage, Captain.vehicle.image,
 *     and SpecialRequest.imageUrl wherever they reference the old local path
 *  4. Prints a summary of migrated files and updated DB records
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { uploadToCloudinary } = require('../config/cloudinary');

const User = require('../models/user.model');
const Captain = require('../models/captain.model');
const SpecialRequest = require('../models/specialRequest.model');

const uploadsDir = path.join(__dirname, '../uploads');

// MongoDB connection string (same as db.js)
const MONGO_URI = process.env.MONGO_URI || process.env.DB_CONNECT ||
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CONTEXT_URL}`;

async function migrate() {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Read all image files from uploads/
    const files = fs.readdirSync(uploadsDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`Found ${files.length} images to migrate\n`);

    // Map: old local path -> new Cloudinary URL
    const urlMap = {};
    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
        const localPath = `/uploads/${file}`;
        const filePath = path.join(uploadsDir, file);

        try {
            const buffer = fs.readFileSync(filePath);
            const result = await uploadToCloudinary(buffer, 'migrated-uploads');
            urlMap[localPath] = result.secure_url;
            uploaded++;
            console.log(`  [${uploaded}/${files.length}] ${file} -> ${result.secure_url}`);
        } catch (err) {
            failed++;
            console.error(`  FAILED: ${file} - ${err.message}`);
        }
    }

    console.log(`\nUpload complete: ${uploaded} succeeded, ${failed} failed`);
    console.log('Updating database references...\n');

    let dbUpdates = 0;

    // Update User.profileImage
    const users = await User.find({ profileImage: { $regex: /^\/uploads\// } });
    for (const user of users) {
        const newUrl = urlMap[user.profileImage];
        if (newUrl) {
            user.profileImage = newUrl;
            await user.save();
            dbUpdates++;
            console.log(`  User ${user.email}: profileImage updated`);
        }
    }

    // Update Captain.profileImage and Captain.vehicle.image
    const captains = await Captain.find({
        $or: [
            { profileImage: { $regex: /^\/uploads\// } },
            { 'vehicle.image': { $regex: /^\/uploads\// } }
        ]
    });
    for (const captain of captains) {
        let changed = false;
        if (captain.profileImage && urlMap[captain.profileImage]) {
            captain.profileImage = urlMap[captain.profileImage];
            changed = true;
            console.log(`  Captain ${captain.email}: profileImage updated`);
        }
        if (captain.vehicle && captain.vehicle.image && urlMap[captain.vehicle.image]) {
            captain.vehicle.image = urlMap[captain.vehicle.image];
            changed = true;
            console.log(`  Captain ${captain.email}: vehicle.image updated`);
        }
        if (changed) {
            await captain.save();
            dbUpdates++;
        }
    }

    // Update SpecialRequest.imageUrl
    const specials = await SpecialRequest.find({ imageUrl: { $regex: /^\/uploads\// } });
    for (const item of specials) {
        const newUrl = urlMap[item.imageUrl];
        if (newUrl) {
            item.imageUrl = newUrl;
            await item.save();
            dbUpdates++;
            console.log(`  SpecialRequest ${item._id}: imageUrl updated`);
        }
    }

    console.log(`\nDone! ${dbUpdates} database records updated.`);
    console.log('You can now safely remove the backend/uploads/ folder if everything looks correct.');

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
