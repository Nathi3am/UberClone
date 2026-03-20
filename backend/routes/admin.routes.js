const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/admin.controller');
const upload = require('../middlewares/upload');

router.get('/stats', adminAuth, adminController.getDashboardStats);
router.get('/dashboard-stats', adminAuth, adminController.getDashboardLiveStats);
router.get('/driver/:driverId', adminAuth, adminController.getDriverDetails);
router.get('/rides', adminAuth, adminController.getAllRides);
router.patch('/driver/:driverId/toggle', adminAuth, adminController.toggleDriverStatus);
router.patch('/drivers/:id/suspend', adminAuth, adminController.suspendDriver);
router.patch('/drivers/:id/unsuspend', adminAuth, adminController.unsuspendDriver);
router.patch('/drivers/:id/approve', adminAuth, adminController.approveDriver);
router.delete('/drivers/:id', adminAuth, adminController.deleteDriver);
router.get('/drivers/pending', adminAuth, adminController.getPendingDrivers);
router.get('/drivers/approved', adminAuth, adminController.getApprovedDrivers);
router.get('/audits', adminAuth, adminController.getAudits);
router.get('/pricing', adminAuth, adminController.getPricing);
router.patch('/pricing', adminAuth, adminController.updatePricing);
router.get('/driver-balances', adminAuth, adminController.getDriverBalances);
router.get('/payouts', adminAuth, adminController.getPayouts);
router.post('/pay-driver/:driverId', adminAuth, adminController.payDriver);
router.get('/driver-wallet/:driverId', adminAuth, adminController.getDriverWallet);
router.post('/payout-driver/:driverId', adminAuth, adminController.payDriver);
router.post('/settle-driver-debt/:driverId', adminAuth, adminController.settleDriverDebt);
// Admin login (no auth required)
router.post('/login', adminController.loginAdmin);

// Reset dashboard (record reset timestamp + notify admins)
router.post('/reset-dashboard', adminAuth, adminController.resetDashboard);

// Force logout a driver (clear their active session token)
router.post('/force-logout/:driverId', adminAuth, adminController.forceLogoutDriver);

// Special requests CRUD
router.get('/special-requests', adminAuth, adminController.getSpecialRequests);
router.post('/special-requests', adminAuth, adminController.createSpecialRequest);
router.post('/special-requests/upload', adminAuth, upload.single('image'), adminController.uploadSpecialRequestImage);
router.patch('/special-requests/:id', adminAuth, adminController.updateSpecialRequest);
router.delete('/special-requests/:id', adminAuth, adminController.deleteSpecialRequest);

// Admin actions (use POST to match admin UI expectations)
// legacy toggle route kept for compatibility
router.post('/drivers/suspend/:id', adminAuth, (req, res) => {
	req.params.driverId = req.params.id;
	return adminController.toggleDriverStatus(req, res);
});

router.post('/rides/cancel/:id', adminAuth, adminController.cancelRideByIdAdmin);
router.get('/users', adminAuth, adminController.getAllUsers);
router.get('/users/:id/rides', adminAuth, adminController.getUserRides);
router.delete('/users/:id', adminAuth, adminController.deleteUser);
router.get('/drivers', adminAuth, adminController.getAllDrivers);
router.get('/drivers/active', adminAuth, adminController.getActiveDrivers);
router.get('/earnings', adminAuth, adminController.getEarnings);
router.patch('/suspend-user/:id', adminAuth, adminController.suspendUser);
router.patch('/suspend-driver/:id', adminAuth, adminController.toggleDriverStatus);

module.exports = router;
