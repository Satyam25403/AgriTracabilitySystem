const mongoose = require("mongoose");

const STATUSES = [
  "sourced",
  "cleaning",
  "grading",
  "packaging",
  "warehoused",
  "shipped",
  "delivered",
];

// Sub-schema for each origin in a multi-origin batch
const originSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true },
    region:  { type: String, trim: true },
    farmerGroup: { type: String, trim: true },
    // Optional: link to a Supplier document
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    quantity: { type: Number, required: true, min: 0 },
    unit:     { type: String, enum: ["kg", "tonnes", "quintal", "bags"], default: "kg" },
    harvestDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

// Main Batch schema
const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    commodityType: {
      type: String,
      required: [true, "Commodity type is required"],
      trim: true,
    },

    // ── Primary / legacy single-origin fields (kept for backward compatability)
    farmerName: { type: String, trim: true },
    farmLocation: { type: String, trim: true },
    harvestDate: { type: Date },

    // ── Multi-origin array ─────────────────────────────────────────────────
    // If origins[] has entries, it overrides farmerName/farmLocation
    origins: {
      type: [originSchema],
      default: [],
    },

    // ── Convenience flag ───────────────────────────────────────────────────
    isMultiOrigin: {
      type: Boolean,
      default: false,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    unit: {
      type: String,
      enum: ["kg", "tonnes", "quintal", "bags"],
      default: "kg",
    },
    currentStatus: {
      type: String,
      enum: STATUSES,
      default: "sourced",
    },
    qrCodeUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Additional indexes
batchSchema.index({ commodityType: 1 });
batchSchema.index({ currentStatus: 1 });
batchSchema.index({ isMultiOrigin: 1 });

module.exports = mongoose.model("Batch", batchSchema);
