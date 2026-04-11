const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllInventory,
  getInventoryByBatch,
  createInventory,
  updateInventory,
  adjustStock,
} = require("../controllers/inventoryController");

router.get("/",             protect,                                  getAllInventory);
router.get("/:batchId",     protect,                                  getInventoryByBatch);
router.post("/",            protect, authorize("admin", "warehouse"), createInventory);
router.put("/:id",          protect, authorize("admin", "warehouse"), updateInventory);
router.patch("/:id/adjust", protect, authorize("admin", "warehouse"), adjustStock);

module.exports = router;