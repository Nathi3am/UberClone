const express = require('express');
const Vendor = require('../models/vendor.model');
const router = express.Router();

// GET /vendors - public endpoint to fetch all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.find({});
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

module.exports = router;
