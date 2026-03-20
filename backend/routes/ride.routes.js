const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const { body, query, param } = require('express-validator');
const authMiddleware = require('../middlewares/auth.middleware');
router.post(
    '/create',
    authMiddleware.authUser,
    body('pickupAddress').isString().notEmpty().isLength({ min: 3 }).withMessage('Invalid pickupAddress'),
    body('dropAddress').isString().notEmpty().isLength({ min: 3 }).withMessage('Invalid dropAddress'),
    body('distance').isFloat({ gt: 0 }).withMessage('Invalid distance'),
    body('pickupCoords.lat').optional().isFloat().withMessage('Invalid pickupCoords.lat'),
    body('pickupCoords.lng').optional().isFloat().withMessage('Invalid pickupCoords.lng'),
    body('dropCoords.lat').optional().isFloat().withMessage('Invalid dropCoords.lat'),
    body('dropCoords.lng').optional().isFloat().withMessage('Invalid dropCoords.lng'),
    rideController.createRide
);
router.post('/confirm',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.confirmRide
)

router.get('/start-ride',
    authMiddleware.authCaptain,
    query('rideId').isMongoId().withMessage('Invalid ride id'),
    // OTP is optional; validate only when provided
    query('otp').optional().isString().isLength({ min: 6, max: 6 }).withMessage('Invalid OTP'),
    rideController.startRide
)

router.post('/end-ride',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.endRide
)

router.post('/end',
    authMiddleware.authCaptain,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.endRide
)

router.post('/complete/:rideId',
    authMiddleware.authCaptain,
    rideController.completeRide
)
// support PUT /complete/:id as an alternative (client may use PUT)
router.put('/complete/:id',
    authMiddleware.authCaptain,
    rideController.completeRide
)

router.get('/pending',
    authMiddleware.authCaptain,
    rideController.getPendingRides
)

router.get('/completed',
    authMiddleware.authCaptain,
    rideController.getCompletedRides
)

router.get('/history',
    authMiddleware.authUser,
    rideController.getRideHistory
)
// returns count of completed rides for authenticated user
router.get('/count',
    authMiddleware.authUser,
    rideController.getRideCount
)

// alias for client: my rides
router.get('/my-rides',
    authMiddleware.authUser,
    rideController.getRideHistory
)
// update ride status (captain controls)
router.post('/status',
    authMiddleware.authCaptain,
    rideController.updateRideStatus
)
// Get currently active ride for user
router.get('/active',
    authMiddleware.authUser,
    rideController.getActiveRide
)
// fare estimate (server-side)
router.post('/estimate', rideController.getFareEstimate);
router.patch('/:id/accept',
    authMiddleware.authCaptain,
    param('id').isMongoId().withMessage('Invalid ride id'),
    rideController.acceptRide
)

router.patch('/:id/decline',
    authMiddleware.authCaptain,
    param('id').isMongoId().withMessage('Invalid ride id'),
    rideController.declineRide
)

router.post('/cancel',
    authMiddleware.authUser,
    body('rideId').isMongoId().withMessage('Invalid ride id'),
    rideController.cancelRide
)

// cancel by param (convenience)
router.post('/:id/cancel',
    authMiddleware.authUser,
    rideController.cancelRideById
)

// Alias route using param name `rideId` for convenience
router.post('/:rideId/cancel',
    authMiddleware.authUser,
    rideController.cancelRideById
)

// submit rating for a completed ride
router.post('/:rideId/rate',
    authMiddleware.authUser,
    body('rating').isFloat({ min: 1, max: 5 }).withMessage('Invalid rating'),
    rideController.rateRide
)

module.exports = router;