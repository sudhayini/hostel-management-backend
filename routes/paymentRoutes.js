const express = require("express");
const Payment = require("../models/payment");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get all payment records
router.get("/", authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const payments = await Payment.find()
        .sort({ paymentDate: -1 });

      res.json(payments);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch payments",
      });
    }
  }
);

// create a payments
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const {
        billId,
        residentName,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      } = req.body;

      if (!billId || !residentName || !amount || !paymentMethod) {
        return res.status(400).json({
          message: "Bill, resident, amount and payment method are required",
        });
      }

      const payment = await Payment.create({
        billId,
        residentName,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      });

      res.status(201).json(payment);
    } catch (error) {
      console.log("Payment error:", error);

      res.status(400).json({
        message: "Failed to create payment",
      });
    }
  }
);

module.exports = router;

