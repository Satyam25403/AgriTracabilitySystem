const Supplier = require("../models/Supplier");
const Batch = require("../models/Batch");

// GET /api/suppliers - get all suppliers with optional filters and pagination
exports.getAllSuppliers = async (req, res) => {
  try {
    const { country, status, search, type, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (country) filter.country = { $regex: country, $options: "i" };
    if (status)  filter.verificationStatus = status;
    if (type)    filter.type = type;
    if (search)  filter.$or = [
      { name:        { $regex: search, $options: "i" } },
      { country:     { $regex: search, $options: "i" } },
      { region:      { $regex: search, $options: "i" } },
      { contactName: { $regex: search, $options: "i" } },
      { commodities: { $regex: search, $options: "i" } },
    ];

    const total = await Supplier.countDocuments({ ...filter, isActive: true });
    const suppliers = await Supplier.find({ ...filter, isActive: true })
      .populate("createdBy", "name")
      .sort({ country: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/suppliers/:id - get supplier details by ID
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate("createdBy", "name role");
    if (!supplier || !supplier.isActive)
      return res.status(404).json({ success: false, message: "Supplier not found." });

    // Attach batch count for this supplier
    const batchCount = await Batch.countDocuments({
      "origins.supplier": supplier._id,
    });

    res.json({ success: true, supplier, batchCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/suppliers - create a new supplier
exports.createSupplier = async (req, res) => {
  try {
    const {
      name, type, country, region, contactName, contactEmail,
      contactPhone, certifications, commodities, farmerCount, notes,
    } = req.body;

    if (!name || !country) {
      return res.status(400).json({ success: false, message: "name and country are required." });
    }

    const supplier = await Supplier.create({
      name, type, country, region, contactName, contactEmail,
      contactPhone,
      certifications: certifications || [],
      commodities:    commodities    || [],
      farmerCount:    farmerCount    || 0,
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/suppliers/:id - update supplier details by ID
exports.updateSupplier = async (req, res) => {
  try {
    const allowed = [
      "name","type","country","region","contactName","contactEmail",
      "contactPhone","verificationStatus","certifications","commodities",
      "farmerCount","notes",
    ];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found." });

    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/suppliers/:id  — soft delete by setting isActive to false
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found." });
    res.json({ success: true, message: "Supplier deactivated." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/suppliers/:id/batches — all batches linked to this supplier (looking at origins)
exports.getSupplierBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ "origins.supplier": req.params.id })
      .select("batchId commodityType quantity unit currentStatus createdAt isMultiOrigin")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/suppliers/stats — dashboard summary stats for suppliers
exports.getSupplierStats = async (req, res) => {
  try {
    const [total, verified, byCountry, byType] = await Promise.all([
      Supplier.countDocuments({ isActive: true }),
      Supplier.countDocuments({ isActive: true, verificationStatus: "verified" }),
      Supplier.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Supplier.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ success: true, stats: { total, verified, byCountry, byType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};