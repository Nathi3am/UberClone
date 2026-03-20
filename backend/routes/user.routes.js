const express = require('express');
const { body } = require('express-validator')
const userController = require('../controllers/user.controller');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');

router.post('/register', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('First name must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], (req, res) => {
    // //console.log("Registering user");
    userController.registerUser(req, res);
});

router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], (req, res) => {
    userController.loginUser(req, res);
});

router.get('/profile', authMiddleware.authUser, (req, res) => {
    userController.getUserProfile(req, res);
});

router.post('/push-token', authMiddleware.authUser, (req, res) => {
    userController.savePushToken(req, res);
});

router.get('/logout', authMiddleware.authUser, (req, res) => {
    userController.logoutUser(req, res);
});

router.post('/upload-profile-image', authMiddleware.authUser, upload.single('profileImage'), (req, res) => {
    userController.uploadProfileImage(req, res);
});

router.put(
    '/update-profile',
    [
        authMiddleware.authUser,
        body('email').optional().isEmail().withMessage('Please enter a valid email'),
    ],
    (req, res) => {
        userController.updateProfile(req, res);
    }
);

// Change password
router.put('/change-password', [
    authMiddleware.authUser,
], (req, res) => {
    userController.changePassword(req, res);
});

// Delete account (requires OTP verification)
router.post('/delete', authMiddleware.authUser, (req, res) => {
    userController.deleteAccount(req, res);
});

router.get('/', (req, res) => {
    res.send('Hello World');
});

// Debug: emit a test ride-accepted to a user's socket room (local testing only)
router.post('/debug/emit/:userId', (req, res) => {
    try {
        const { getIO } = require('../socket');
        const io = getIO && getIO();
        const userId = req.params.userId;
        const payload = req.body && Object.keys(req.body).length ? req.body : {
            _id: 'test-ride-' + Date.now(),
            pickupAddress: 'Test Pickup',
            dropAddress: 'Test Drop',
            price: 0,
            status: 'accepted',
            captain: { fullname: { firstname: 'Test', lastname: 'Driver' }, phone: '000' }
        };
        if (io && userId) {
            console.log('Debug emit to user room', userId, 'payload=', payload);
            try { io.to(userId.toString()).emit('ride-accepted', payload); } catch (e) { console.error(e); }
            try { io.to(userId.toString()).emit('rideStatusUpdate', payload); } catch (e) {}
            return res.status(200).json({ ok: true });
        }
        return res.status(400).json({ ok: false, message: 'No io or userId' });
    } catch (err) {
        console.error('debug emit error', err && err.stack ? err.stack : err);
        return res.status(500).json({ ok: false, message: err.message });
    }
});

// Public read endpoint for special requests marketplace
const SpecialRequest = require('../models/specialRequest.model');
router.get('/special-requests', async (req, res) => {
  try {
    const items = await SpecialRequest.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    return res.json({ data: items });
  } catch (err) {
    console.error('Public special requests fetch error:', err);
    return res.status(500).json({ message: 'Error fetching special requests' });
  }
});

module.exports = router;