const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const captainController = require('../controllers/captain.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');

router.post('/register', upload.single('profileImage'), [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('vehicle.color').isLength({ min: 3 }).withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate').isLength({ min: 3 }).withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType').isIn(['car', 'motorcycle', 'auto']).withMessage('Please enter a valid vehicle type'),
], (req, res) => {
    // //console.log("Registering captain");
    captainController.registerCaptain(req, res);
});


router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], (req, res) => {
    // //console.log("Logging in captain");
    captainController.loginCaptain(req, res);
});

router.get('/profile', authMiddleware.authCaptain, (req, res) => {
    captainController.getCaptainProfile(req, res);
});

router.post('/push-token', authMiddleware.authCaptain, (req, res) => {
    captainController.savePushToken(req, res);
});

// Driver stats for dashboard
router.get('/stats', authMiddleware.authCaptain, (req, res) => {
    captainController.getStats(req, res);
});
router.get('/logout', authMiddleware.authCaptain, (req, res) => {
    captainController.logoutCaptain(req, res);
});

router.get('/', (req, res) => {
    res.send('Hello World');
});

router.put('/update-profile', authMiddleware.authCaptain, (req, res) => {
    captainController.updateCaptainProfile(req, res);
});

router.post('/upload-profile-image', authMiddleware.authCaptain, upload.single('profileImage'), (req, res) => {
    captainController.uploadProfileImage(req, res);
});

router.post('/upload-vehicle-image', authMiddleware.authCaptain, upload.single('vehicleImage'), (req, res) => {
    captainController.uploadVehicleImage(req, res);
});

// Captain go online/offline
router.post('/go-online', authMiddleware.authCaptain, (req, res) => {
    captainController.goOnline(req, res);
});

router.post('/go-offline', authMiddleware.authCaptain, (req, res) => {
    captainController.goOffline(req, res);
});

router.put('/change-password', authMiddleware.authCaptain, (req, res) => {
    captainController.changePassword(req, res);
});

// Public route to get available drivers
router.get('/available', (req, res) => {
    captainController.getAvailableDrivers(req, res);
});

module.exports = router;