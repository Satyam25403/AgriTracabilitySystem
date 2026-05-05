const mongoose = require("mongoose");

// ProcessingLog schema to track each stage of processing for a batch
const processingLogSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    stage: {
      type: String,
      enum: ["sourced", "cleaning", "grading", "packaging", "warehoused", "shipped", "delivered"],
      required: true,
    },
    operatorName: {
      type: String,
      required: [true, "Operator name is required"],
      trim: true,
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    quantityAfter: {
      type: Number,
    },
    location: {
      type: String,
      trim: true,
    },
    // Stage-specific structured data — shape depends on stage value
    stageData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

processingLogSchema.index({ batchId: 1 });

module.exports = mongoose.model("ProcessingLog", processingLogSchema);