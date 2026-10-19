const express = require("express");
const Billing = require("../models/billing");
const Payment = require("../models/payment");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

const LATE_FEE_PER_MONTH = 100;

// Calculate the base bill total without a late fee.
const calculateBaseTotal = (bill) => {
  return Math.max(
    0,
    Number(bill.roomFee || 0) +
      Number(bill.utilityFee || 0) +
      Number(bill.additionalFee || 0) -
      Number(bill.discount || 0)
  );
};

// Include successful payments and older records without a status field.
const getTotalPaid = async (billId) => {
  const payments = await Payment.find({
    billId,
    $or: [
      { status: "Success" },
      { status: { $exists: false } },
    ],
  });

  return payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
};

// Calculate ₹100 per overdue month while the base bill has a balance.
const calculateLateFee = (bill, totalPaid) => {
  const dueDate = new Date(bill.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const baseTotal = calculateBaseTotal(bill);

  if (
    today <= dueDate ||
    baseTotal <= 0 ||
    totalPaid >= baseTotal
  ) {
    return 0;
  }

  let months =
    (today.getFullYear() - dueDate.getFullYear()) * 12 +
    (today.getMonth() - dueDate.getMonth());

  if (today.getDate() < dueDate.getDate()) {
    months -= 1;
  }

  // Charge the first ₹100 after the bill becomes overdue.
  months = Math.max(1, months);

  return months * LATE_FEE_PER_MONTH;
};

// Build a bill response using current payments and late fees.
const buildBillResponse = async (bill) => {
  const totalPaid = await getTotalPaid(bill._id);
  const baseTotal = calculateBaseTotal(bill);
  const lateFee = calculateLateFee(bill, totalPaid);
  const total = baseTotal + lateFee;

  let paymentStatus = "Pending";

  if (totalPaid >= total) {
    paymentStatus = "Paid";
  } else if (totalPaid > 0) {
    paymentStatus = "Partially Paid";
  }

  return {
    ...bill.toObject(),
    lateFee,
    total,
    paymentStatus,
  };
};

// GET BILLS
router.get("/", authMiddleware, async (req, res) => {
  try {
    let bills;

    if (
      req.user.role === "admin" ||
      req.user.role === "staff"
    ) {
      bills = await Billing.find();
    } else if (req.user.role === "resident") {
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

    const billsWithLateFees = await Promise.all(
      bills.map(buildBillResponse)
    );

    return res.json(billsWithLateFees);
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
        dueDate,
      } = req.body;

      if (!residentId) {
        return res.status(400).json({
          message: "Please select a resident",
        });
      }

      if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({
          message: "A valid due date is required",
        });
      }

      const amounts = {
        roomFee: Number(roomFee ?? 0),
        utilityFee: Number(utilityFee ?? 0),
        additionalFee: Number(additionalFee ?? 0),
        discount: Number(discount ?? 0),
      };

      if (
        Object.values(amounts).some(
          (amount) => !Number.isFinite(amount) || amount < 0
        )
      ) {
        return res.status(400).json({
          message: "Bill amounts must be valid non-negative numbers",
        });
      }

      const subtotal =
        amounts.roomFee +
        amounts.utilityFee +
        amounts.additionalFee;

      if (amounts.discount > subtotal) {
        return res.status(400).json({
          message: "Discount cannot exceed the fees",
        });
      }

      const resident = await Resident.findById(residentId);

      if (!resident) {
        return res.status(404).json({
          message: "Resident not found",
        });
      }

      const baseTotal = subtotal - amounts.discount;

      const bill = await Billing.create({
        residentId: resident._id,
        residentName: resident.name,
        roomNumber: resident.roomNumber,
        ...amounts,
        lateFee: 0,
        total: baseTotal,
        paymentStatus: "Pending",
        dueDate,
      });

      const user = await User.findOne({
        email: resident.email,
        role: "resident",
      });

      if (resident.email) {
        try {
          await sendEmail({
            to: resident.email,
            subject: "Hostel Management System - New Bill",
            text: `Hello ${resident.name},

A new hostel bill has been created for you.

Room Number: ${resident.roomNumber}
Base Amount: ₹${baseTotal.toFixed(2)}
Payment Status: Pending
Due Date: ${new Date(dueDate).toLocaleDateString("en-IN")}

Please log in to the Hostel Management System to view your bill.

Thank you,
Hostel Management System`,
          });
        } catch (emailError) {
          console.error(
            "Bill email failed:",
            emailError.message
          );
        }
      }

      if (user) {
        await Notification.create({
          userId: user._id,
          message: `Your hostel bill of ₹${baseTotal.toFixed(
            2
          )} has been created. Due date: ${new Date(
            dueDate
          ).toLocaleDateString("en-IN")}.`,
          type: "General",
        });
      }

      const responseBill = await buildBillResponse(bill);

      return res.status(201).json(responseBill);
    } catch (error) {
      console.error("Create bill error:", error);

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
        dueDate,
      } = req.body;

      if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({
          message: "A valid due date is required",
        });
      }

      const amounts = {
        roomFee: Number(roomFee ?? 0),
        utilityFee: Number(utilityFee ?? 0),
        additionalFee: Number(additionalFee ?? 0),
        discount: Number(discount ?? 0),
      };

      if (
        Object.values(amounts).some(
          (amount) => !Number.isFinite(amount) || amount < 0
        )
      ) {
        return res.status(400).json({
          message: "Bill amounts must be valid non-negative numbers",
        });
      }

      const subtotal =
        amounts.roomFee +
        amounts.utilityFee +
        amounts.additionalFee;

      if (amounts.discount > subtotal) {
        return res.status(400).json({
          message: "Discount cannot exceed the fees",
        });
      }

      const bill = await Billing.findById(req.params.id);

      if (!bill) {
        return res.status(404).json({
          message: "Bill not found",
        });
      }

      let resident = null;

      if (residentId) {
        resident = await Resident.findById(residentId);

        if (!resident) {
          return res.status(404).json({
            message: "Resident not found",
          });
        }

        bill.residentId = resident._id;
        bill.residentName = resident.name;
        bill.roomNumber = resident.roomNumber;
      }

      bill.roomFee = amounts.roomFee;
      bill.utilityFee = amounts.utilityFee;
      bill.additionalFee = amounts.additionalFee;
      bill.discount = amounts.discount;
      bill.dueDate = new Date(dueDate);

      // Recalculate using existing successful payments.
      const totalPaid = await getTotalPaid(bill._id);
      const baseTotal = calculateBaseTotal(bill);
      const lateFee = calculateLateFee(bill, totalPaid);

      bill.lateFee = lateFee;
      bill.total = baseTotal + lateFee;

      if (totalPaid >= bill.total) {
        bill.paymentStatus = "Paid";
      } else if (totalPaid > 0) {
        bill.paymentStatus = "Partially Paid";
      } else {
        bill.paymentStatus = "Pending";
      }

      await bill.save();

      return res.json(await buildBillResponse(bill));
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
      const bill = await Billing.findByIdAndDelete(req.params.id);

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
