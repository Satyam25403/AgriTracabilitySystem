/**
 * AgriTrace — Database Seeder
 * Run: node seed.js
 * From: /server directory
 *
 * Creates: 1 admin user + 4 role users + 6 batches across all stages
 *          + processing logs + inventory + shipments
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User        = require("./models/User");
const Batch       = require("./models/Batch");
const ProcessingLog = require("./models/ProcessingLog");
const Inventory   = require("./models/Inventory");
const Shipment    = require("./models/Shipment");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/agritrace";

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const daysFrom = (n) => new Date(Date.now() + n * 86400000);
const pad      = (n) => String(n).padStart(3, "0");

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // ── Wipe existing data ────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany(),
    Batch.deleteMany(),
    ProcessingLog.deleteMany(),
    Inventory.deleteMany(),
    Shipment.deleteMany(),
  ]);
  console.log("🗑  Cleared existing data");

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = await User.create([
    { name: "Admin User",       email: "admin@agritrace.com",     password: "admin123",     role: "admin"      },
    { name: "Ravi Kumar",       email: "farmer@agritrace.com",    password: "farmer123",    role: "farmer"     },
    { name: "Sunita Sharma",    email: "processor@agritrace.com", password: "process123",   role: "processor"  },
    { name: "Mohan Das",        email: "warehouse@agritrace.com", password: "warehouse123", role: "warehouse"  },
    { name: "Priya Singh",      email: "dispatch@agritrace.com",  password: "dispatch123",  role: "dispatcher" },
  ]);

  const admin     = users[0];
  const farmer    = users[1];
  const processor = users[2];
  const warehouse = users[3];
  const dispatcher = users[4];

  console.log("👥 Created 5 users");
  console.log("   admin@agritrace.com     / admin123");
  console.log("   farmer@agritrace.com    / farmer123");
  console.log("   processor@agritrace.com / process123");
  console.log("   warehouse@agritrace.com / warehouse123");
  console.log("   dispatch@agritrace.com  / dispatch123");

  // ── Batches ───────────────────────────────────────────────────────────────
  const batchData = [
    {
      batchId: `RICE-2026-${pad(1)}`,
      commodityType: "Rice",
      farmerName: "Ravi Kumar",
      farmLocation: "Nashik, Maharashtra",
      harvestDate: daysAgo(20),
      quantity: 5000,
      unit: "kg",
      currentStatus: "delivered",
      createdBy: farmer._id,
      notes: "Basmati variety, Grade A quality",
    },
    {
      batchId: `WHEAT-2026-${pad(1)}`,
      commodityType: "Wheat",
      farmerName: "Suresh Patel",
      farmLocation: "Amritsar, Punjab",
      harvestDate: daysAgo(12),
      quantity: 8000,
      unit: "kg",
      currentStatus: "shipped",
      createdBy: admin._id,
    },
    {
      batchId: `MAIZE-2026-${pad(1)}`,
      commodityType: "Maize",
      farmerName: "Anita Reddy",
      farmLocation: "Hyderabad, Telangana",
      harvestDate: daysAgo(8),
      quantity: 3500,
      unit: "kg",
      currentStatus: "warehoused",
      createdBy: admin._id,
    },
    {
      batchId: `SOYBN-2026-${pad(1)}`,
      commodityType: "Soybean",
      farmerName: "Prakash Joshi",
      farmLocation: "Indore, Madhya Pradesh",
      harvestDate: daysAgo(5),
      quantity: 2000,
      unit: "kg",
      currentStatus: "grading",
      createdBy: farmer._id,
    },
    {
      batchId: `COTTO-2026-${pad(1)}`,
      commodityType: "Cotton",
      farmerName: "Meena Verma",
      farmLocation: "Nagpur, Maharashtra",
      harvestDate: daysAgo(3),
      quantity: 1200,
      unit: "kg",
      currentStatus: "cleaning",
      createdBy: farmer._id,
    },
    {
      batchId: `RICE-2026-${pad(2)}`,
      commodityType: "Rice",
      farmerName: "Deepak Yadav",
      farmLocation: "Cuttack, Odisha",
      harvestDate: daysAgo(1),
      quantity: 4500,
      unit: "kg",
      currentStatus: "sourced",
      createdBy: farmer._id,
      notes: "IR-64 variety",
    },
  ];

  const batches = await Batch.create(batchData);
  console.log(`📦 Created ${batches.length} batches`);

  const [rice1, wheat1, maize1, soybean1, cotton1, rice2] = batches;

  // ── Processing Logs ───────────────────────────────────────────────────────
  const logs = [];

  // RICE-2026-001: full journey (delivered)
  logs.push(
    { batchId: rice1._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Processing Unit A, Nashik",   quantityAfter: 4850, timestamp: daysAgo(18), notes: "Cleaned, 3% impurities removed" },
    { batchId: rice1._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Processing Unit A, Nashik",   quantityAfter: 4800, timestamp: daysAgo(16), notes: "Grade A: 4800kg, Grade B: 50kg (discarded)" },
    { batchId: rice1._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Packaging Unit, Nashik",      quantityAfter: 4800, timestamp: daysAgo(14), notes: "Packed in 25kg bags (192 bags)" },
    { batchId: rice1._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "Central Warehouse, Mumbai",   quantityAfter: 4800, timestamp: daysAgo(12), notes: "Stored in cool dry section" },
    { batchId: rice1._id, stage: "shipped",    operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Mumbai Port",                 quantityAfter: 4800, timestamp: daysAgo(8),  notes: "Loaded on container ship to Dubai" },
    { batchId: rice1._id, stage: "delivered",  operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Dubai, UAE",                  quantityAfter: 4800, timestamp: daysAgo(2),  notes: "Delivered to Al Rawabi Trading LLC" }
  );

  // WHEAT-2026-001: shipped
  logs.push(
    { batchId: wheat1._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing",  quantityAfter: 7800, timestamp: daysAgo(10) },
    { batchId: wheat1._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing",  quantityAfter: 7750, timestamp: daysAgo(9)  },
    { batchId: wheat1._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing",  quantityAfter: 7750, timestamp: daysAgo(8)  },
    { batchId: wheat1._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "Ludhiana Cold Storage",   quantityAfter: 7750, timestamp: daysAgo(7)  },
    { batchId: wheat1._id, stage: "shipped",    operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Delhi Railhead",          quantityAfter: 7750, timestamp: daysAgo(3),  notes: "En route to Chennai Port for export" }
  );

  // MAIZE-2026-001: warehoused
  logs.push(
    { batchId: maize1._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3400, timestamp: daysAgo(6) },
    { batchId: maize1._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3380, timestamp: daysAgo(5) },
    { batchId: maize1._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3380, timestamp: daysAgo(4) },
    { batchId: maize1._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "South Zone Warehouse, Hyderabad", quantityAfter: 3380, timestamp: daysAgo(3) }
  );

  // SOYBEAN: in grading
  logs.push(
    { batchId: soybean1._id, stage: "cleaning", operatorName: processor.name, operatorId: processor._id, location: "Indore Soya Plant", quantityAfter: 1960, timestamp: daysAgo(3) },
    { batchId: soybean1._id, stage: "grading",  operatorName: processor.name, operatorId: processor._id, location: "Indore Soya Plant", quantityAfter: 1940, timestamp: daysAgo(1), notes: "Grading in progress" }
  );

  // COTTON: in cleaning
  logs.push(
    { batchId: cotton1._id, stage: "cleaning", operatorName: processor.name, operatorId: processor._id, location: "Nagpur Ginning Mill", quantityAfter: 1180, timestamp: daysAgo(1), notes: "Ginning started" }
  );

  await ProcessingLog.create(logs);
  console.log(`📋 Created ${logs.length} processing logs`);

  // ── Inventory ─────────────────────────────────────────────────────────────
  const inventoryRecords = await Inventory.create([
    {
      batchId: rice1._id,
      warehouseLocation: "Central Warehouse, Mumbai",
      availableStock: 0,       // fully shipped out
      reservedStock: 0,
      unit: "kg",
      lowStockThreshold: 500,
      lastUpdatedBy: warehouse._id,
    },
    {
      batchId: wheat1._id,
      warehouseLocation: "Ludhiana Cold Storage",
      availableStock: 0,
      reservedStock: 7750,     // fully in transit
      unit: "kg",
      lowStockThreshold: 500,
      lastUpdatedBy: warehouse._id,
    },
    {
      batchId: maize1._id,
      warehouseLocation: "South Zone Warehouse, Hyderabad",
      availableStock: 3380,
      reservedStock: 0,
      unit: "kg",
      lowStockThreshold: 500,
      expiryDate: daysFrom(60),
      lastUpdatedBy: warehouse._id,
    },
  ]);
  console.log(`🏭 Created ${inventoryRecords.length} inventory records`);

  // ── Shipments ─────────────────────────────────────────────────────────────
  const shipments = await Shipment.create([
    {
      shipmentId: "SHP-2026-001",
      batchId: rice1._id,
      destination: "Dubai, UAE",
      dispatchDate: daysAgo(8),
      expectedDelivery: daysAgo(3),
      deliveryStatus: "delivered",
      quantityShipped: 4800,
      unit: "kg",
      transportMode: "sea",
      vehicleNumber: "CONT-UAE-4821",
      driverName: "Ahmed Al Farsi",
      createdBy: dispatcher._id,
      trackingNotes: [
        { note: "Shipment created by Priya Singh", addedBy: "Priya Singh", timestamp: daysAgo(8) },
        { note: "Departed Mumbai Port", addedBy: "Priya Singh", timestamp: daysAgo(7) },
        { note: "Arrived Dubai Port, customs clearance", addedBy: "Priya Singh", timestamp: daysAgo(3) },
        { note: "Delivered to Al Rawabi Trading LLC", addedBy: "Priya Singh", timestamp: daysAgo(2) },
      ],
    },
    {
      shipmentId: "SHP-2026-002",
      batchId: wheat1._id,
      destination: "Chennai Port → Singapore",
      dispatchDate: daysAgo(3),
      expectedDelivery: daysFrom(4),
      deliveryStatus: "in_transit",
      quantityShipped: 7750,
      unit: "kg",
      transportMode: "rail",
      vehicleNumber: "TN-15-AB-2341",
      driverName: "Ramesh Pillai",
      createdBy: dispatcher._id,
      trackingNotes: [
        { note: "Shipment created by Priya Singh", addedBy: "Priya Singh", timestamp: daysAgo(3) },
        { note: "Departed Delhi via rail", addedBy: "Priya Singh", timestamp: daysAgo(3) },
        { note: "Reached Nagpur junction", addedBy: "Priya Singh", timestamp: daysAgo(1) },
      ],
    },
  ]);
  console.log(`🚛 Created ${shipments.length} shipments`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("✅ SEED COMPLETE — AgriTrace is ready!");
  console.log("══════════════════════════════════════════");
  console.log("\n📊 Data Summary:");
  console.log(`   Users:       ${users.length}`);
  console.log(`   Batches:     ${batches.length}`);
  console.log(`   Proc. Logs:  ${logs.length}`);
  console.log(`   Inventory:   ${inventoryRecords.length}`);
  console.log(`   Shipments:   ${shipments.length}`);
  console.log("\n🔑 Login Credentials:");
  console.log("   admin@agritrace.com     → admin123     (full access)");
  console.log("   farmer@agritrace.com    → farmer123    (create batches)");
  console.log("   processor@agritrace.com → process123   (log stages)");
  console.log("   warehouse@agritrace.com → warehouse123 (manage stock)");
  console.log("   dispatch@agritrace.com  → dispatch123  (manage shipments)");
  console.log("\n📱 QR Trace URLs to test:");
  console.log("   http://localhost:3000/trace/RICE-2026-001");
  console.log("   http://localhost:3000/trace/WHEAT-2026-001");
  console.log("   http://localhost:3000/trace/MAIZE-2026-001");
  console.log("══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});