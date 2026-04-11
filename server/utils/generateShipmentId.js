const Shipment = require("../models/Shipment");

/**
 * Generates a unique shipment ID in format: SHP-YEAR-SEQUENCE
 * Example: SHP-2026-001
 */
const generateShipmentId = async () => {
  const year = new Date().getFullYear();
  const prefix = `SHP-${year}-`;

  const lastShipment = await Shipment.findOne(
    { shipmentId: { $regex: `^${prefix}` } },
    { shipmentId: 1 }
  ).sort({ shipmentId: -1 });

  let sequence = 1;
  if (lastShipment) {
    const lastSeq = parseInt(lastShipment.shipmentId.split("-").pop(), 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(3, "0")}`;
};

module.exports = { generateShipmentId };