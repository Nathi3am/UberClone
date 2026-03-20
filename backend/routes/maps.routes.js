const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const mapController = require('../controllers/map.controller');
const { query } = require('express-validator');

router.get('/get-coordinates',
    query('address').isString().notEmpty().isLength({ min: 3 }),
    authMiddleware.authUser,
    mapController.getCoordinates
);

router.get('/get-distance', query('origin').isString().notEmpty().isLength({ min: 3 }),
    query('destination').isString().notEmpty().isLength({ min: 3 }),
    authMiddleware.authUser,
    mapController.getDistance
);



router.get('/get-suggestions',
    query('address').isString().notEmpty().isLength({ min: 3 }),
    authMiddleware.authUser,
    mapController.getSuggestions
)

router.get('/get-prices', mapController.getPrices);

router.get('/directions',
    query('originLat').notEmpty(),
    query('originLng').notEmpty(),
    query('destLat').notEmpty(),
    query('destLng').notEmpty(),
    authMiddleware.authUser,
    mapController.getDirections
);

// Public directions proxy (no auth) - useful for client dev or when auth header is not present
router.get('/directions-proxy',
    query('originLat').notEmpty(),
    query('originLng').notEmpty(),
    query('destLat').notEmpty(),
    query('destLng').notEmpty(),
    mapController.getDirectionsPublic
);

router.get('/nearby',
    query('lat').isString().notEmpty(),
    query('lng').isString().notEmpty(),
    authMiddleware.authUser,
    mapController.getNearbyDrivers
);

module.exports = router;