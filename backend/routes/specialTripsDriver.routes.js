const express = require('express');
const router = express.Router();

const controller = require('../controllers/specialTripsDriver.controller');
const adminAuth = require('../middleware/adminAuth');

// Public: list and view drivers (no auth required)
router.get('/', controller.list);
router.get('/:id', controller.get);

// Protected: create/update/delete require admin authentication
router.post('/', adminAuth, controller.create);
router.patch('/:id', adminAuth, controller.update);
router.delete('/:id', adminAuth, controller.delete);

module.exports = router;
