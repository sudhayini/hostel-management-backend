const express = require("express");
const mongoose = require("mongoose");

const Payment = require("../models/payment");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

// Get all payment records
router.get( "/", authMiddleware, async (req, res) => {
    try {
      let payments;

      // Admin and staff can view all payments
      if (
        req.user.role === "admin" ||
        req.user.role === "staff"
      ) {
        payments = await Payment.find()
          .sort({ paymentDate: -1 });
      }

      // Residents can view only their own payments
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

        // Find bills belonging to this resident
        const bills = await Billing.find({
          residentId: resident._id,
        }).select("_id");

        const billIds = bills.map((bill) =>
          bill._id);

        // Return payments linked to those bills
        payments = await Payment.find({
          billId: { $in: billIds },
        }).sort({ paymentDate: -1 });
      } else {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      res.json(payments);
    } catch (error) {
      console.log("Fetch payments error:", error);

      res.status(500).json({
        message: "Failed to fetch payments",
      });
    }
  }
);

// create a payments
router.post("/", authMiddleware, roleMiddleware("admin", "staff"),
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
          message: "Bill, amount and payment method are required",
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

      const payment = await Payment.create({
        billId: bill._id,
        residentName: bill.residentName,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      });

// Send payment confirmation email
try {
  const resident = await Resident.findById(bill.residentId);

  if (resident?.email) {
    await sendEmail({
      to: resident.email,
      subject: "Hostel Payment Confirmation",
      text: `Hello ${bill.residentName},

We have recorded your hostel payment.

Amount received: ₹${amount}
Payment method: ${paymentMethod}
Payment date: ${new Date(paymentDate || Date.now()).toLocaleDateString()}
Bill ID: ${bill._id}

Thank you,
Hostel Management Team`,
    });
  }
} catch (emailError) {
  // Payment is saved even if the email fails
  console.error("Payment confirmation email failed:", emailError.message);
}

      res.status(201).json(payment);
    } catch (error) {
      console.log("Payment error:", error);

      res.status(500).json({
        message: "Failed to create payment",
      });
    }
  }
);

module.exports = router;

