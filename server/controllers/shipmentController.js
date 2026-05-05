const Shipment = require("../models/Shipment");
const Batch = require("../models/Batch");
const Inventory = require("../models/Inventory");
const { generateShipmentId } = require("../utils/generateShipmentId");

// GET /api/shipments - get all shipments with optional status filter and pagination
exports.getAllShipments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.deliveryStatus = status;

    const total = await Shipment.countDocuments(filter);
    const shipments = await Shipment.find(filter)
      .populate("batchId", "batchId commodityType farmerName quantity unit")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipments/:id - get shipment details by ID
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("batchId", "batchId commodityType farmerName farmLocation quantity unit currentStatus")
      .populate("createdBy", "name role");
    if (!shipment) return res.status(404).json({ success: false, message: "Shipment not found." });
    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/shipments - create a new shipment for a batch
exports.createShipment = async (req, res) => {
  try {
    const {
      batchId, destination, dispatchDate, expectedDelivery,
      quantityShipped, unit, transportMode, vehicleNumber, driverName,
    } = req.body;

    if (!batchId || !destination || !dispatchDate || !expectedDelivery || !quantityShipped) {
      return res.status(400).json({ success: false, message: "batchId, destination, dispatchDate, expectedDelivery, quantityShipped are required." });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    if (!["warehoused", "packaging"].includes(batch.currentStatus)) {
      return res.status(400).json({ success: false, message: `Batch status is '${batch.currentStatus}'. Must be 'warehoused' or 'packaging' to ship.` });
    }

    const shipmentId = await generateShipmentId();

    const shipment = await Shipment.create({
      shipmentId,
      batchId,
      destination,
      dispatchDate,
      expectedDelivery,
      quantityShipped: Number(quantityShipped),
      unit: unit || batch.unit,
      transportMode: transportMode || "road",
      vehicleNumber,
      driverName,
      deliveryStatus: "pending",
      createdBy: req.user._id,
      trackingNotes: [{ note: `Shipment created by ${req.user.name}`, addedBy: req.user.name }],
    });

    await Batch.findByIdAndUpdate(batchId, { currentStatus: "shipped" });

    // Deduct from inventory
    const inventory = await Inventory.findOne({ batchId });
    if (inventory) {
      inventory.availableStock = Math.max(0, inventory.availableStock - Number(quantityShipped));
      inventory.reservedStock += Number(quantityShipped);
      await inventory.save();
    }

    const io = req.app.get("io");
    io.emit("shipment_dispatched", {
      shipmentId,
      batchId: batch.batchId,
      destination,
      quantityShipped: Number(quantityShipped),
      unit,
      dispatchDate,
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/shipments/:id/status - update shipment delivery status and optionally add a tracking note
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { deliveryStatus, note } = req.body;
    if (!deliveryStatus) return res.status(400).json({ success: false, message: "deliveryStatus is required." });

    const shipment = await Shipment.findById(req.params.id).populate("batchId", "batchId _id");
    if (!shipment) return res.status(404).json({ success: false, message: "Shipment not found." });

    shipment.deliveryStatus = deliveryStatus;
    if (note) shipment.trackingNotes.push({ note, addedBy: req.user.name });
    await shipment.save();

    if (deliveryStatus === "delivered") {
      await Batch.findByIdAndUpdate(shipment.batchId._id, { currentStatus: "delivered" });
      const inventory = await Inventory.findOne({ batchId: shipment.batchId._id });
      if (inventory) {
        inventory.reservedStock = Math.max(0, inventory.reservedStock - shipment.quantityShipped);
        await inventory.save();
      }
    }

    const io = req.app.get("io");
    io.emit("shipment_status_updated", {
      shipmentId: shipment.shipmentId,
      newStatus: deliveryStatus,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.json({ success: true, shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};