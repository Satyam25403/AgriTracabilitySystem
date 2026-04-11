const nodemailer = require("nodemailer");
const Inventory = require("../models/Inventory");
const Shipment = require("../models/Shipment");

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your_email@gmail.com") {
    // Skip if email not configured, just log
    console.log(`📧 [Email skipped - not configured]: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`📧 Email sent: ${subject}`);
  } catch (err) {
    console.error("Email send error:", err.message);
  }
};

// ─── Alert Checks ─────────────────────────────────────────────────────────────

/**
 * Check inventory after any update.
 * Emits socket events and optionally sends email.
 */
const checkInventoryAlerts = async (inventory, io, batchId) => {
  const alerts = [];

  // Low stock alert
  if (inventory.availableStock < inventory.lowStockThreshold) {
    const alert = {
      type: "low_stock",
      severity: "warning",
      batchId,
      message: `Low stock alert: Batch has only ${inventory.availableStock} ${inventory.unit} remaining (threshold: ${inventory.lowStockThreshold})`,
      timestamp: new Date(),
    };
    alerts.push(alert);
    if (io) io.emit("low_stock_alert", alert);

    await sendEmail({
      to: process.env.EMAIL_USER,
      subject: `⚠️ AgriTrace: Low Stock Alert`,
      html: `<p>${alert.message}</p><p>Warehouse: ${inventory.warehouseLocation}</p>`,
    });
  }

  // Expiry alert (within 7 days)
  if (inventory.expiryDate) {
    const daysToExpiry = Math.ceil((inventory.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 7 && daysToExpiry > 0) {
      const alert = {
        type: "expiry_soon",
        severity: "danger",
        batchId,
        message: `Expiry alert: Batch expires in ${daysToExpiry} day(s) on ${inventory.expiryDate.toDateString()}`,
        timestamp: new Date(),
      };
      alerts.push(alert);
      if (io) io.emit("expiry_alert", alert);
    }
  }

  return alerts;
};

/**
 * Check all shipments for delays (run periodically or on demand).
 */
const checkShipmentDelays = async (io) => {
  const today = new Date();
  const overdueShipments = await Shipment.find({
    expectedDelivery: { $lt: today },
    deliveryStatus: { $in: ["pending", "in_transit"] },
  }).populate("batchId", "batchId commodityType");

  overdueShipments.forEach((shipment) => {
    const daysOverdue = Math.ceil((today - shipment.expectedDelivery) / (1000 * 60 * 60 * 24));
    const alert = {
      type: "shipment_delayed",
      severity: "danger",
      shipmentId: shipment.shipmentId,
      message: `Shipment ${shipment.shipmentId} to ${shipment.destination} is ${daysOverdue} day(s) overdue!`,
      timestamp: new Date(),
    };
    if (io) io.emit("delay_alert", alert);
  });

  return overdueShipments.length;
};

module.exports = { checkInventoryAlerts, checkShipmentDelays, sendEmail };