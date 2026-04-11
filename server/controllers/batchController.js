const Batch = require("../models/Batch");
const Inventory = require("../models/Inventory");
const { generateBatchId } = require("../utils/generateBatchId");
const { generateQR } = require("../utils/generateQR");

// GET /api/batches
exports.getAllBatches = async (req, res) => {
  try {
    const { status, commodity, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    // status can be comma-separated: "sourced,cleaning"
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      filter.currentStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (commodity) filter.commodityType = { $regex: commodity, $options: "i" };
    if (search) {
      filter.$or = [
        { batchId: { $regex: search, $options: "i" } },
        { farmerName: { $regex: search, $options: "i" } },
        { farmLocation: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Batch.countDocuments(filter);
    const batches = await Batch.find(filter)
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/batches/:id
exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate("createdBy", "name role");
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });
    res.json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/batches
exports.createBatch = async (req, res) => {
  try {
    const { commodityType, farmerName, farmLocation, harvestDate, quantity, unit, notes } = req.body;

    if (!commodityType || !farmerName || !farmLocation || !harvestDate || !quantity) {
      return res.status(400).json({ success: false, message: "commodityType, farmerName, farmLocation, harvestDate, quantity are required." });
    }

    const batchId = await generateBatchId(commodityType);
    const qrCodeUrl = await generateQR(batchId);

    const batch = await Batch.create({
      batchId,
      commodityType,
      farmerName,
      farmLocation,
      harvestDate,
      quantity,
      unit: unit || "kg",
      notes,
      createdBy: req.user._id,
      qrCodeUrl,
    });

    const io = req.app.get("io");
    io.emit("batch_created", {
      batchId: batch.batchId,
      commodityType: batch.commodityType,
      farmerName: batch.farmerName,
      quantity: batch.quantity,
      unit: batch.unit,
      timestamp: batch.createdAt,
    });

    res.status(201).json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/batches/:id/status
exports.updateBatchStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required." });

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { currentStatus: status },
      { new: true, runValidators: true }
    );
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    const io = req.app.get("io");
    io.emit("batch_status_updated", {
      batchId: batch.batchId,
      newStatus: status,
      updatedBy: req.user.name,
      timestamp: new Date(),
    });

    res.json({ success: true, batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/batches/:id
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });
    await Inventory.findOneAndDelete({ batchId: req.params.id });
    res.json({ success: true, message: "Batch and associated inventory deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};