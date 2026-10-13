const express = require("express");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// GET BILLS
router.get("/", authMiddleware, async (req, res) => {
  try {
    let bills;

    // Admin and staff can view all bills.
    if (
      req.user.role === "admin" ||
      req.user.role === "staff"
    ) {
      bills = await Billing.find();
    }

    // Residents can view only their own bills.
    else if (req.user.role === "resident") {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(401).json({
          message: "User account not found",
        });
      }

      const resident = await Resident.findOne({
        email: user.email,
      });

      if (!resident) {
        return res.json([]);
      }

      bills = await Billing.find({
        residentName: resident.name,
        roomNumber: resident.roomNumber,
      });
    } else {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    res.json(bills);
  } catch (error) {
    console.log("Fetch bills error:", error);

    res.status(500).json({
      message: "Failed to fetch bills",
    });
  }
});

// post bill
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        residentName,
        roomNumber,
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      } = req.body;

      if (!dueDate) {
        return res.status(400).json({
          message: "Due date is required",
        });
      }

      const bill = await Billing.create({
        residentName,
        roomNumber,
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      });

      // Find resident
      const resident = await Resident.findOne({
        name: residentName,
      });

      if (resident) {
        const user = await User.findOne({
          email: resident.email,
          role: "resident",
        });

        if (user) {

          // Pending payment notification
          if (paymentStatus === "Pending") {
            await Notification.create({
              userId: user._id,
              message: `Your hostel fee payment of ₹${total} is pending. Due date: ${new Date(dueDate).toLocaleDateString()}.`,
              type: "General",
            });
          }

          // Overdue payment notification
          if (
            paymentStatus !== "Paid" &&
            new Date(dueDate) < new Date()
          ) {
            await Notification.create({
              userId: user._id,
              message: `Your hostel fee payment of ₹${total} is overdue.`,
              type: "Overdue",
            });
          }
        }
      }

      res.status(201).json(bill);

    } catch (error) {
      console.log("Billing error:", error);

      res.status(400).json({
        message: "Failed to create bill",
      });
    }
  }
);

// update bill
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        residentName,
        roomNumber,
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      } = req.body;

      if (!dueDate) {
        return res.status(400).json({
          message: "Due date is required",
        });
      }

      const bill = await Billing.findByIdAndUpdate(
        req.params.id,
        {
          residentName,
          roomNumber,
          roomFee,
          utilityFee,
          additionalFee,
          discount,
          lateFee,
          total,
          paymentStatus,
          dueDate,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!bill) {
        return res.status(404).json({
          message: "Bill not found",
        });
      }

      res.json(bill);
    } catch (error) {
      res.status(400).json({
        message: "Failed to update bill",
      });
    }
  }
);

//delete bill
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const bill = await Billing.findByIdAndDelete(
        req.params.id
      );

      if (!bill) {
        return res.status(404).json({
          message: "Bill not found",
        });
      }

      res.json({
        message: "Bill deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message: "Failed to delete bill",
      });
    }
  }
);

module.exports = router;

