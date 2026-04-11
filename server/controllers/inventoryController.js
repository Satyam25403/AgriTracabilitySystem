const Inventory = require("../models/Inventory");
const Batch = require("../models/Batch");
const { checkInventoryAlerts } = require("../utils/alertEngine");

// GET /api/inventory
exports.getAllInventory = async (req, res) => {
  try {
    const { warehouse, lowStock, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (warehouse) filter.warehouseLocation = { $regex: warehouse, $options: "i" };

    let inventory = await Inventory.find(filter)
      .populate("batchId", "batchId commodityType farmerName currentStatus quantity unit")
      .populate("lastUpdatedBy", "name")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    if (lowStock === "true") {
      inventory = inventory.filter((i) => i.availableStock < i.lowStockThreshold);
    }

    const total = await Inventory.countDocuments(filter);
    res.json({ success: true, total, inventory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/inventory/:batchId
exports.getInventoryByBatch = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ batchId: req.params.batchId })
      .populate("batchId", "batchId commodityType farmerName currentStatus")
      .populate("lastUpdatedBy", "name");
    if (!inventory) return res.status(404).json({ success: false, message: "Inventory record not found." });
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/inventory
exports.createInventory = async (req, res) => {
  try {
    const { batchId, warehouseLocation, availableStock, unit, lowStockThreshold, expiryDate } = req.body;
    if (!batchId || !warehouseLocation || availableStock === undefined) {
      return res.status(400).json({ success: false, message: "batchId, warehouseLocation, availableStock are required." });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    const existing = await Inventory.findOne({ batchId });
    if (existing) return res.status(400).json({ success: false, message: "Inventory record already exists for this batch." });

    const inventory = await Inventory.create({
      batchId,
      warehouseLocation,
      availableStock: Number(availableStock),
      unit: unit || batch.unit,
      lowStockThreshold: Number(lowStockThreshold) || 100,
      expiryDate: expiryDate || null,
      lastUpdatedBy: req.user._id,
    });

    await Batch.findByIdAndUpdate(batchId, { currentStatus: "warehoused" });

    const io = req.app.get("io");
    io.emit("inventory_updated", {
      batchId: batch.batchId,
      warehouseLocation,
      availableStock: Number(availableStock),
      unit,
      action: "created",
      timestamp: new Date(),
    });

    await checkInventoryAlerts(inventory, io, batch.batchId);
    res.status(201).json({ success: true, inventory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/inventory/:id
exports.updateInventory = async (req, res) => {
  try {
    const { availableStock, reservedStock, warehouseLocation, lowStockThreshold, expiryDate } = req.body;

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        ...(availableStock !== undefined && { availableStock: Number(availableStock) }),
        ...(reservedStock !== undefined && { reservedStock: Number(reservedStock) }),
        ...(warehouseLocation && { warehouseLocation }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }),
        ...(expiryDate !== undefined && { expiryDate }),
        lastUpdatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    ).populate("batchId", "batchId commodityType");

    if (!inventory) return res.status(404).json({ success: false, message: "Inventory not found." });

    const io = req.app.get("io");
    io.emit("inventory_updated", {
      batchId: inventory.batchId?.batchId,
      availableStock: inventory.availableStock,
      action: "updated",
      timestamp: new Date(),
    });

    await checkInventoryAlerts(inventory, io, inventory.batchId?.batchId);
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/inventory/:id/adjust
exports.adjustStock = async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    if (adjustment === undefined) return res.status(400).json({ success: false, message: "adjustment amount is required." });

    const inventory = await Inventory.findById(req.params.id).populate("batchId", "batchId");
    if (!inventory) return res.status(404).json({ success: false, message: "Inventory not found." });

    inventory.availableStock = Math.max(0, inventory.availableStock + Number(adjustment));
    inventory.lastUpdatedBy = req.user._id;
    await inventory.save();

    const io = req.app.get("io");
    io.emit("inventory_updated", {
      batchId: inventory.batchId?.batchId,
      availableStock: inventory.availableStock,
      adjustment: Number(adjustment),
      reason,
      action: "adjusted",
      timestamp: new Date(),
    });

    await checkInventoryAlerts(inventory, io, inventory.batchId?.batchId);
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};