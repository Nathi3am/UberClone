const express = require('express');
const router = express.Router();
const { getRoute } = require('../controllers/directions.controller');

// Support both POST /directions and POST /directions/route for compatibility
router.post('/', getRoute);
router.post('/route', getRoute);

module.exports = router;
