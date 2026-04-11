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
      // e.g. Rice, Wheat, Maize, Cotton, Soybean
    },
    farmerName: {
      type: String,
      required: [true, "Farmer name is required"],
      trim: true,
    },
    farmLocation: {
      type: String,
      required: [true, "Farm location is required"],
      trim: true,
    },
    harvestDate: {
      type: Date,
      required: [true, "Harvest date is required"],
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
      type: String, // base64 data URL
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

// Additional indexes (batchId index already created by unique:true above)
batchSchema.index({ commodityType: 1 });
batchSchema.index({ currentStatus: 1 });

module.exports = mongoose.model("Batch", batchSchema);