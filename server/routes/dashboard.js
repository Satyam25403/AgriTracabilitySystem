const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getStats,
  getStatusBreakdown,
  getCommodityBreakdown,
  getRecentActivity,
  getAlerts,
} = require("../controllers/dashboardController");

router.get("/stats",               protect, getStats);
router.get("/status-breakdown",    protect, getStatusBreakdown);
router.get("/commodity-breakdown", protect, getCommodityBreakdown);
router.get("/recent-activity",     protect, getRecentActivity);
router.get("/alerts",              protect, getAlerts);

module.exports = router;