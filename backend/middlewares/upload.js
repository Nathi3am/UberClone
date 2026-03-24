/**
 * Multer Configuration for Profile Image Upload
 * Uses memory storage so the buffer can be sent to Cloudinary.
 */

const multer = require('multer');

// Use memory storage — files are kept in buffer, not written to disk
const storage = multer.memoryStorage();

// File filter - allow common image types (jpg/png/webp/gif)
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) return cb(null, true);

    const err = new Error('INVALID_FILE_TYPE: Only JPG, PNG, WEBP and GIF files are allowed');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
};

// Create multer upload middleware
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

module.exports = upload;
