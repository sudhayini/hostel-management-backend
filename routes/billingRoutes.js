const express = require("express");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
const { sendEmail } = require("../services/emailService");

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
      residentId: resident._id, 
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

 router.post( "/", authMiddleware, roleMiddleware("admin", "staff"),
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
console.log("CREATE BILL ROUTE HIT");

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

      // Find the selected resident by MongoDB ID
      const resident = await Resident.findById(residentId);

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      // Create the bill using the selected resident's actual details
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

      // Find the resident's user account for notifications
      const user = await User.findOne({
        email: resident.email,
        role: "resident",
      });
         

      
       // Send email notification when the resident has an email address
      if (resident.email) {
        console.log("Attempting bill email to:", resident.email);
     try {
    await sendEmail({
      to: resident.email,
      subject: "New Hostel Fee Bill",
      text: `Hello ${resident.name},

A new hostel bill has been created for you.

Room: ${resident.roomNumber}
Total amount: ₹${total}
Payment status: ${paymentStatus}
Due date: ${new Date(dueDate).toLocaleDateString()}

Please log in to your Hostel Management System to view your bill.

Thank you,
Hostel Management Team`,
    });
  } catch (emailError) {
    // Don't fail bill creation if email delivery fails
    console.error("Bill email failed:", emailError);
  }
}

      if (user) {
        // Pending payment notification
        if (paymentStatus === "Pending") {
          await Notification.create({
            userId: user._id,
            message: `Your hostel fee payment of ₹${total} is pending. Due date: ${new Date(
              dueDate
            ).toLocaleDateString()}.`,
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

      // Find the selected resident
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

      // Update resident details only when a resident ID is provided.
      // This allows older bills without residentId to remain editable.
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

      res.json(bill);
    } catch (error) {
      console.log("Update bill error:", error);

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

