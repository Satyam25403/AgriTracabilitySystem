const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/authMiddleware");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Block self-assignment of admin role via the public register endpoint.
    // Admin accounts can only be created by an existing admin (see POST /api/auth/users below).
    const ALLOWED_SELF_REGISTER_ROLES = ["farmer", "processor", "warehouse", "dispatcher"];
    const requestedRole = role && ALLOWED_SELF_REGISTER_ROLES.includes(role) ? role : "farmer";

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    // Special case: if this is the very first user in the system, make them admin.
    // This lets a fresh installation bootstrap without needing a separate seed step.
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? "admin" : requestedRole;

    const user = await User.create({ name, email, password, role: assignedRole });
    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      ...(userCount === 0 && { notice: "First user registered as admin automatically." }),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/users  — admin creates any role including other admins (protected)
router.post("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "name, email, password and role are all required." });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }
    const user = await User.create({ name, email, password, role });
    res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }
    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me  (protected)
router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/users  (admin only)
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/auth/users/:id  — admin toggles isActive or changes role (admin only)
router.patch("/users/:id", protect, authorize("admin"), async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot modify your own account here." });
    }
    const { isActive, role } = req.body;
    const updates = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (role !== undefined)     updates.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;