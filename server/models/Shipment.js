const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    dispatchDate: {
      type: Date,
      required: [true, "Dispatch date is required"],
    },
    expectedDelivery: {
      type: Date,
      required: [true, "Expected delivery date is required"],
    },
    deliveryStatus: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "delayed", "cancelled"],
      default: "pending",
    },
    quantityShipped: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["kg", "tonnes", "quintal", "bags"],
      default: "kg",
    },
    transportMode: {
      type: String,
      enum: ["road", "rail", "air", "sea"],
      default: "road",
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    trackingNotes: [
      {
        note: String,
        timestamp: { type: Date, default: Date.now },
        addedBy: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// shipmentId index already created by unique:true above
shipmentSchema.index({ batchId: 1 });
shipmentSchema.index({ deliveryStatus: 1 });

module.exports = mongoose.model("Shipment", shipmentSchema);