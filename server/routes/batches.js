const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatchStatus,
  deleteBatch,
} = require("../controllers/batchController");

router.get("/",           protect,                                                                getAllBatches);
router.get("/:id",        protect,                                                                getBatchById);
router.post("/",          protect, authorize("admin", "farmer"),                                  createBatch);
router.put("/:id/status", protect, authorize("admin", "processor", "warehouse", "dispatcher"),   updateBatchStatus);
router.delete("/:id",     protect, authorize("admin"),                                            deleteBatch);

module.exports = router;