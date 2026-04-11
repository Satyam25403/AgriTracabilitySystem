const Batch = require("../models/Batch");

/**
 * Generates a unique batch ID in the format: COMMODITY-YEAR-SEQUENCE
 * Example: RICE-2026-001
 */
const generateBatchId = async (commodityType) => {
  const commodity = commodityType.toUpperCase().replace(/\s+/g, "").slice(0, 6);
  const year = new Date().getFullYear();
  const prefix = `${commodity}-${year}-`;

  // Find highest existing sequence for this prefix
  const lastBatch = await Batch.findOne(
    { batchId: { $regex: `^${prefix}` } },
    { batchId: 1 }
  ).sort({ batchId: -1 });

  let sequence = 1;
  if (lastBatch) {
    const lastSeq = parseInt(lastBatch.batchId.split("-").pop(), 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(3, "0")}`;
};

module.exports = { generateBatchId };