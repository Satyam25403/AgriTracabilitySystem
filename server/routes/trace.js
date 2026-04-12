const express = require("express");
const router = express.Router();
const Batch = require("../models/Batch");
const ProcessingLog = require("../models/ProcessingLog");
const Inventory = require("../models/Inventory");
const Shipment = require("../models/Shipment");

// GET /api/trace/:batchId  - PUBLIC, no auth
router.get("/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findOne({ batchId: batchId.toUpperCase() })
      .populate("createdBy", "name")
      .populate("origins.supplier", "name country verificationStatus certifications");

    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    const [processingLogs, inventory, shipments] = await Promise.all([
      ProcessingLog.find({ batchId: batch._id }).sort({ timestamp: 1 }),
      Inventory.findOne({ batchId: batch._id }),
      Shipment.find({ batchId: batch._id }).sort({ createdAt: -1 }),
    ]);

    // Build sourced entry — handle both single and multi-origin
    let sourcedDetails;
    let sourcedLocation;
    if (batch.isMultiOrigin && batch.origins.length > 0) {
      const originList = batch.origins
        .map((o) => `${o.farmerGroup || o.country} (${o.country}) — ${o.quantity} ${o.unit}`)
        .join("; ");
      sourcedDetails = `Multi-origin consolidation: ${originList}`;
      sourcedLocation = batch.origins.map((o) => o.country).join(", ");
    } else {
      sourcedDetails = `${batch.quantity} ${batch.unit} of ${batch.commodityType} harvested by ${batch.farmerName}`;
      sourcedLocation = batch.farmLocation;
    }

    const timeline = [
      {
        stage: "sourced",
        label: batch.isMultiOrigin ? "Multi-Origin Consolidation" : "Harvested at Farm",
        location: sourcedLocation,
        timestamp: batch.createdAt,
        details: sourcedDetails,
        completed: true,
      },
      ...processingLogs.map((log) => ({
        stage: log.stage,
        label: stageLabel(log.stage),
        location: log.location || "Processing Unit",
        timestamp: log.timestamp,
        details: log.notes || `${log.stage} stage completed by ${log.operatorName}`,
        completed: true,
      })),
    ];

    if (inventory) {
      timeline.push({
        stage: "warehoused",
        label: "Stored in Warehouse",
        location: inventory.warehouseLocation,
        timestamp: inventory.createdAt,
        details: `${inventory.availableStock} ${inventory.unit} available in warehouse`,
        completed: true,
      });
    }

    shipments.forEach((shipment) => {
      timeline.push({
        stage: "shipped",
        label: `Shipped to ${shipment.destination}`,
        location: shipment.destination,
        timestamp: shipment.dispatchDate,
        details: `${shipment.quantityShipped} ${shipment.unit} via ${shipment.transportMode}. Status: ${shipment.deliveryStatus}`,
        completed: shipment.deliveryStatus === "delivered",
        shipmentId: shipment.shipmentId,
      });
    });

    res.json({
      success: true,
      batch: {
        batchId:       batch.batchId,
        commodityType: batch.commodityType,
        isMultiOrigin: batch.isMultiOrigin,
        farmerName:    batch.farmerName,
        farmLocation:  batch.farmLocation,
        harvestDate:   batch.harvestDate,
        origins:       batch.origins,
        quantity:      batch.quantity,
        unit:          batch.unit,
        currentStatus: batch.currentStatus,
      },
      timeline,
      inventory: inventory ? {
        warehouseLocation: inventory.warehouseLocation,
        availableStock:    inventory.availableStock,
        unit:              inventory.unit,
        expiryDate:        inventory.expiryDate,
      } : null,
      shipments: shipments.map((s) => ({
        shipmentId:       s.shipmentId,
        destination:      s.destination,
        deliveryStatus:   s.deliveryStatus,
        dispatchDate:     s.dispatchDate,
        expectedDelivery: s.expectedDelivery,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const stageLabel = (stage) => ({
  sourced:    "Harvested at Farm",
  cleaning:   "Cleaning",
  grading:    "Grading",
  packaging:  "Packaging",
  warehoused: "Stored in Warehouse",
  shipped:    "Shipped",
  delivered:  "Delivered",
}[stage] || stage);

module.exports = router;