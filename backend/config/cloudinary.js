const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The image buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder name (e.g. 'profile-images')
 * @returns {Promise<object>} Cloudinary upload result with secure_url, public_id, etc.
 */
function uploadToCloudinary(fileBuffer, folder = 'uploads') {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
}

module.exports = { cloudinary, uploadToCloudinary };
