const express = require("express");
const router  = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierBatches,
  getSupplierStats,
} = require("../controllers/supplierController");

router.get("/",           protect,                              getAllSuppliers);
router.get("/stats",      protect,                              getSupplierStats);
router.get("/:id",        protect,                              getSupplierById);
router.get("/:id/batches",protect,                              getSupplierBatches);
router.post("/",          protect, authorize("admin","farmer"), createSupplier);
router.put("/:id",        protect, authorize("admin","farmer"), updateSupplier);
router.delete("/:id",     protect, authorize("admin"),          deleteSupplier);

module.exports = router;