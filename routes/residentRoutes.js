const express = require("express");
const bcrypt = require("bcryptjs");

const Resident = require("../models/Resident");
const User = require("../models/user");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// get all resident
router.get("/", authMiddleware, async (req, res) => {
  try {
    const residents = await Resident.find();

    res.json(residents);
  } catch (error) {
    console.log("Fetch residents error:", error);

    res.status(500).json({
      message: "Failed to fetch residents",
    });
  }
});


//create a resident
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

      // Check if login account already exists
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
        message: error.message || "Failed to create resident",
      });
    }
  }
);


// update 
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const resident = await Resident.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      res.json(resident);
    } catch (error) {
      console.log("Update resident error:", error);

      res.status(400).json({
        message: error.message || "Failed to update resident",
      });
    }
  }
);



// delete resident (Admin only)
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

      console.log("Deleting resident:", resident.name);
      console.log("Resident email:", resident.email);

      // Find the resident's login account
      const user = await User.findOne({
        email: resident.email,
        role: "resident",
      });

      console.log("Resident user found:", user);

      // Delete resident login account
      if (user) {
        await User.findByIdAndDelete(user._id);

        console.log(
          "Resident login account deleted:",
          user.email
        );
      } else {
        console.log(
          "No matching resident login account found"
        );
      }

      // Delete resident record
      await Resident.findByIdAndDelete(req.params.id);

      console.log(
        "Resident record deleted:",
        resident.name
      );

      res.json({
        message:
          "Resident and login account deleted successfully",
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

