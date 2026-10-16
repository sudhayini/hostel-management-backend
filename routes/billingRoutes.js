const express = require("express");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { sendEmail } = require("../services/emailService");

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
    } else if (req.user.role === "resident") {
      // Residents can view only their own bills.
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
        residentId: resident._id,
      });
    } else {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    return res.json(bills);
  } catch (error) {
    console.error("Fetch bills error:", error);

    return res.status(500).json({
      message: "Failed to fetch bills",
    });
  }
});

// CREATE BILL
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        residentId,
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      } = req.body;

      if (!residentId) {
        return res.status(400).json({
          message: "Please select a resident",
        });
      }

      if (!dueDate) {
        return res.status(400).json({
          message: "Due date is required",
        });
      }

      // Find the selected resident.
      const resident = await Resident.findById(residentId);

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      // Create the bill.
      const bill = await Billing.create({
        residentId: resident._id,
        residentName: resident.name,
        roomNumber: resident.roomNumber,
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      });

      // Find the resident's user account for notifications.
      const user = await User.findOne({
        email: resident.email,
        role: "resident",
      });

     
// Send bill email to the resident.
if (resident.email) {
  try {
    await sendEmail({
      to: resident.email,
      subject: "Hostel Management System - New Bill",
      text: `Hello ${resident.name},

A new hostel bill has been created for you.

Room Number: ${resident.roomNumber}
Total Amount: ₹${total}
Payment Status: ${paymentStatus || "Pending"}
Due Date: ${new Date(dueDate).toLocaleDateString()}

Please log in to the Hostel Management System to view your bill.

Thank you,
Hostel Management System`,
    });

    console.log("Bill email accepted by Brevo");
  } catch (emailError) {
    console.error("Bill email failed:", emailError.message);
  }
}

      if (user) {
        // Notify the resident about a pending bill.
        if (paymentStatus === "Pending") {
          await Notification.create({
            userId: user._id,
            message: `Your hostel fee payment of ₹${total} is pending. Due date: ${new Date(
              dueDate
            ).toLocaleDateString()}.`,
            type: "General",
          });
        }

        // Notify the resident if the bill is already overdue.
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

      return res.status(201).json(bill);
    } catch (error) {
      console.error("Billing error:", error);

      return res.status(400).json({
        message: "Failed to create bill",
      });
    }
  }
);

// UPDATE BILL
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        residentId,
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

      const resident = residentId
        ? await Resident.findById(residentId)
        : null;

      if (residentId && !resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      const updateData = {
        roomFee,
        utilityFee,
        additionalFee,
        discount,
        lateFee,
        total,
        paymentStatus,
        dueDate,
      };

      if (resident) {
        updateData.residentId = resident._id;
        updateData.residentName = resident.name;
        updateData.roomNumber = resident.roomNumber;
      }

      const bill = await Billing.findByIdAndUpdate(
        req.params.id,
        updateData,
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

      return res.json(bill);
    } catch (error) {
      console.error("Update bill error:", error);

      return res.status(400).json({
        message: "Failed to update bill",
      });
    }
  }
);

// DELETE BILL
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

      return res.json({
        message: "Bill deleted successfully",
      });
    } catch (error) {
      console.error("Delete bill error:", error);

      return res.status(400).json({
        message: "Failed to delete bill",
      });
    }
  }
);

module.exports = router;
