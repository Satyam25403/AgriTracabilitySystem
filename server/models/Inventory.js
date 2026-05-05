const mongoose = require("mongoose");

// Inventory schema to track stock levels of batches in warehouses
const inventorySchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      unique: true, // one inventory record per batch
    },
    warehouseLocation: {
      type: String,
      required: [true, "Warehouse location is required"],
      trim: true,
    },
    availableStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["kg", "tonnes", "quintal", "bags"],
      default: "kg",
    },
    lowStockThreshold: {
      type: Number,
      default: 100, // trigger alert when stock falls below this
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Virtual: total stock
inventorySchema.virtual("totalStock").get(function () {
  return this.availableStock + this.reservedStock;
});

// Virtual: is low stock
inventorySchema.virtual("isLowStock").get(function () {
  return this.availableStock < this.lowStockThreshold;
});

// Virtual: days to expiry
inventorySchema.virtual("daysToExpiry").get(function () {
  if (!this.expiryDate) return null;
  const diff = this.expiryDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

inventorySchema.set("toJSON", { virtuals: true });
// batchId index already created by unique:true above

module.exports = mongoose.model("Inventory", inventorySchema);