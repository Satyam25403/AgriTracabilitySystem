const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getAllShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
} = require("../controllers/shipmentController");

router.get("/",              protect,                                    getAllShipments);
router.get("/:id",           protect,                                    getShipmentById);
router.post("/",             protect, authorize("admin", "dispatcher"),  createShipment);
router.put("/:id/status",    protect, authorize("admin", "dispatcher"),  updateShipmentStatus);

module.exports = router;