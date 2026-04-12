/**
 * AgriTrace — Database Seeder
 * Run: node seed.js
 * From: /server directory
 */

require("dotenv").config();
const mongoose = require("mongoose");

const User           = require("./models/User");
const Supplier       = require("./models/Supplier");
const Batch          = require("./models/Batch");
const ProcessingLog  = require("./models/ProcessingLog");
const Inventory      = require("./models/Inventory");
const Shipment       = require("./models/Shipment");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/agritrace";

const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const daysFrom = (n) => new Date(Date.now() + n * 86400000);
const pad      = (n) => String(n).padStart(3, "0");

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // ── Wipe ─────────────────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany(),
    Supplier.deleteMany(),
    Batch.deleteMany(),
    ProcessingLog.deleteMany(),
    Inventory.deleteMany(),
    Shipment.deleteMany(),
  ]);
  console.log("🗑  Cleared existing data");

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = await User.create([
    { name: "Admin User",    email: "admin@agritrace.com",     password: "admin123",     role: "admin"      },
    { name: "Ravi Kumar",    email: "farmer@agritrace.com",    password: "farmer123",    role: "farmer"     },
    { name: "Sunita Sharma", email: "processor@agritrace.com", password: "process123",   role: "processor"  },
    { name: "Mohan Das",     email: "warehouse@agritrace.com", password: "warehouse123", role: "warehouse"  },
    { name: "Priya Singh",   email: "dispatch@agritrace.com",  password: "dispatch123",  role: "dispatcher" },
  ]);
  const [admin, farmer, processor, warehouse, dispatcher] = users;
  console.log("👥 Created 5 users");

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const suppliersData = await Supplier.create([
    {
      name: "Ravi Kumar Farmer Group",
      type: "farmer_group",
      country: "India",
      region: "Kerala",
      contactName: "Ravi Kumar",
      contactEmail: "ravi@example.com",
      contactPhone: "+91 98765 43210",
      farmerCount: 45,
      certifications: ["GAP", "FSSAI"],
      commodities: ["Black Pepper", "Turmeric", "Ginger"],
      verificationStatus: "verified",
      notes: "Longstanding partner since 2021. NABL-aligned testing.",
      createdBy: admin._id,
    },
    {
      name: "Vietnam Pepper Cooperative",
      type: "cooperative",
      country: "Vietnam",
      region: "Dak Lak",
      contactName: "Nguyen Van An",
      contactEmail: "nguyen@vietpepperco.vn",
      contactPhone: "+84 90 1234 567",
      farmerCount: 120,
      certifications: ["ISO 22000", "HACCP", "BRC"],
      commodities: ["Black Pepper", "Chilli", "Paprika"],
      verificationStatus: "verified",
      notes: "G5 grade piperine ≥5.5%. Dual-lab validated.",
      createdBy: admin._id,
    },
    {
      name: "Lanka Spice Partners",
      type: "processor",
      country: "Sri Lanka",
      region: "Kandy",
      contactName: "Priya Fernando",
      contactEmail: "priya@lankaspice.lk",
      contactPhone: "+94 77 234 5678",
      farmerCount: 0,
      certifications: ["BRC", "FDA (FSMA)", "HACCP", "ISO 22000"],
      commodities: ["Cinnamon", "Cardamom", "Black Pepper"],
      verificationStatus: "verified",
      notes: "BRCGS AA-rated processing facility. EU/US/UK compliant.",
      createdBy: admin._id,
    },
    {
      name: "Brazil Agro Group",
      type: "farmer_group",
      country: "Brazil",
      region: "Minas Gerais",
      contactName: "Carlos Silva",
      contactEmail: "carlos@brazilago.com",
      contactPhone: "+55 31 9876 5432",
      farmerCount: 78,
      certifications: ["GAP", "Fairtrade"],
      commodities: ["Black Pepper", "Chilli"],
      verificationStatus: "pending",
      notes: "New partner. Audit scheduled Q2 2026.",
      createdBy: admin._id,
    },
    {
      name: "Hyderabad Agri Hub",
      type: "processor",
      country: "India",
      region: "Telangana",
      contactName: "Anita Reddy",
      contactEmail: "anita@hybagri.in",
      farmerCount: 0,
      certifications: ["FSSAI", "HACCP"],
      commodities: ["Maize", "Turmeric", "Chilli"],
      verificationStatus: "verified",
      createdBy: admin._id,
    },
  ]);
  console.log(`🤝 Created ${suppliersData.length} suppliers`);

  const [suppIndia, suppVietnam, suppLanka, suppBrazil, suppHyd] = suppliersData;

  // ── Batches ───────────────────────────────────────────────────────────────
  const batchData = [
    // Multi-origin Black Pepper — fully delivered
    {
      batchId: `BLACKP-2026-${pad(1)}`,
      commodityType: "Black Pepper",
      isMultiOrigin: true,
      quantity: 4000,
      unit: "kg",
      currentStatus: "delivered",
      createdBy: admin._id,
      notes: "Premium multi-origin consolidation for EU export",
      origins: [
        {
          country: "India", region: "Kerala",
          farmerGroup: "Ravi Kumar Farmer Group",
          supplier: suppIndia._id,
          quantity: 2500, unit: "kg",
          harvestDate: daysAgo(22),
          notes: "Piperine ≥5.5% (G5 grade)",
        },
        {
          country: "Vietnam", region: "Dak Lak",
          farmerGroup: "Vietnam Pepper Cooperative",
          supplier: suppVietnam._id,
          quantity: 1500, unit: "kg",
          harvestDate: daysAgo(20),
          notes: "HTST treated, moisture 11%",
        },
      ],
    },
    // Single-origin Wheat — shipped
    {
      batchId: `WHEAT-2026-${pad(1)}`,
      commodityType: "Wheat",
      farmerName: "Suresh Patel",
      farmLocation: "Amritsar, Punjab, India",
      harvestDate: daysAgo(12),
      quantity: 8000,
      unit: "kg",
      currentStatus: "shipped",
      createdBy: admin._id,
    },
    // Single-origin Maize — warehoused
    {
      batchId: `MAIZE-2026-${pad(1)}`,
      commodityType: "Maize",
      farmerName: "Anita Reddy",
      farmLocation: "Hyderabad, Telangana, India",
      harvestDate: daysAgo(8),
      quantity: 3500,
      unit: "kg",
      currentStatus: "warehoused",
      createdBy: admin._id,
    },
    // Single-origin Turmeric — in grading
    {
      batchId: `TURME-2026-${pad(1)}`,
      commodityType: "Turmeric",
      farmerName: "Prakash Joshi",
      farmLocation: "Erode, Tamil Nadu, India",
      harvestDate: daysAgo(5),
      quantity: 2000,
      unit: "kg",
      currentStatus: "grading",
      createdBy: farmer._id,
    },
    // Multi-origin Chilli — in cleaning
    {
      batchId: `CHILL-2026-${pad(1)}`,
      commodityType: "Chilli",
      isMultiOrigin: true,
      quantity: 3200,
      unit: "kg",
      currentStatus: "cleaning",
      createdBy: farmer._id,
      notes: "High-SHU blend consolidation",
      origins: [
        {
          country: "India", region: "Andhra Pradesh",
          farmerGroup: "Guntur Chilli Growers",
          quantity: 2000, unit: "kg",
          harvestDate: daysAgo(6),
          notes: "Capsaicin ≥60,000 SHU",
        },
        {
          country: "Vietnam", region: "Ho Chi Minh",
          farmerGroup: "Vietnam Pepper Cooperative",
          supplier: suppVietnam._id,
          quantity: 1200, unit: "kg",
          harvestDate: daysAgo(5),
        },
      ],
    },
    // Single-origin Rice — freshly sourced
    {
      batchId: `RICE-2026-${pad(1)}`,
      commodityType: "Rice",
      farmerName: "Deepak Yadav",
      farmLocation: "Cuttack, Odisha, India",
      harvestDate: daysAgo(1),
      quantity: 4500,
      unit: "kg",
      currentStatus: "sourced",
      createdBy: farmer._id,
      notes: "IR-64 variety",
    },
  ];

  const batches = await Batch.create(batchData);
  console.log(`📦 Created ${batches.length} batches (2 multi-origin, 4 single-origin)`);

  const [blackPepper, wheat, maize, turmeric, chilli, rice] = batches;

  // ── Processing Logs ───────────────────────────────────────────────────────
  const logs = [];

  // BLACK PEPPER — full journey (delivered)
  logs.push(
    { batchId: blackPepper._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Lanka Spice Partners, Kandy",   quantityAfter: 3880, timestamp: daysAgo(18), notes: "3% moisture reduction, cleaning complete" },
    { batchId: blackPepper._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Lanka Spice Partners, Kandy",   quantityAfter: 3840, timestamp: daysAgo(16), notes: "G5 grade confirmed. Piperine avg 5.6%" },
    { batchId: blackPepper._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Lanka Spice Partners, Kandy",   quantityAfter: 3840, timestamp: daysAgo(14), notes: "Packed in 25kg HDPE sacks. 153 bags." },
    { batchId: blackPepper._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "Bengaluru Operations Hub",       quantityAfter: 3840, timestamp: daysAgo(12), notes: "Stored at 18°C, humidity <60%" },
    { batchId: blackPepper._id, stage: "shipped",    operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Chennai Port",                   quantityAfter: 3840, timestamp: daysAgo(8),  notes: "FCL container CTIU3456789 to Rotterdam" },
    { batchId: blackPepper._id, stage: "delivered",  operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Rotterdam, Netherlands",         quantityAfter: 3840, timestamp: daysAgo(2),  notes: "Delivered to Spice Masters BV, Rotterdam" }
  );

  // WHEAT — shipped
  logs.push(
    { batchId: wheat._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing, Ludhiana", quantityAfter: 7800, timestamp: daysAgo(10) },
    { batchId: wheat._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing, Ludhiana", quantityAfter: 7750, timestamp: daysAgo(9)  },
    { batchId: wheat._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Punjab Agro Processing, Ludhiana", quantityAfter: 7750, timestamp: daysAgo(8)  },
    { batchId: wheat._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "Ludhiana Cold Storage",           quantityAfter: 7750, timestamp: daysAgo(7)  },
    { batchId: wheat._id, stage: "shipped",    operatorName: dispatcher.name,operatorId: dispatcher._id,location: "Delhi Railhead",                  quantityAfter: 7750, timestamp: daysAgo(3),  notes: "En route to Chennai Port for export" }
  );

  // MAIZE — warehoused
  logs.push(
    { batchId: maize._id, stage: "cleaning",   operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3400, timestamp: daysAgo(6) },
    { batchId: maize._id, stage: "grading",    operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3380, timestamp: daysAgo(5) },
    { batchId: maize._id, stage: "packaging",  operatorName: processor.name, operatorId: processor._id, location: "Hyderabad Agri Hub", quantityAfter: 3380, timestamp: daysAgo(4) },
    { batchId: maize._id, stage: "warehoused", operatorName: warehouse.name, operatorId: warehouse._id, location: "South Zone Warehouse, Hyderabad", quantityAfter: 3380, timestamp: daysAgo(3) }
  );

  // TURMERIC — grading
  logs.push(
    { batchId: turmeric._id, stage: "cleaning", operatorName: processor.name, operatorId: processor._id, location: "Erode Processing Unit", quantityAfter: 1960, timestamp: daysAgo(3) },
    { batchId: turmeric._id, stage: "grading",  operatorName: processor.name, operatorId: processor._id, location: "Erode Processing Unit", quantityAfter: 1940, timestamp: daysAgo(1), notes: "Curcumin content 4.8% — above Kera grade spec" }
  );

  // CHILLI — cleaning
  logs.push(
    { batchId: chilli._id, stage: "cleaning", operatorName: processor.name, operatorId: processor._id, location: "Guntur Processing Facility", quantityAfter: 3100, timestamp: daysAgo(1), notes: "HTST treatment applied. Initial cleaning complete." }
  );

  await ProcessingLog.create(logs);
  console.log(`📋 Created ${logs.length} processing logs`);

  // ── Inventory ─────────────────────────────────────────────────────────────
  const inventoryRecords = await Inventory.create([
    {
      batchId: blackPepper._id,
      warehouseLocation: "Bengaluru Operations Hub",
      availableStock: 0,
      reservedStock: 0,
      unit: "kg",
      lowStockThreshold: 500,
      lastUpdatedBy: warehouse._id,
    },
    {
      batchId: wheat._id,
      warehouseLocation: "Ludhiana Cold Storage",
      availableStock: 0,
      reservedStock: 7750,
      unit: "kg",
      lowStockThreshold: 500,
      lastUpdatedBy: warehouse._id,
    },
    {
      batchId: maize._id,
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
      batchId: blackPepper._id,
      destination: "Rotterdam, Netherlands",
      dispatchDate: daysAgo(8),
      expectedDelivery: daysAgo(3),
      deliveryStatus: "delivered",
      quantityShipped: 3840,
      unit: "kg",
      transportMode: "sea",
      vehicleNumber: "CTIU3456789",
      driverName: "Ahmed Al Farsi",
      createdBy: dispatcher._id,
      trackingNotes: [
        { note: "Shipment created by Priya Singh", addedBy: "Priya Singh", timestamp: daysAgo(8) },
        { note: "FCL container sealed and departed Chennai Port", addedBy: "Priya Singh", timestamp: daysAgo(7) },
        { note: "Arrived Rotterdam Port, customs clearance complete", addedBy: "Priya Singh", timestamp: daysAgo(3) },
        { note: "Delivered to Spice Masters BV. COA and documentation handed over.", addedBy: "Priya Singh", timestamp: daysAgo(2) },
      ],
    },
    {
      shipmentId: "SHP-2026-002",
      batchId: wheat._id,
      destination: "Singapore",
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
        { note: "Departed Delhi via rail to Chennai Port", addedBy: "Priya Singh", timestamp: daysAgo(3) },
        { note: "Reached Nagpur junction", addedBy: "Priya Singh", timestamp: daysAgo(1) },
      ],
    },
  ]);
  console.log(`🚛 Created ${shipments.length} shipments`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("✅ SEED COMPLETE");
  console.log("══════════════════════════════════════════");
  console.log("\n📊 Data created:");
  console.log("   Users:      ", users.length);
  console.log("   Suppliers:  ", suppliersData.length);
  console.log("   Batches:    ", batches.length, "(2 multi-origin, 4 single-origin)");
  console.log("   Proc. Logs: ", logs.length);
  console.log("   Inventory:  ", inventoryRecords.length);
  console.log("   Shipments:  ", shipments.length);
  console.log("\n🔑 Login credentials:");
  console.log("   admin@agritrace.com     → admin123");
  console.log("   farmer@agritrace.com    → farmer123");
  console.log("   processor@agritrace.com → process123");
  console.log("   warehouse@agritrace.com → warehouse123");
  console.log("   dispatch@agritrace.com  → dispatch123");
  console.log("\n🔍 Multi-origin trace URLs:");
  console.log("   http://localhost:3000/trace/BLACKP-2026-001  (India + Vietnam Black Pepper)");
  console.log("   http://localhost:3000/trace/CHILL-2026-001   (India + Vietnam Chilli)");
  console.log("\n🤝 Suppliers loaded:", suppliersData.map(s=>s.name).join(", "));
  console.log("══════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});