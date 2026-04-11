const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getLogsForBatch, logStage } = require("../controllers/processingController");

router.get("/:batchId", protect, getLogsForBatch);
router.post("/", protect, authorize("admin", "processor", "warehouse", "dispatcher"), logStage);

module.exports = router;