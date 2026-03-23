/**
 * Multer Configuration for Profile Image Upload
 * Uses memory storage so the buffer can be sent to Cloudinary.
 */

const multer = require('multer');

// Use memory storage — files are kept in buffer, not written to disk
const storage = multer.memoryStorage();

// File filter - only allow jpg/png
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG and PNG files are allowed'), false);
    }
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
