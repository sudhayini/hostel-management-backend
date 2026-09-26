const express = require("express");
const bcrypt = require("bcryptjs");

const Resident = require("../models/Resident");
const User = require("../models/user");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// GET all residents
router.get("/", authMiddleware, async (req, res) => {
  try {
    const residents = await Resident.find();
    res.json(residents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch residents" });
  }
});


// POST new resident
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        name,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        email,
        roomNumber,
      } = req.body;

      // Check if a login account already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          message: "A user account with this email already exists",
        });
      }

      // Create resident
      const resident = await Resident.create({
        name,
        phone,
        emergencyContactName,
        emergencyContactPhone,
        email,
        roomNumber,
      });

      // Create default password
      const hashedPassword = await bcrypt.hash(
        "Resident@123",
        10
      );

      // Create resident login account
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: "resident",
      });

      res.status(201).json({
        message: "Resident and login account created successfully",
        resident,
      });
    } catch (error) {
      console.log("Resident creation error:", error);

  res.status(400).json({
    message: error.message ||"Failed to create resident",
  });
    }
  }
);
// PUT update resident
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const resident = await Resident.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      res.json(resident);
    } catch (error) {
      res.status(400).json({
        message: "Failed to update resident",
      });
    }
  }
);

// DELETE resident
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      // Find resident first
      const resident = await Resident.findById(req.params.id);

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      // Delete resident login account
      await User.findOneAndDelete({
        email: resident.email,
        role: "resident",
      });

      // Delete resident record
      await Resident.findByIdAndDelete(req.params.id);

      res.json({
        message: "Resident and login account deleted successfully",
      });
    } catch (error) {
      console.log("Delete resident error:", error);

      res.status(400).json({
        message: error.message || "Failed to delete resident",
      });
    }
  }
);


module.exports = router;