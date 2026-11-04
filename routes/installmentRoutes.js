const express = require("express");
const mongoose = require("mongoose");

const Installment = require("../models/installment");
const Billing = require("../models/billing");
const Payment = require("../models/payment");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

const INSTALLMENT_THRESHOLD = 10000;

const roundMoney = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

// Create exactly two installments for bills above ₹10,000.
router.post(
  "/:billId",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    try {
      const { billId } = req.params;
      const { dueDates } = req.body;

      if (!mongoose.Types.ObjectId.isValid(billId)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }

      const bill = await Billing.findById(billId);

      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // The threshold is based on the original bill total.
      const originalBillTotal = roundMoney(bill.total);

      if (originalBillTotal <= INSTALLMENT_THRESHOLD) {
        return res.status(400).json({
          message:
            "Installment plans are available only for bills above ₹10,000. Record a single payment instead.",
        });
      }

      const existingPlan = await Installment.findOne({ billId });

      if (existingPlan) {
        return res.status(409).json({
          message: "An installment plan already exists for this bill",
        });
      }

      // Calculate the amount already paid against this bill.
      // This assumes each payment document represents a recorded payment.
      const payments = await Payment.find({
        billId,
        $or: [
          { status: "Success" },
          { status: { $exists: false } },
        ],
      }).select("amount");
      
      const totalPaid = roundMoney(
        payments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        )
      );

      const remainingBalance = roundMoney(
        Math.max(0, originalBillTotal - totalPaid)
      );

      if (remainingBalance <= 0) {
        return res.status(400).json({
          message: "This bill has no remaining balance",
        });
      }

      // Two installments must have valid, ascending due dates.
      let firstDueDate;
      let secondDueDate;

      if (Array.isArray(dueDates) && dueDates.length === 2) {
        firstDueDate = new Date(dueDates[0]);
        secondDueDate = new Date(dueDates[1]);
      } else {
        // Defaults: bill due date and 15 days later.
        firstDueDate = new Date(bill.dueDate);

        if (Number.isNaN(firstDueDate.getTime())) {
          return res.status(400).json({
            message: "The bill must have a valid due date",
          });
        }

        secondDueDate = new Date(firstDueDate);
        secondDueDate.setDate(secondDueDate.getDate() + 15);
      }

      if (
        Number.isNaN(firstDueDate.getTime()) ||
        Number.isNaN(secondDueDate.getTime()) ||
        secondDueDate <= firstDueDate
      ) {
        return res.status(400).json({
          message: "Provide two valid due dates in ascending order",
        });
      }

      // Split the remaining balance without losing a paise to rounding.
      const firstAmount = roundMoney(remainingBalance / 2);
      const secondAmount = roundMoney(
        remainingBalance - firstAmount
      );

      const records = [
        {
          billId: bill._id,
          residentId: bill.residentId,
          installmentNumber: 1,
          amount: firstAmount,
          amountPaid: 0,
          dueDate: firstDueDate,
          status: "Pending",
        },
        {
          billId: bill._id,
          residentId: bill.residentId,
          installmentNumber: 2,
          amount: secondAmount,
          amountPaid: 0,
          dueDate: secondDueDate,
          status: "Pending",
        },
      ];

      const created = await Installment.insertMany(records);

      return res.status(201).json({
        message: "Two-installment plan created successfully",
        billTotal: originalBillTotal,
        totalPaid,
        remainingBalance,
        installments: created,
      });
    } catch (error) {
      console.error("Create installment plan error:", error);

      // Another request may have created the plan at the same time.
      if (error.code === 11000) {
        return res.status(409).json({
          message: "An installment plan already exists for this bill",
        });
      }

      return res.status(500).json({
        message: "Failed to create installment plan",
      });
    }
  }
);

// Get installments for a bill.
router.get("/:billId", authMiddleware, async (req, res) => {
  try {
    const { billId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Billing.findById(billId);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (req.user.role === "resident") {
      const User = require("../models/user");
      const Resident = require("../models/Resident");

      const user = await User.findById(req.user.id);
      const resident = user
        ? await Resident.findOne({ email: user.email })
        : null;

      if (
        !resident ||
        String(resident._id) !== String(bill.residentId)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (
      req.user.role !== "admin" &&
      req.user.role !== "staff"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const records = await Installment.find({ billId }).sort({
      installmentNumber: 1,
    });

    return res.json(records);
  } catch (error) {
    console.error("Fetch installments error:", error);

    return res.status(500).json({
      message: "Failed to fetch installments",
    });
  }
});

module.exports = router;
