const express = require("express");
const Maintenance = require("../models/maintenance");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// get all maintenance requests
router.get("/", authMiddleware, async (req, res) => {
  try {
    const maintenance = await Maintenance.find();
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch maintenance requests",
    });
  }
});

// post maintenance
router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const maintenance = await Maintenance.create(req.body);

      // Create notification for assigned staff
      if (maintenance.assignedStaff) {
        const staff = await User.findOne({
          name: maintenance.assignedStaff,
          role: "staff",
        });

        if (staff) {
          await Notification.create({
            userId: staff._id,
            message: `New maintenance request assigned to you: ${maintenance.issue}`,
            type: "Maintenance",
          });
        }
      }

      res.status(201).json(maintenance);
    } catch (error) {
      console.log("Create maintenance error:", error);

      res.status(400).json({
        message: "Failed to create maintenance request",
      });
    }
  }
);

// put update maintenance request
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const oldMaintenance = await Maintenance.findById(req.params.id);

      if (!oldMaintenance) {
        return res.status(404).json({
          message: "Maintenance request not found",
        });
      }

      const maintenance = await Maintenance.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      // Notify staff if a staff member was newly assigned
      if (
        maintenance.assignedStaff &&
        maintenance.assignedStaff !== oldMaintenance.assignedStaff
      ) {
        const staff = await User.findOne({
          name: maintenance.assignedStaff,
          role: "staff",
        });

        if (staff) {
          await Notification.create({
            userId: staff._id,
            message: `New maintenance request assigned to you: ${maintenance.issue}`,
            type: "Maintenance",
          });
        }
      }

      res.json(maintenance);
    } catch (error) {
      console.log("Update maintenance error:", error);

      res.status(400).json({
        message: "Failed to update maintenance request",
      });
    }
  }
);

// delte maintenance request
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const maintenance = await Maintenance.findByIdAndDelete(
        req.params.id
      );

      if (!maintenance) {
        return res.status(404).json({
          message: "Maintenance request not found",
        });
      }

      res.json({
        message: "Maintenance request deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "Failed to delete maintenance request",
      });
    }
  }
);

module.exports = router;