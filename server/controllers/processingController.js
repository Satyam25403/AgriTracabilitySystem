const ProcessingLog = require("../models/ProcessingLog");
const Batch = require("../models/Batch");

// GET /api/processing/:batchId - get processing logs for a specific batch
exports.getLogsForBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    const logs = await ProcessingLog.find({ batchId: req.params.batchId })
      .populate("operatorId", "name role")
      .sort({ timestamp: 1 });

    res.json({ success: true, batchId: batch.batchId, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/processing - log a new processing stage for a batch
exports.logStage = async (req, res) => {
  try {
    const { batchId, stage, notes, quantityAfter, location, stageData } = req.body;
    if (!batchId || !stage) return res.status(400).json({ success: false, message: "batchId and stage are required." });

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: "Batch not found." });

    // For shipped/delivered stages, derive location from stageData if not explicitly set
    const resolvedLocation = location ||
      (stageData?.destination) ||
      (stageData?.warehouseName ? `${stageData.warehouseName}${stageData.warehouseCity ? ', ' + stageData.warehouseCity : ''}` : undefined);

    const log = await ProcessingLog.create({
      batchId,
      stage,
      operatorName: req.user.name,
      operatorId:   req.user._id,
      notes,
      quantityAfter,
      location: resolvedLocation,
      stageData: stageData || {},
    });

    batch.currentStatus = stage;
    if (quantityAfter !== undefined && quantityAfter !== "") batch.quantity = Number(quantityAfter);
    await batch.save();

    const io = req.app.get("io");
    io.emit("batch_status_updated", {
      batchId:   batch.batchId,
      newStatus: stage,
      updatedBy: req.user.name,
      location:  resolvedLocation,
      timestamp: log.timestamp,
    });

    res.status(201).json({ success: true, log, updatedBatch: batch });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};