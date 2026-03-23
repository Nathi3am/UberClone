const express = require('express');
const mongoose = require('mongoose');
const Vendor = require('../models/vendor.model');
const router = express.Router();

// GET /vendors - public endpoint to fetch all vendors.
// If the database is not connected (development fallback), return an empty
// array instead of a 500 so the frontend can continue to render.
router.get('/', async (req, res) => {
  try {
    // If mongoose is not connected, avoid running queries that will fail.
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.warn('[vendors] mongoose not connected (readyState=', mongoose.connection && mongoose.connection.readyState, ') - returning empty vendors list');
      return res.json([]);
    }

    const vendors = await Vendor.find({});
    res.json(vendors);
  } catch (err) {
    console.error('[vendors] Error fetching vendors:', err && err.stack ? err.stack : err);
    // Return an empty list to the client so UI can degrade gracefully.
    res.json([]);
  }
});

module.exports = router;
