const express = require("express");
const mongoose = require("mongoose");

const Payment = require("../models/payment");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { sendEmail } = require("../services/emailService");

const router = express.Router();

// Get payment records
router.get("/", authMiddleware, async (req, res) => {
  try {
    let payments;

    // Admin and staff can view all payments.
    if (
      req.user.role === "admin" ||
      req.user.role === "staff"
    ) {
      payments = await Payment.find().sort({
        paymentDate: -1,
      });
    } else if (req.user.role === "resident") {
      // Residents can view only their own payments.
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

      const bills = await Billing.find({
        residentId: resident._id,
      }).select("_id");

      const billIds = bills.map((bill) => bill._id);

      payments = await Payment.find({
        billId: { $in: billIds },
      }).sort({ paymentDate: -1 });
    } else {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    return res.json(payments);
  } catch (error) {
    console.error("Fetch payments error:", error);

    return res.status(500).json({
      message: "Failed to fetch payments",
    });
  }
});

// Create a payment
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        billId,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      } = req.body;

      if (!billId || amount == null || !paymentMethod) {
        return res.status(400).json({
          message:
            "Bill, amount and payment method are required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(billId)) {
        return res.status(400).json({
          message: "Invalid bill ID",
        });
      }

      const bill = await Billing.findById(billId);

      if (!bill) {
        return res.status(404).json({
          message: "Bill not found",
        });
      }

      // Save the payment record.
      const payment = await Payment.create({
        billId: bill._id,
        residentName: bill.residentName,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      });

      // Find the resident's user account.
      const resident = await Resident.findById(bill.residentId);
     

      if (resident) {
        const user = await User.findOne({
          email: resident.email,
          role: "resident",
        });
    
if (user) {
  // Create in-app payment notification.
  await Notification.create({
    userId: user._id,
    message: `Your payment of ₹${amount} has been recorded successfully. Payment method: ${paymentMethod}.`,
    type: "General",
  });

  // Send payment confirmation email.
  if (resident.email) {
    try {
      await sendEmail({
        to: resident.email,
        subject: "Hostel Management System - Payment Confirmation",
        text: `Hello ${resident.name},

Your payment has been recorded successfully.

Amount Paid: ₹${amount}
Payment Method: ${paymentMethod}
Payment Date: ${new Date(
          paymentDate || Date.now()
        ).toLocaleDateString()}

Thank you,
Hostel Management System`,
      });

      console.log("Payment email accepted by Brevo");
    } catch (emailError) {
      console.error(
        "Payment email failed:",
        emailError.message
      );
    }
  }
}

      }

      return res.status(201).json(payment);
    } catch (error) {
      console.error("Payment error:", error);

      return res.status(500).json({
        message: "Payment was not completed successfully",
      });
    }
  }
);

module.exports = router;
