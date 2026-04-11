const Batch = require("../models/Batch");
const Inventory = require("../models/Inventory");
const Shipment = require("../models/Shipment");

exports.getStats = async (req, res) => {
  try {
    const [totalBatches, activeBatches, lowStockItems, pendingShipments, deliveredToday, inventoryRecords] =
      await Promise.all([
        Batch.countDocuments(),
        Batch.countDocuments({ currentStatus: { $nin: ["delivered", "shipped"] } }),
        Inventory.countDocuments({ $expr: { $lt: ["$availableStock", "$lowStockThreshold"] } }),
        Shipment.countDocuments({ deliveryStatus: { $in: ["pending", "in_transit"] } }),
        Shipment.countDocuments({
          deliveryStatus: "delivered",
          updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        Inventory.find().select("availableStock"),
      ]);

    const totalStock = inventoryRecords.reduce((sum, i) => sum + i.availableStock, 0);

    res.json({ success: true, stats: { totalBatches, activeBatches, lowStockItems, pendingShipments, deliveredToday, totalStock } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStatusBreakdown = async (req, res) => {
  try {
    const breakdown = await Batch.aggregate([
      { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, breakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCommodityBreakdown = async (req, res) => {
  try {
    const breakdown = await Batch.aggregate([
      { $group: { _id: "$commodityType", count: { $sum: 1 }, totalQty: { $sum: "$quantity" } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, breakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const [recentBatches, recentShipments] = await Promise.all([
      Batch.find().sort({ createdAt: -1 }).limit(5).select("batchId commodityType currentStatus createdAt farmerName"),
      Shipment.find().sort({ createdAt: -1 }).limit(5)
        .select("shipmentId destination deliveryStatus createdAt")
        .populate("batchId", "batchId commodityType"),
    ]);

    const activity = [
      ...recentBatches.map((b) => ({ type: "batch", id: b.batchId, message: `Batch ${b.batchId} (${b.commodityType}) — ${b.currentStatus}`, timestamp: b.createdAt })),
      ...recentShipments.map((s) => ({ type: "shipment", id: s.shipmentId, message: `Shipment ${s.shipmentId} to ${s.destination} — ${s.deliveryStatus}`, timestamp: s.createdAt })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = [];
    const today = new Date();
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [lowStockItems, expiringSoon, delayed] = await Promise.all([
      Inventory.find({ $expr: { $lt: ["$availableStock", "$lowStockThreshold"] } }).populate("batchId", "batchId commodityType"),
      Inventory.find({ expiryDate: { $gt: today, $lt: sevenDaysLater } }).populate("batchId", "batchId commodityType"),
      Shipment.find({ expectedDelivery: { $lt: today }, deliveryStatus: { $in: ["pending", "in_transit"] } }).populate("batchId", "batchId"),
    ]);

    lowStockItems.forEach((item) => {
      alerts.push({ type: "low_stock", severity: "warning", message: `Low stock: ${item.batchId?.batchId} — ${item.availableStock} ${item.unit} remaining (threshold: ${item.lowStockThreshold})`, timestamp: item.updatedAt });
    });

    expiringSoon.forEach((item) => {
      const days = Math.ceil((item.expiryDate - today) / 86400000);
      alerts.push({ type: "expiry_soon", severity: "danger", message: `Expiring in ${days} day(s): ${item.batchId?.batchId}`, timestamp: item.expiryDate });
    });

    delayed.forEach((s) => {
      alerts.push({ type: "shipment_delayed", severity: "danger", message: `Overdue: Shipment ${s.shipmentId} to ${s.destination}`, timestamp: s.expectedDelivery });
    });

    res.json({ success: true, alerts, count: alerts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};