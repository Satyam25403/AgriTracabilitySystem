const mongoose = require("mongoose");


// Supplier schema to represent farmers, cooperatives, processors, etc. who supply commodities
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["farmer_group", "processor", "cooperative"],
      default: "farmer_group",
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    region: {
      type: String,
      trim: true, // state / province / district
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ["verified", "pending", "suspended"],
      default: "pending",
    },
    certifications: {
      type: [String],
      default: [],
      // e.g. ["ISO 22000", "HACCP", "BRC", "FDA", "FSSAI", "GAP", "SMETA"]
    },
    commodities: {
      type: [String],
      default: [],
      // commodities this supplier provides
    },
    farmerCount: {
      type: Number,
      default: 0,
      // number of individual farmers in the group
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

supplierSchema.index({ country: 1 });
supplierSchema.index({ verificationStatus: 1 });
supplierSchema.index({ name: "text" }); // text search

module.exports = mongoose.model("Supplier", supplierSchema);