// Admin: Create a new vendor (Local Vendor)
exports.createVendor = async (req, res) => {
  try {
    // Helper to parse JSON fields that arrive as strings in multipart requests
    const parseJson = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch (e) { return null; }
    };

    const name = (req.body.name || '').trim();
    const phones = parseJson(req.body.phones) || (req.body.phones ? [req.body.phones] : []);
    const menuItems = parseJson(req.body.menuItems) || parseJson(req.body.menu) || [];
    const website = (req.body.website || '').trim();
    const social = parseJson(req.body.social) || [];
    const address = (req.body.address || '').trim();
    const weeklyHours = parseJson(req.body.weeklyHours) || [];
    const deliveryOption = req.body.deliveryOption === 'true' || req.body.deliveryOption === true;
    const collectionOption = req.body.collectionOption === 'true' || req.body.collectionOption === true;

    if (!name) return res.status(400).json({ message: 'Vendor name is required' });

    if (!Array.isArray(social) || !social.every(s => s && s.platform && s.url)) {
      return res.status(400).json({ message: 'Social media must be an array of {platform, url} objects' });
    }

    // Process file uploads (multer memory storage)
    const imagesResult = [];
    let profileImageResult = null;

    if (req.files) {
      // profilePic may be single
      if (req.files.profilePic && req.files.profilePic.length > 0) {
        try {
          const uploaded = await uploadToCloudinary(req.files.profilePic[0].buffer, 'vendors');
          profileImageResult = { url: uploaded.secure_url, public_id: uploaded.public_id };
        } catch (e) {
          console.error('Profile image upload error:', e);
          return res.status(500).json({ message: 'Error uploading profile image' });
        }
      }

      // images array
      if (req.files.images && req.files.images.length > 0) {
        for (const f of req.files.images) {
          try {
            const uploaded = await uploadToCloudinary(f.buffer, 'vendors');
            imagesResult.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
          } catch (e) {
            console.error('Image upload error:', e);
            return res.status(500).json({ message: 'Error uploading images' });
          }
        }
      }
    }

    const vendorPayload = {
      name,
      phones,
      menuItems,
      images: imagesResult,
      website,
      social,
      address,
      weeklyHours,
      deliveryOption,
      collectionOption
    };
    if (profileImageResult) vendorPayload.profileImage = profileImageResult;

    const vendor = await Vendor.create(vendorPayload);
    return res.status(201).json({ data: vendor });
  } catch (err) {
    console.error('createVendor error:', err);
    return res.status(500).json({ message: 'Error creating vendor' });
  }
};
// Admin: Delete a vendor and its images from Cloudinary
exports.deleteVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    if (!vendorId) return res.status(400).json({ message: 'vendor id required' });
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // collect public_ids
    const toDelete = [];
    if (vendor.profileImage && vendor.profileImage.public_id) toDelete.push(vendor.profileImage.public_id);
    if (Array.isArray(vendor.images)) {
      for (const img of vendor.images) if (img && img.public_id) toDelete.push(img.public_id);
    }

    // destroy on Cloudinary (best-effort)
    try {
      for (const pid of toDelete) {
        try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('cloudinary destroy failed for', pid, e); }
      }
    } catch (e) {}

    await Vendor.deleteOne({ _id: vendorId });
    return res.json({ message: 'Vendor deleted' });
  } catch (err) {
    console.error('deleteVendor error:', err);
    return res.status(500).json({ message: 'Error deleting vendor' });
  }
};

const Ride = require('../models/ride.model');
const User = require('../models/user.model');
const Captain = require('../models/captain.model');
const Payout = require('../models/payout.model');
const SpecialRequest = require('../models/specialRequest.model');
const blacklistTokenModel = require('../models/blacklistToken.model');
const fs = require('fs');
const path = require('path');
const Audit = require('../models/audit.model');
const { sendMessageToSocketId } = require('../socket');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');
const Vendor = require('../models/vendor.model');
const mongoose = require('mongoose');

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Helper: compute dashboard stats scoped to optional reset timestamp in Settings
async function computeDashboardStats() {
  const Settings = require('../models/settings.model');
  const settings = await Settings.findOne().catch(() => null);
  const resetAt = settings && settings.dashboardResetAt ? new Date(settings.dashboardResetAt) : null;

  // build match for completed rides respecting resetAt
  const completedMatch = { status: 'completed' };
  if (resetAt) completedMatch.completedAt = { $gte: resetAt };

  // total completed rides since resetAt (or all time if null)
  const totalRides = await Ride.countDocuments(completedMatch).catch(() => 0);

  // totals aggregation for revenue and commission since resetAt
  const totalsAgg = await Ride.aggregate([
    { $match: completedMatch },
    { $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ["$totalFare", "$fare", 0] } },
        totalCommission: { $sum: { $ifNull: ["$platformCommission", "$commission", 0] } }
    } }
  ]).allowDiskUse(true).catch(() => []);
  const totalRevenue = (totalsAgg && totalsAgg[0] && totalsAgg[0].totalRevenue) ? totalsAgg[0].totalRevenue : 0;
  const totalCommission = (totalsAgg && totalsAgg[0] && totalsAgg[0].totalCommission) ? totalsAgg[0].totalCommission : 0;

  const totalUsers = await User.countDocuments({ role: 'user' }).catch(() => 0);
  // Count approved drivers across Captain and legacy User records, deduped by email
  const captainCount = await Captain.countDocuments({ isApproved: true }).catch(() => 0);
  let legacyCaptainCount = 0;
  try {
    const captainEmails = await Captain.distinct('email', { isApproved: true });
    legacyCaptainCount = await User.countDocuments({ role: 'captain', isApproved: true, email: { $nin: captainEmails } });
  } catch (e) {
    legacyCaptainCount = await User.countDocuments({ role: 'captain', isApproved: true }).catch(() => 0);
  }
  const totalDrivers = Number(captainCount || 0) + Number(legacyCaptainCount || 0);

  // commission rate fallback
  const commissionRateDecimal = (settings && typeof settings.commissionRate === 'number') ? (settings.commissionRate / 100) : 0.2;

  // compute today's metrics (todayStart vs resetAt)
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const lowerBound = resetAt && resetAt > todayStart ? resetAt : todayStart;

  const completedRidesToday = await Ride.find({ status: 'completed', completedAt: { $gte: lowerBound } }).lean().catch(() => []);

  let todayRevenue = 0;
  let platformCommissionToday = 0;
  let totalFareTodayMissingCommission = 0;
  for (const r of completedRidesToday) {
    const fare = Number(r.totalFare ?? r.fare ?? 0) || 0;
    todayRevenue += fare;
    const pc = (typeof r.platformCommission === 'number') ? r.platformCommission : (typeof r.commission === 'number' ? r.commission : null);
    if (pc !== null && !isNaN(pc)) platformCommissionToday += Number(pc || 0);
    else totalFareTodayMissingCommission += fare;
  }
  if (totalFareTodayMissingCommission > 0) platformCommissionToday += Number((totalFareTodayMissingCommission * commissionRateDecimal).toFixed(2));

  // platform total commission since resetAt (or all time)
  let platformTotalCommission = 0;
  try {
    const aggAll = await Ride.aggregate([
      { $match: completedMatch },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", "$commission", 0] } } } }
    ]).allowDiskUse(true).catch(() => []);
    platformTotalCommission = (aggAll && aggAll[0] && aggAll[0].total) ? Number(aggAll[0].total) : Number(totalCommission || 0);
  } catch (e) { platformTotalCommission = Number(totalCommission || 0); }

  // If aggregation returned 0, approximate using fares since reset
  try {
    if ((!platformTotalCommission || Number(platformTotalCommission) === 0)) {
      const fareAgg = await Ride.aggregate([
        { $match: completedMatch },
        { $group: { _id: null, totalFare: { $sum: { $ifNull: ["$totalFare", "$fare", 0] } } } }
      ]).allowDiskUse(true).catch(() => []);
      const totalFareAll = (fareAgg && fareAgg[0] && fareAgg[0].totalFare) ? fareAgg[0].totalFare : 0;
      platformTotalCommission = Number((totalFareAll * commissionRateDecimal).toFixed(2));
    }
  } catch (e) {}

  // compute averages using resetAt as start date if present
  let avgTripsPerDay = 0;
  let avgPlatformCommissionPerDay = 0;
  try {
    let startDate = resetAt || null;
    if (!startDate) {
      const earliest = await Ride.findOne({ status: 'completed' }).sort({ createdAt: 1 }).select('createdAt').lean().catch(() => null);
      if (earliest && earliest.createdAt) startDate = new Date(earliest.createdAt);
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = startDate ? Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / msPerDay)) : 1;
    avgTripsPerDay = Number((Number(totalRides || 0) / days).toFixed(2));
    avgPlatformCommissionPerDay = Number((Number(platformTotalCommission || 0) / days).toFixed(2));
  } catch (e) { avgTripsPerDay = 0; avgPlatformCommissionPerDay = 0; }

  todayRevenue = Number((todayRevenue || 0).toFixed(2));
  platformCommissionToday = Number((platformCommissionToday || 0).toFixed(2));

  return {
    totalRides,
    totalRevenue: Number((totalRevenue || 0).toFixed(2)),
    totalCommission: Number((totalCommission || 0).toFixed(2)),
    totalUsers,
    totalDrivers,
    completedToday: (completedRidesToday && Array.isArray(completedRidesToday)) ? completedRidesToday.length : 0,
    todayRevenue,
    platformCommissionToday,
    platformTotalCommission,
    avgPlatformCommissionPerDay,
    avgTripsPerDay
  };
}

// Return dashboard stats (scoped to reset timestamp) and owedToPlatform
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await computeDashboardStats();
    // compute owed to platform separately (unpaid CASH rides, but scoped to reset if present)
    let owedToPlatform = 0;
    try {
      const Settings = require('../models/settings.model');
      const settings = await Settings.findOne().catch(() => null);
      const resetAt = settings && settings.dashboardResetAt ? new Date(settings.dashboardResetAt) : null;
      const unpaidMatch = { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] };
      if (resetAt) unpaidMatch.completedAt = { $gte: resetAt };
      const unpaidCashAgg = await Ride.aggregate([
        { $match: unpaidMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
      ]).allowDiskUse(true).catch(() => []);
      owedToPlatform = (unpaidCashAgg && unpaidCashAgg[0] && unpaidCashAgg[0].total) ? unpaidCashAgg[0].total : 0;
    } catch (e) { owedToPlatform = 0; }

    return res.json(Object.assign({}, stats, { owedToPlatform }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

// Return basic driver balances for admin payout page
exports.getDriverBalances = async (req, res) => {
  try {
    const drivers = await Captain.find().lean();

    // Aggregate unpaid CASH rides' platformCommission per driver (captain)
    let owedAgg = [];
    try {
      owedAgg = await require('../models/ride.model').aggregate([
        { $match: { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
        { $group: { _id: '$captain', owed: { $sum: { $ifNull: ['$platformCommission', 0] } } } }
      ]);
    } catch (e) {
      owedAgg = [];
    }

    const owedMap = (owedAgg || []).reduce((acc, row) => {
      if (!row || !row._id) return acc;
      acc[row._id.toString()] = Number(row.owed || 0);
      return acc;
    }, {});

    const mapped = drivers.map((d) => ({
      _id: d._id,
      fullname: d.fullname && d.fullname.firstname ? `${d.fullname.firstname} ${d.fullname.lastname || ''}`.trim() : (d.fullname || ''),
      email: d.email || '',
      walletBalance: Number((d.wallet && typeof d.wallet.balance === 'number') ? d.wallet.balance : (d.walletBalance || 0)),
      totalEarnings: Number(d.totalEarnings || 0),
      wallet: d.wallet || { balance: 0, totalEarned: 0, totalCommission: 0, totalPaidOut: 0 },
      owedToPlatform: Number((d.wallet && typeof d.wallet.totalCommission === 'number') ? d.wallet.totalCommission : (owedMap[d._id.toString()] || 0)),
      // driverPayout = availableForPayout - owedToPlatform
      driverPayout: Number(( ( (d.wallet && typeof d.wallet.balance === 'number') ? d.wallet.balance : (d.walletBalance || 0) ) - Number((d.wallet && typeof d.wallet.totalCommission === 'number') ? d.wallet.totalCommission : (owedMap[d._id.toString()] || 0)) ).toFixed(2))
    }));

    return res.json(mapped);
  } catch (err) {
    console.error('getDriverBalances error:', err);
    return res.status(500).json({ message: 'Error fetching balances' });
  }
};

// Return list of payouts (admin view)
exports.getPayouts = async (req, res) => {
  try {
    const PayoutModel = require('../models/payout.model');
    const payouts = await PayoutModel.find().populate('driver', 'fullname email').sort({ createdAt: -1 }).lean();
    return res.json(payouts);
  } catch (err) {
    console.error('getPayouts error:', err);
    return res.status(500).json({ message: 'Error fetching payouts' });
  }
};

// Mark driver as paid (create payout record and reset wallet)
exports.payDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });

    const driver = await Captain.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const available = (driver.wallet && typeof driver.wallet.balance === 'number') ? driver.wallet.balance : (driver.walletBalance || 0);

    // compute owed-to-platform for this driver (prefer stored wallet.totalCommission)
    let driverOwed = (driver.wallet && Number(driver.wallet.totalCommission || 0)) || 0;
    if (!driverOwed) {
      try {
        const agg = await Ride.aggregate([
          { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
        ]);
        driverOwed = (agg && agg[0] && agg[0].total) ? agg[0].total : 0;
      } catch (e) {
        driverOwed = 0;
      }
    }

    const payAmount = Number((Number(available || 0) - Number(driverOwed || 0)).toFixed(2));
    if (!payAmount || payAmount <= 0) return res.status(400).json({ message: 'No payable balance (available minus owed is <= 0)' });

    const payout = await Payout.create({ driver: driver._id, amount: Number(payAmount), method: req.body.method || 'EFT' });

    // update wallet totals: record paid out and clear available/net balances
    try {
      driver.wallet = driver.wallet || {};
      // increase totalPaidOut by the actual amount paid
      driver.wallet.totalPaidOut = (driver.wallet.totalPaidOut || 0) + Number(payAmount);
      // After paying driver, clear available balance and platform owed so UI shows zeroed state
      driver.wallet.balance = 0;
      driver.wallet.totalCommission = 0;
    } catch (e) {
      // fallback to legacy field
      driver.walletBalance = 0;
    }

    // keep backward compat field in sync
    driver.walletBalance = Number((Number(driver.wallet && driver.wallet.balance) || 0));
    await driver.save();

    // Ensure unpaid CASH rides for this driver are marked paid so aggregates reflect this payout
    try {
      const RideModel = require('../models/ride.model');
      await RideModel.updateMany(
        { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] },
        { $set: { isPaid: true, paymentStatus: 'paid', paidAt: new Date() } }
      );
    } catch (e) {
      // ignore; we'll still re-query fresh driver state below
    }

    // Re-read the driver from DB to get authoritative wallet fields after save/update
    let freshDriver = null;
    try { freshDriver = await Captain.findById(driver._id).lean(); } catch (e) { freshDriver = driver; }

    // notify driver via socket if connected so their UI updates immediately
    try {
      // compute fresh values for emits using DB state and aggregations
      const remainingAvailable = (freshDriver && freshDriver.wallet && typeof freshDriver.wallet.balance === 'number') ? freshDriver.wallet.balance : (freshDriver && freshDriver.walletBalance ? freshDriver.walletBalance : 0);
      let driverOwedNow = 0;
      try {
        const aggDriverNow = await Ride.aggregate([
          { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
        ]);
        driverOwedNow = (aggDriverNow && aggDriverNow[0] && aggDriverNow[0].total) ? aggDriverNow[0].total : ((freshDriver && Number(freshDriver.wallet && freshDriver.wallet.totalCommission || 0)) || 0);
      } catch (e) {
        driverOwedNow = (freshDriver && Number(freshDriver.wallet && freshDriver.wallet.totalCommission || 0)) || 0;
      }
      const driverPayoutAfter = Number((Number(remainingAvailable || 0) - Number(driverOwedNow || 0)).toFixed(2));
      const payload = { availableForPayout: Number(remainingAvailable || 0), owedToPlatform: Number(driverOwedNow || 0), driverPayout: Number(driverPayoutAfter || 0) };

      if (driver && driver.socketId) {
        try { sendMessageToSocketId(driver.socketId, { event: 'wallet-updated', data: payload }); } catch (e) {}
      }
      try {
        const { getIO } = require('../socket');
        const io = getIO && getIO();
        if (io && driver && driver._id) {
          try { try { console.log('emitting wallet-updated to driver', driver._id.toString(), payload); } catch (e) {} ; io.to(driver._id.toString()).emit('wallet-updated', payload); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {}

    // Broadcast updated owed totals to admin dashboards
    try {
      const { getIO } = require('../socket');
      const io = getIO && getIO();
          if (io) {
            try {
              const Ride = require('../models/ride.model');
              const agg = await Ride.aggregate([
                { $match: { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
                { $group: { _id: null, total: { $sum: { $ifNull: ['$platformCommission', 0] } } } }
              ]);
              const totalOwed = (agg && agg[0] && agg[0].total) ? agg[0].total : 0;
              try {
                // recompute per-driver owed using fresh DB state
                let driverOwedNowAdmin = 0;
                try {
                  const aggDriverAdmin = await Ride.aggregate([
                    { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
                  ]);
                  driverOwedNowAdmin = (aggDriverAdmin && aggDriverAdmin[0] && aggDriverAdmin[0].total) ? aggDriverAdmin[0].total : ((freshDriver && Number(freshDriver.wallet && freshDriver.wallet.totalCommission || 0)) || 0);
                } catch (e) {
                  driverOwedNowAdmin = (freshDriver && Number(freshDriver.wallet && freshDriver.wallet.totalCommission || 0)) || 0;
                }
                const remainingAvailableAdmin = (freshDriver && freshDriver.wallet && typeof freshDriver.wallet.balance === 'number') ? freshDriver.wallet.balance : (freshDriver && freshDriver.walletBalance ? freshDriver.walletBalance : 0);
                const driverPayoutNow = Number((Number(remainingAvailableAdmin || 0) - Number(driverOwedNowAdmin || 0)).toFixed(2));
                const adminPayload = { driverId: driver._id.toString(), owedToPlatform: Number(driverOwedNowAdmin || 0), totalOwed: Number(totalOwed || 0), driverPayout: driverPayoutNow };
                try { console.log('emitting owed-updated to admins:', adminPayload); } catch (e) {}
                io.to('admins').emit('owed-updated', adminPayload);
              } catch (e) {}
            } catch (e) {}
          }
    } catch (e) {}

    return res.json({ message: 'Driver paid successfully', payout });
  } catch (err) {
    console.error('payDriver error:', err);
    return res.status(500).json({ message: 'Payment error' });
  }
};

// Get detailed driver wallet for admin
exports.getDriverWallet = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });
    const driver = await Captain.findById(driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const wallet = driver.wallet || { balance: driver.walletBalance || 0, totalEarned: driver.totalEarnings || 0, totalCommission: 0, totalPaidOut: 0 };

    // compute owed-to-platform for this driver (sum of platformCommission for unpaid CASH rides)
    let owedToPlatform = 0;
    try {
      const owedAgg = await require('../models/ride.model').aggregate([
        { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
        { $group: { _id: '$captain', total: { $sum: { $ifNull: ['$platformCommission', 0] } } } }
      ]);
      owedToPlatform = (owedAgg && owedAgg[0] && owedAgg[0].total) ? owedAgg[0].total : 0;
    } catch (e) { owedToPlatform = 0; }

    const available = (wallet && typeof wallet.balance === 'number') ? wallet.balance : (driver.walletBalance || 0);
    const driverPayout = Number((available - Number(owedToPlatform || 0)).toFixed(2));

    return res.json({ wallet, owedToPlatform, driverPayout });
  } catch (err) {
    console.error('getDriverWallet error:', err);
    return res.status(500).json({ message: 'Error fetching wallet' });
  }
};

// Clear driver debt (when driver pays platform cash)
exports.settleDriverDebt = async (req, res) => {
  try {
    const driverId = req.params.driverId;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });
    const driver = await Captain.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    // Determine owed-to-platform for this driver. Prefer stored wallet.totalCommission
    let driverOwed = 0;
    try {
      driverOwed = (driver.wallet && Number(driver.wallet.totalCommission || 0)) || 0;
      // If no stored commission, fallback to aggregating unpaid completed cash rides
      if (!driverOwed) {
        const agg = await Ride.aggregate([
          { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
          { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
        ]);
        driverOwed = (agg && agg[0] && agg[0].total) ? agg[0].total : 0;
      }
    } catch (e) {
      driverOwed = 0;
    }

    if (!driverOwed || Number(driverOwed) <= 0) return res.status(400).json({ message: 'Driver has no debt' });

    // Mark unpaid CASH rides for this driver as paid and clear stored wallet commission
    try {
      const RideModel = require('../models/ride.model');
      await RideModel.updateMany(
        { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] },
        { $set: { isPaid: true, paymentStatus: 'paid', paidAt: new Date() } }
      );
    } catch (e) {
      // proceed even if marking rides as paid fails; we'll still clear stored commission
    }

    try {
      driver.wallet = driver.wallet || {};
      driver.wallet.totalCommission = 0;
    } catch (e) {
      // fallback: clear legacy field if present
      try { driver.walletBalance = driver.walletBalance || 0; } catch (ee) {}
    }
    await driver.save();
    // Re-read driver after updates so emits use authoritative DB state
    let freshDriver = null;
    try { freshDriver = await Captain.findById(driver._id).lean(); } catch (e) { freshDriver = driver; }
    // notify the driver client of updated wallet values so UI updates
    try {
      const { getIO } = require('../socket');
      const io = getIO && getIO();
      const remainingAvailable = (freshDriver && freshDriver.wallet && typeof freshDriver.wallet.balance === 'number') ? freshDriver.wallet.balance : (freshDriver && freshDriver.walletBalance ? freshDriver.walletBalance : 0);
      const payloadDriver = { availableForPayout: Number(remainingAvailable || 0), owedToPlatform: 0, driverPayout: Number(remainingAvailable || 0) };
      try { if (driver && driver.socketId) sendMessageToSocketId(driver.socketId, { event: 'wallet-updated', data: payloadDriver }); } catch (e) {}
      if (io && driver && driver._id) try { io.to(driver._id.toString()).emit('wallet-updated', payloadDriver); } catch (e) {}
    } catch (e) {}
    // notify admins of updated owed totals
    // notify admins of updated owed totals
    try {
      const { getIO } = require('../socket');
      const io = getIO && getIO();
          if (io) {
            try {
              const RideModel = require('../models/ride.model');
              const agg = await RideModel.aggregate([
                { $match: { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
              ]);
              const totalOwed = (agg && agg[0] && agg[0].total) ? agg[0].total : 0;
              try {
                const driverOwedAfter = 0;
                const driverAvailable = (freshDriver && freshDriver.wallet && typeof freshDriver.wallet.balance === 'number') ? freshDriver.wallet.balance : (freshDriver && freshDriver.walletBalance ? freshDriver.walletBalance : 0);
                const driverPayout = Number((driverAvailable - driverOwedAfter).toFixed(2));
                io.to('admins').emit('owed-updated', { driverId: driver._id.toString(), owedToPlatform: 0, totalOwed: Number(totalOwed || 0), driverPayout });
              } catch (e) {}
            } catch (e) {}
          }
    } catch (e) {}

    return res.json({ message: 'Driver debt cleared' });
  } catch (err) {
    console.error('settleDriverDebt error:', err);
    return res.status(500).json({ message: 'Error settling debt' });
  }
};

// Live dashboard stats (aggregated from DB fields)
exports.getDashboardLiveStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    // respect dashboard reset timestamp if present so live stats reflect reset
    const Settings = require('../models/settings.model');
    const settings = await Settings.findOne().catch(() => null);
    const resetAt = settings && settings.dashboardResetAt ? new Date(settings.dashboardResetAt) : null;

    // Count online drivers across Captain and legacy User records, deduping by email.
    // For dashboard overview, treat "active drivers" as the number of approved drivers
    let activeDrivers = 0;
    try {
      const captainEmails = await Captain.distinct('email', { isApproved: true });
      const approvedCaptains = await Captain.countDocuments({ isApproved: true });
      const approvedLegacy = await User.countDocuments({ role: 'captain', isApproved: true, email: { $nin: captainEmails } });
      activeDrivers = Number(approvedCaptains || 0) + Number(approvedLegacy || 0);
    } catch (e) {
      try { activeDrivers = await Captain.countDocuments({ isApproved: true }); } catch (err) { activeDrivers = 0; }
    }

    // Compute active riders as distinct users who either have an activeRide ref
    // or have an ongoing ride record (started/ongoing/accepted/arriving)
    const usersWithActiveRide = await User.distinct('_id', { activeRide: { $ne: null } });
    const rideUsers = await Ride.distinct('user', { status: { $in: ['started', 'ongoing', 'accepted', 'arriving'] } });
    const union = new Set([...(usersWithActiveRide || []).map(String), ...(rideUsers || []).map(String)]);
    const activeRiders = union.size;

    const lowerBound = resetAt && resetAt > todayStart ? resetAt : todayStart;
    const completedToday = await Ride.countDocuments({ status: 'completed', completedAt: { $gte: lowerBound } });

    const revenueResult = await Ride.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: lowerBound } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalFare", "$fare"] } } } }
    ]).allowDiskUse(true).catch(() => []);

    const todayRevenue = (revenueResult[0] && revenueResult[0].total) ? revenueResult[0].total : 0;

    const ratingResult = await Captain.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } }
    ]);

    const avgDriverRating = (ratingResult[0] && ratingResult[0].avgRating) ? ratingResult[0].avgRating : 0;

    // compute owedToPlatform (sum of platformCommission for unpaid CASH rides)
    let owedToPlatform = 0;
    try {
      const unpaidMatch = { status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] };
      if (resetAt) unpaidMatch.completedAt = { $gte: resetAt };
      const unpaidAgg = await Ride.aggregate([
        { $match: unpaidMatch },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$platformCommission", 0] } } } }
      ]).allowDiskUse(true).catch(() => []);
      owedToPlatform = (unpaidAgg && unpaidAgg[0] && unpaidAgg[0].total) ? unpaidAgg[0].total : 0;
    } catch (e) { owedToPlatform = 0; }

    return res.json({ activeDrivers, activeRiders, completedToday, todayRevenue, avgDriverRating, owedToPlatform });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

// Reset dashboard: record reset timestamp and notify admin clients
exports.resetDashboard = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ message: 'Admin password required to confirm reset' });

    // re-load admin with password hash for verification
    const adminUser = await User.findById(req.admin && req.admin._id).select('+password');
    if (!adminUser) return res.status(401).json({ message: 'Admin verification failed' });
    const ok = await adminUser.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid admin password' });

    const Settings = require('../models/settings.model');
    let settings = await Settings.findOne().catch(() => null);
    if (!settings) settings = await Settings.create({});
    settings.dashboardResetAt = new Date();
    await settings.save();

    // recompute stats scoped to new reset and emit to admins
    const stats = await computeDashboardStats();
    try {
      const { getIO } = require('../socket');
      const io = getIO && getIO();
      if (io) {
        try { io.to('admins').emit('dashboard-reset', stats); } catch (e) {}
      }
    } catch (e) {}

    return res.json({ message: 'Dashboard reset', stats });
  } catch (err) {
    console.error('resetDashboard error:', err);
    return res.status(500).json({ message: 'Error resetting dashboard' });
  }
};

exports.getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('user')
      .populate('captain')
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching rides' });
  }
};

// Paginated rides list for admin UI "Rides" tab
exports.getRidesTab = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.captainId) filter.captain = req.query.captainId;
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    // basic text search across pickup/drop addresses or passenger name
    if (req.query.q) {
      const q = req.query.q.trim();
      filter.$or = [
        { 'pickup.address': { $regex: q, $options: 'i' } },
        { 'drop.address': { $regex: q, $options: 'i' } },
      ];
    }

    const total = await Ride.countDocuments(filter);
    const rides = await Ride.find(filter)
      .populate('user', 'fullname email')
      .populate('captain', 'fullname email vehicle')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ total, page, limit, rides });
  } catch (err) {
    console.error('getRidesTab error:', err);
    return res.status(500).json({ message: 'Error fetching rides' });
  }
};

// ...existing code...

exports.toggleDriverStatus = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;
    // try User collection first (legacy), then Captain collection
    let driver = await User.findById(driverId);
    if (driver) {
      driver.suspended = !driver.suspended;
      await driver.save();

      // if suspending a user record, blacklist its active tokens and force logout
      if (driver.suspended) {
        try {
          const tokens = driver.activeTokens || [];
          for (const t of tokens) {
            await blacklistTokenModel.create({ token: t });
          }
        } catch (e) {}
        try { driver.activeTokens = []; await driver.save(); } catch (e) {}
        try { if (driver.socketId) sendMessageToSocketId(driver.socketId, { event: 'force-logout', data: { message: 'Your account has been suspended. Please wait for admin approval.' } }); } catch (e) {}
        try { driver.socketId = null; await driver.save(); } catch (e) {}
      }

      // if there is a corresponding captain record, apply same
      try {
        const cap = await Captain.findOne({ email: driver.email });
        if (cap) {
          cap.isSuspended = driver.suspended;
          if (cap.isSuspended) {
            // blacklist any active tokens
            try {
              const tokens = cap.activeTokens || [];
              for (const t of tokens) {
                await blacklistTokenModel.create({ token: t });
              }
            } catch (e) {}
            // clear active tokens
            cap.activeTokens = [];
            // force logout via socket
            try {
              if (cap.socketId) sendMessageToSocketId(cap.socketId, { event: 'force-logout', data: { message: 'Your account has been suspended. Please wait for admin approval.' } });
              cap.socketId = null;
            } catch (e) {}
          }
          await cap.save();
        }
      } catch (e) {}

      return res.json({ success: true, suspended: driver.suspended });
    }

    // fallback: update Captain collection directly
    const captain = await Captain.findById(driverId);
    if (!captain) return res.status(404).json({ message: 'Driver not found' });

    captain.isSuspended = !captain.isSuspended;
    if (captain.isSuspended) {
      try {
        const tokens = captain.activeTokens || [];
        for (const t of tokens) {
          await blacklistTokenModel.create({ token: t });
        }
      } catch (e) {}
      captain.activeTokens = [];
      try {
        if (captain.socketId) sendMessageToSocketId(captain.socketId, { event: 'force-logout', data: { message: 'Your account has been suspended. Please wait for admin approval.' } });
        captain.socketId = null;
      } catch (e) {}
    }
    await captain.save();

    res.json({ success: true, isSuspended: captain.isSuspended });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error toggling driver status' });
  }
};

// Explicit suspend/unsuspend handlers
exports.suspendDriver = async (req, res) => {
  try {
    const id = req.params.id;
    const captain = await Captain.findById(id);
    if (!captain) return res.status(404).json({ message: 'Driver not found' });

    captain.isSuspended = true;
    // blacklist active tokens
    try {
      const tokens = captain.activeTokens || [];
      for (const t of tokens) { await blacklistTokenModel.create({ token: t }); }
    } catch (e) {}
    captain.activeTokens = [];
    try { if (captain.socketId) sendMessageToSocketId(captain.socketId, { event: 'force-logout', data: { message: 'Your account has been suspended. Please wait for admin approval.' } }); captain.socketId = null; } catch (e) {}
    await captain.save();
    return res.json({ message: 'Driver suspended successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error suspending driver' });
  }
};

exports.unsuspendDriver = async (req, res) => {
  try {
    const id = req.params.id;
    const captain = await Captain.findById(id);
    if (!captain) return res.status(404).json({ message: 'Driver not found' });

    captain.isSuspended = false;
    await captain.save();
    return res.json({ message: 'Driver unsuspended successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error unsuspending driver' });
  }
};

// Suspend a legacy User record (not Captain) via admin
exports.suspendUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.suspended = true;
    // blacklist active tokens
    try {
      const tokens = user.activeTokens || [];
      for (const t of tokens) { await blacklistTokenModel.create({ token: t }); }
    } catch (e) {}
    user.activeTokens = [];
    try { if (user.socketId) sendMessageToSocketId(user.socketId, { event: 'force-logout', data: { message: 'Your account has been suspended. Please wait for admin approval.' } }); user.socketId = null; } catch (e) {}
    await user.save();
    return res.json({ message: 'User suspended successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error suspending user' });
  }
};

// Delete a user and associated data (admin-confirmed)
exports.deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ message: 'Admin password required to confirm deletion' });

    // re-load admin with password hash for verification
    const adminUser = await User.findById(req.admin && req.admin._id).select('+password');
    if (!adminUser) return res.status(401).json({ message: 'Admin verification failed' });
    const ok = await adminUser.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid admin password' });

    // attempt to delete profileImage file for user (local uploads)
    try {
      const img = user.profileImage;
      if (img && typeof img === 'string' && !img.startsWith('http')) {
        const rel = img.replace(/^\//, '');
        const full = path.join(__dirname, '..', rel);
        try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (e) {}
      }
    } catch (e) {}

    // delete related rides
    try { await Ride.deleteMany({ user: user._id }); } catch (e) {}

    // delete user record
    try { await User.findByIdAndDelete(user._id); } catch (e) {}

    // record audit entry
    let createdAudit = null;
    try {
      createdAudit = await Audit.create({
        actor: adminUser._id,
        actorEmail: adminUser.email,
        action: 'delete_user',
        targetId: user._id,
        targetType: 'user',
        targetEmail: user.email,
        meta: { deletedAt: new Date() }
      });
      try { console.log('audit created', createdAudit._id); } catch (e) {}
      try {
        const { getIO } = require('../socket');
        const io = getIO && getIO();
        if (io) {
          try { io.to('admins').emit('audit-created', createdAudit); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) { console.error('audit create failed', e); }

    return res.json({ message: 'User and related data deleted', audit: createdAudit });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Error deleting user' });
  }
};

// Delete a driver and associated data
exports.deleteDriver = async (req, res) => {
  try {
    const id = req.params.id;
    const captain = await Captain.findById(id);
    if (!captain) return res.status(404).json({ message: 'Driver not found' });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ message: 'Admin password required to confirm deletion' });

    // re-load admin with password hash for verification
    const adminUser = await User.findById(req.admin && req.admin._id).select('+password');
    if (!adminUser) return res.status(401).json({ message: 'Admin verification failed' });
    const ok = await adminUser.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid admin password' });

    const email = captain.email && captain.email.toLowerCase();
    // attempt to delete profileImage file for captain (local uploads)
    try {
      const img = captain.profileImage;
      if (img && typeof img === 'string' && !img.startsWith('http')) {
        const rel = img.replace(/^\//, '');
        const full = path.join(__dirname, '..', rel);
        try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (e) {}
      }
    } catch (e) {}

    // delete related payouts
    try { await Payout.deleteMany({ driver: captain._id }); } catch (e) {}

    // delete related rides
    try { await Ride.deleteMany({ captain: captain._id }); } catch (e) {}

    // remove captain record
    try { await Captain.findByIdAndDelete(captain._id); } catch (e) {}

    // remove any legacy user records representing this driver (role: 'captain') and delete their images
    try {
      if (email) {
        const legacyUsers = await User.find({ email: email, role: 'captain' });
        for (const u of legacyUsers) {
          try {
            const ui = u.profileImage;
            if (ui && typeof ui === 'string' && !ui.startsWith('http')) {
              const relu = ui.replace(/^\//, '');
              const fullu = path.join(__dirname, '..', relu);
              try { if (fs.existsSync(fullu)) fs.unlinkSync(fullu); } catch (e) {}
            }
          } catch (e) {}
        }
        try { await User.deleteMany({ email: email, role: 'captain' }); } catch (e) {}
      }
    } catch (e) {}

    // Note: uploaded files stored outside backend/uploads (e.g., cloud URLs) are not deleted here.

    // record audit entry
    let createdAudit = null;
    try {
      createdAudit = await Audit.create({
        actor: adminUser._id,
        actorEmail: adminUser.email,
        action: 'delete_driver',
        targetId: captain._id,
        targetType: 'captain',
        targetEmail: email,
        meta: { deletedAt: new Date() }
      });
      try { console.log('audit created', createdAudit._id); } catch (e) {}
      // emit real-time event to admin clients so Deleted Profiles page refreshes
      try {
        const { getIO } = require('../socket');
        const io = getIO && getIO();
        if (io) {
          try { io.to('admins').emit('audit-created', createdAudit); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) { console.error('audit create failed', e); }

    return res.json({ message: 'Driver and related data deleted', audit: createdAudit });
  } catch (err) {
    console.error('deleteDriver error:', err);
    return res.status(500).json({ message: 'Error deleting driver' });
  }
};

// Admin: force-logout a driver by clearing their active session token
exports.forceLogoutDriver = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });
    const Captain = require('../models/captain.model');
    const driver = await Captain.findById(driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    driver.activeSessionToken = null;
    try { driver.activeTokens = []; } catch (e) {}
    await driver.save();
    // notify driver via socket if present
    try {
      const { getIO } = require('../socket');
      const io = getIO && getIO();
      if (io && driver && driver._id) {
        try { io.to(driver._id.toString()).emit('force-logout', { message: 'You have been logged out by admin' }); } catch (e) {}
      }
    } catch (e) {}
    return res.json({ message: 'Driver forced logged out' });
  } catch (err) {
    console.error('forceLogoutDriver error:', err);
    return res.status(500).json({ message: 'Error forcing logout' });
  }
};


// Admin login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const admin = await User.findOne({ email }).select('+password');
    if (!admin || admin.role !== 'admin') return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = admin.generateAuthToken();

    res.json({ user: { id: admin._id, email: admin.email, role: 'admin' }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Admin cancels a ride by id (no ownership checks)
exports.cancelRideByIdAdmin = async (req, res) => {
  try {
    const rideId = req.params.id;
    const ride = await Ride.findById(rideId).populate('captain').populate('user');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.status = 'cancelled';
    await ride.save();

    // notify connected parties (captain and user) via sockets if available
    try {
      const { getIO, sendMessageToSocketId } = require('../socket');
      const io = getIO && getIO();
      // notify captain
      try {
        if (ride.captain && ride.captain._id) {
          const capId = ride.captain._id.toString();
          if (io) try { io.to(capId).emit('ride-cancelled', ride); } catch (e) {}
          if (ride.captain.socketId) try { sendMessageToSocketId(ride.captain.socketId, { event: 'ride-cancelled', data: ride }); } catch (e) {}
        }
      } catch (e) {}

      // notify user
      try {
        if (ride.user && ride.user._id) {
          const userId = ride.user._id.toString();
          if (io) try { io.to(userId).emit('ride-cancelled', ride); } catch (e) {}
          if (ride.user.socketId) try { sendMessageToSocketId(ride.user.socketId, { event: 'ride-cancelled', data: ride }); } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {
      // ignore socket notification errors
    }

    return res.status(200).json({ message: 'Ride cancelled', ride });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error cancelling ride' });
  }
};

// Admin: CRUD for special requests / marketplace items
exports.uploadSpecialRequestImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'special-requests');
    const imageUrl = result.secure_url;
    return res.status(200).json({ data: { imageUrl } });
  } catch (err) {
    console.error('uploadSpecialRequestImage error:', err);
    return res.status(500).json({ message: 'Error uploading image' });
  }
};

exports.getSpecialRequests = async (req, res) => {
  try {
    const items = await SpecialRequest.find().sort({ createdAt: -1 }).lean();
    return res.json({ data: items });
  } catch (err) {
    console.error('getSpecialRequests error:', err);
    return res.status(500).json({ message: 'Error retrieving special requests' });
  }
};

exports.createSpecialRequest = async (req, res) => {
  try {
    const { name, description, hourly, daily, imageUrl, availableIn, contactName, contactPhone, contactEmail } = req.body;
    if (!name || !description || hourly == null || daily == null) {
      return res.status(400).json({ message: 'Name, description, hourly and daily rates are required' });
    }
    if (description && description.length > 250) {
      return res.status(400).json({ message: 'Description must not exceed 250 characters' });
    }

    const item = await SpecialRequest.create({
      name: name.trim(),
      description: description.trim(),
      hourly: Number(hourly),
      daily: Number(daily),
      imageUrl: (imageUrl || '').trim(),
      availableIn: (availableIn || 'Immediately').trim(),
      contactName: (contactName || '').trim(),
      contactPhone: (contactPhone || '').trim(),
      contactEmail: (contactEmail || '').trim(),
    });

    return res.status(201).json({ data: item });
  } catch (err) {
    console.error('createSpecialRequest error:', err);
    return res.status(500).json({ message: 'Error creating special request' });
  }
};

exports.updateSpecialRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!requestId) return res.status(400).json({ message: 'Special request id required' });

    const { name, description, hourly, daily, imageUrl, availableIn, contactName, contactPhone, contactEmail } = req.body;
    if (!name || !description || hourly == null || daily == null) {
      return res.status(400).json({ message: 'Name, description, hourly and daily rates are required' });
    }
    if (description && description.length > 250) {
      return res.status(400).json({ message: 'Description must not exceed 250 characters' });
    }

    const updated = await SpecialRequest.findByIdAndUpdate(
      requestId,
      {
        name: name.trim(),
        description: description.trim(),
        hourly: Number(hourly),
        daily: Number(daily),
        imageUrl: (imageUrl || '').trim(),
        availableIn: (availableIn || 'Immediately').trim(),
        contactName: (contactName || '').trim(),
        contactPhone: (contactPhone || '').trim(),
        contactEmail: (contactEmail || '').trim(),
      },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Special request not found' });
    return res.json({ data: updated });
  } catch (err) {
    console.error('updateSpecialRequest error:', err);
    return res.status(500).json({ message: 'Error updating special request' });
  }
};

exports.deleteSpecialRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!requestId) return res.status(400).json({ message: 'Special request id required' });

    const deleted = await SpecialRequest.findByIdAndDelete(requestId);
    if (!deleted) return res.status(404).json({ message: 'Special request not found' });

    return res.json({ message: 'Special request deleted' });
  } catch (err) {
    console.error('deleteSpecialRequest error:', err);
    return res.status(500).json({ message: 'Error deleting special request' });
  }
};

// Admin login
// (continuation in previous function block)

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    // support search via `q` query param (search firstname, lastname, email)
    const q = (req.query.q || '').trim();
    let filter = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter = { $or: [ { 'fullname.firstname': regex }, { 'fullname.lastname': regex }, { email: regex } ] };
    }

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    return res.json({ users, totalPages: Math.max(1, Math.ceil(totalUsers / limit)), currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get detailed driver info for admin (driver details + stats)
exports.getDriverDetails = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.params.id;
    if (!driverId) return res.status(400).json({ message: 'driverId required' });

    const driver = await Captain.findById(driverId).lean();
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const totalTrips = await Ride.countDocuments({ captain: driver._id, status: 'completed' });

    const earningsResult = await Ride.aggregate([
      { $match: { captain: driver._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalFare", "$fare"] } } } }
    ]);
    const totalEarnings = (earningsResult[0] && earningsResult[0].total) ? earningsResult[0].total : 0;

    const declinedRequests = await Ride.countDocuments({ captain: driver._id, status: 'declined' });

    // compute owed-to-platform for this driver (sum of platformCommission for unpaid CASH rides)
    let owedToPlatform = 0;
    try {
      const owedAgg = await Ride.aggregate([
        { $match: { captain: driver._id, status: 'completed', paymentMethod: 'cash', $or: [ { isPaid: { $ne: true } }, { paymentStatus: { $ne: 'paid' } } ] } },
        { $group: { _id: '$captain', total: { $sum: { $ifNull: ['$platformCommission', 0] } } } }
      ]);
      owedToPlatform = (owedAgg && owedAgg[0] && owedAgg[0].total) ? owedAgg[0].total : 0;
    } catch (e) { owedToPlatform = 0; }

    return res.json({ driver, totalTrips, totalEarnings, declinedRequests, owedToPlatform });
  } catch (err) {
    console.error('getDriverDetails error:', err);
    return res.status(500).json({ message: 'Error fetching driver details' });
  }
};


// Return ride history for a specific user
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: 'user id required' });

    const rides = await Ride.find({ user: userId }).populate('captain', 'fullname email').sort({ createdAt: -1 }).lean();
    return res.json(rides);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching user rides' });
  }
};

exports.getAllDrivers = async (req, res) => {
  try {
    // support pagination via query params
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    const totalDrivers = await Captain.countDocuments();
    const drivers = await Captain.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    // Enrich each driver with aggregated stats
    const enriched = await Promise.all(drivers.map(async (driver) => {
      const totalTrips = await Ride.countDocuments({ captain: driver._id, status: 'completed' });

      const earningsResult = await Ride.aggregate([
        { $match: { captain: driver._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalFare", "$fare"] } } } }
      ]);
      const totalEarnings = (earningsResult[0] && earningsResult[0].total) ? earningsResult[0].total : 0;

      const declinedRequests = await Ride.countDocuments({ captain: driver._id, status: 'declined' });

      // convenience fields for frontend
      const vehicleModel = driver.vehicle ? `${driver.vehicle.brand || ''} ${driver.vehicle.model || ''}`.trim() : '';
      const licensePlate = driver.vehicle ? (driver.vehicle.plate || '') : '';

      return Object.assign({}, driver, {
        totalTrips,
        totalEarnings,
        declinedRequests,
        vehicleModel,
        licensePlate,
        status: driver.isOnline ? 'online' : 'offline'
      });
    }));

    return res.json({ drivers: enriched, totalPages: Math.ceil(totalDrivers / limit), currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching drivers' });
  }
};

// Return audit entries (filtered/paginated) for admin
exports.getAudits = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.action) filter.action = req.query.action;

    const total = await Audit.countDocuments(filter);
    const audits = await Audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    return res.json({ audits, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('getAudits error:', err);
    return res.status(500).json({ message: 'Error fetching audits' });
  }
};

// Return active captains (isOnline === true) with basic fields
exports.getActiveDrivers = async (req, res) => {
  try {
    // prefer captain collection if present
    const drivers = await Captain.find({ isOnline: true }).sort({ createdAt: -1 }).lean();
    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching active drivers' });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const completedRides = await Ride.find({ status: 'completed' });
    const totalEarnings = completedRides.reduce((s, r) => s + (r.totalFare || r.fare || 0), 0);

    const today = new Date();
    today.setHours(0,0,0,0);

    const revenueResult = await Ride.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalFare", "$fare"] } } } }
    ]);
    const todayRevenue = (revenueResult[0] && revenueResult[0].total) ? revenueResult[0].total : 0;

    return res.json({ totalEarnings, todayRevenue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching earnings' });
  }
};

// Return pending drivers (isApproved === false)
exports.getPendingDrivers = async (req, res) => {
  try {
    const pending = await Captain.find({ isApproved: false }).sort({ createdAt: -1 }).lean();
    // include legacy user records with role 'captain' that may represent drivers
    let usersPending = [];
    try {
      usersPending = await User.find({ role: 'captain', isApproved: false }).sort({ createdAt: -1 }).lean();
    } catch (e) { usersPending = []; }

    // merge arrays; if there are overlapping records prefer Captain documents
    const combined = [...pending];
    const captainEmails = new Set(pending.map(d => (d.email || '').toLowerCase()));
    for (const u of usersPending) {
      if (!captainEmails.has((u.email || '').toLowerCase())) combined.push(u);
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    // Enrich combined driver records with aggregated trip counts and earnings
    const ids = combined.map(d => d._id);
    let tripsAgg = [];
    try {
      tripsAgg = await Ride.aggregate([
        { $match: { status: 'completed', captain: { $in: ids } } },
        { $group: { _id: '$captain', trips: { $sum: 1 }, totalFare: { $sum: { $ifNull: ['$totalFare', '$fare', 0] } } } }
      ]).allowDiskUse(true);
    } catch (e) { tripsAgg = []; }

    let declinedAgg = [];
    try {
      declinedAgg = await Ride.aggregate([
        { $match: { captain: { $in: ids }, status: 'declined' } },
        { $group: { _id: '$captain', declined: { $sum: 1 } } }
      ]).allowDiskUse(true);
    } catch (e) { declinedAgg = []; }

    const tripsMap = (tripsAgg || []).reduce((acc, r) => {
      if (!r || !r._id) return acc;
      acc[r._id.toString()] = { trips: Number(r.trips || 0), totalFare: Number(r.totalFare || 0) };
      return acc;
    }, {});
    const declinedMap = (declinedAgg || []).reduce((acc, r) => {
      if (!r || !r._id) return acc;
      acc[r._id.toString()] = Number(r.declined || 0);
      return acc;
    }, {});

    const enriched = combined.map(driver => {
      const key = driver._id ? driver._id.toString() : '';
      const t = tripsMap[key] || { trips: 0, totalFare: 0 };
      const declined = declinedMap[key] || 0;
      const vehicleModel = driver.vehicle ? `${driver.vehicle.brand || ''} ${driver.vehicle.model || ''}`.trim() : (driver.vehicleModel || '');
      const licensePlate = driver.vehicle ? (driver.vehicle.plate || '') : (driver.licensePlate || '');
      return Object.assign({}, driver, {
        totalTrips: Number(t.trips || 0),
        totalEarnings: Number(t.totalFare || driver.totalEarnings || 0),
        declinedRequests: Number(declined || 0),
        vehicleModel,
        licensePlate,
        status: driver.isOnline ? 'online' : (driver.status || 'offline')
      });
    });

    const total = combined.length;
    return res.json({ drivers: enriched.slice(skip, skip + limit), totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching pending drivers' });
  }
};

// Return approved drivers (isApproved === true)
exports.getApprovedDrivers = async (req, res) => {
  try {
    const approved = await Captain.find({ isApproved: true }).sort({ createdAt: -1 }).lean();
    // include legacy user records with role 'captain' that may represent drivers
    let usersApproved = [];
    try {
      usersApproved = await User.find({ role: 'captain', isApproved: true }).sort({ createdAt: -1 }).lean();
    } catch (e) { usersApproved = []; }

    const combined = [...approved];
    const captainEmails = new Set(approved.map(d => (d.email || '').toLowerCase()));
    for (const u of usersApproved) {
      if (!captainEmails.has((u.email || '').toLowerCase())) combined.push(u);
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;

    // Enrich combined driver records with aggregated trip counts and earnings (same as pending handler)
    const ids = combined.map(d => d._id);
    let tripsAgg = [];
    try {
      tripsAgg = await Ride.aggregate([
        { $match: { status: 'completed', captain: { $in: ids } } },
        { $group: { _id: '$captain', trips: { $sum: 1 }, totalFare: { $sum: { $ifNull: ['$totalFare', '$fare', 0] } } } }
      ]).allowDiskUse(true);
    } catch (e) { tripsAgg = []; }

    let declinedAgg = [];
    try {
      declinedAgg = await Ride.aggregate([
        { $match: { captain: { $in: ids }, status: 'declined' } },
        { $group: { _id: '$captain', declined: { $sum: 1 } } }
      ]).allowDiskUse(true);
    } catch (e) { declinedAgg = []; }

    const tripsMap = (tripsAgg || []).reduce((acc, r) => { if (!r || !r._id) return acc; acc[r._id.toString()] = { trips: Number(r.trips || 0), totalFare: Number(r.totalFare || 0) }; return acc; }, {});
    const declinedMap = (declinedAgg || []).reduce((acc, r) => { if (!r || !r._id) return acc; acc[r._id.toString()] = Number(r.declined || 0); return acc; }, {});

    const enriched = combined.map(driver => {
      const key = driver._id ? driver._id.toString() : '';
      const t = tripsMap[key] || { trips: 0, totalFare: 0 };
      const declined = declinedMap[key] || 0;
      const vehicleModel = driver.vehicle ? `${driver.vehicle.brand || ''} ${driver.vehicle.model || ''}`.trim() : (driver.vehicleModel || '');
      const licensePlate = driver.vehicle ? (driver.vehicle.plate || '') : (driver.licensePlate || '');
      return Object.assign({}, driver, {
        totalTrips: Number(t.trips || 0),
        totalEarnings: Number(t.totalFare || driver.totalEarnings || 0),
        declinedRequests: Number(declined || 0),
        vehicleModel,
        licensePlate,
        status: driver.isOnline ? 'online' : (driver.status || 'offline')
      });
    });

    const total = combined.length;
    return res.json({ drivers: enriched.slice(skip, skip + limit), totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching approved drivers' });
  }
};

// Approve driver (captain)
exports.approveDriver = async (req, res) => {
  try {
    const id = req.params.id;
    const captain = await Captain.findById(id);
    if (!captain) return res.status(404).json({ message: 'Driver not found' });

    // mark approved and ensure suspension is cleared so driver can sign in again
    captain.isApproved = true;
    captain.isSuspended = false;
    await captain.save();

    // update legacy User record (if any) to clear suspension
    try {
      const legacyUser = await User.findOne({ email: captain.email });
      if (legacyUser) {
        legacyUser.suspended = false;
        await legacyUser.save();
      }
    } catch (e) {}

    // optionally notify driver via socket if connected
    try { if (captain.socketId) sendMessageToSocketId(captain.socketId, { event: 'approved', data: { message: 'Your account has been approved by admin.' } }); } catch (e) {}

    return res.json({ message: 'Driver approved successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error approving driver' });
  }
};

// Pricing endpoints
exports.getPricing = async (req, res) => {
  try {
    const Settings = require('../models/settings.model');
    const settings = await Settings.findOne();
    if (!settings) return res.status(404).json({ message: 'Pricing not configured' });
    return res.json(settings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching pricing' });
  }
};

exports.updatePricing = async (req, res) => {
  try {
    const { pricePerKm, baseFare, commissionRate } = req.body;
    const Settings = require('../models/settings.model');
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ pricePerKm: pricePerKm || 10, baseFare: baseFare || 5, commissionRate: commissionRate || 20 });
    } else {
      if (typeof pricePerKm === 'number') settings.pricePerKm = pricePerKm;
      if (typeof baseFare === 'number') settings.baseFare = baseFare;
      if (typeof commissionRate === 'number') settings.commissionRate = commissionRate;
      await settings.save();
    }
    return res.json({ message: 'Pricing updated successfully', settings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating pricing' });
  }
};
