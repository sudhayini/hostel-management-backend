const express = require("express");
const mongoose = require("mongoose");

const Payment = require("../models/payment");
const Billing = require("../models/billing");
const Resident = require("../models/Resident");
const User = require("../models/user");
const Notification = require("../models/notification");
const Installment = require("../models/installment");

const authMiddleware = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const { sendEmail } = require("../services/emailService");

const router = express.Router();

const LATE_FEE_PER_MONTH = 100;
const INSTALLMENT_THRESHOLD = 10000;
const MONEY_TOLERANCE = 0.001;

const calculateBaseTotal = (bill) =>
  Math.max(
    0,
    Number(bill.roomFee || 0) +
      Number(bill.utilityFee || 0) +
      Number(bill.additionalFee || 0) -
      Number(bill.discount || 0)
  );

const calculateCurrentLateFee = (bill, totalPaid) => {
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

  return Math.max(1, months) * LATE_FEE_PER_MONTH;
};

// Payments with no status are treated as successful for
// compatibility with older payment documents.
const getSuccessfulTotalPaid = async (billId) => {
  const payments = await Payment.find({
    billId,
    $or: [
      { status: "Success" },
      { status: { $exists: false } },
    ],
  }).select("amount");

  return payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
};

const getCurrentBillTotal = async (bill) => {
  const totalPaid = await getSuccessfulTotalPaid(bill._id);
  const baseTotal = calculateBaseTotal(bill);
  const lateFee = calculateCurrentLateFee(bill, totalPaid);
  const currentTotal = baseTotal + lateFee;

  return {
    totalPaid,
    currentTotal,
    remaining: Math.max(0, currentTotal - totalPaid),
  };
};

const getInstallmentResponse = (installment) =>
  installment
    ? {
        _id: installment._id,
        billId: installment.billId,
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
        amountPaid: installment.amountPaid,
        dueDate: installment.dueDate,
        status: installment.status,
      }
    : null;

// GET /api/payments
// Admin/staff can view all payments.
// Residents can view payments for their own bills.
router.get("/", authMiddleware, async (req, res) => {
  try {
    let payments;

    if (
      req.user.role === "admin" ||
      req.user.role === "staff"
    ) {
      payments = await Payment.find().sort({
        paymentDate: -1,
      });
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

      const bills = await Billing.find({
        residentId: resident._id,
      }).select("_id");

      payments = await Payment.find({
        billId: { $in: bills.map((bill) => bill._id) },
      }).sort({
        paymentDate: -1,
      });
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

// POST /api/payments
// Only admin and staff can record payments.
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "staff"),
  async (req, res) => {
    const rawKey = req.body?.idempotencyKey;
    const idempotencyKey =
      typeof rawKey === "string" ? rawKey.trim() : "";

    try {
      const {
        billId,
        installmentId,
        amount,
        paymentMethod,
        paymentDate,
        transactionId,
        notes,
      } = req.body || {};

      if (!idempotencyKey || idempotencyKey.length > 100) {
        return res.status(400).json({
          message: "A valid idempotency key is required",
        });
      }

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

      const paymentAmount = Number(amount);

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          message: "Payment amount must be greater than zero",
        });
      }

      const allowedMethods = [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
        "Mock Payment",
      ];

      if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
          message: "Invalid payment method",
        });
      }

      // Check for an earlier request before checking balances.
      const existingPayment = await Payment.findOne({
        idempotencyKey,
      });

      if (existingPayment) {
        const sameRequest =
          String(existingPayment.billId) === String(billId) &&
          String(existingPayment.installmentId || "") ===
            String(installmentId || "") &&
          Number(existingPayment.amount) === paymentAmount &&
          existingPayment.paymentMethod === paymentMethod;

        if (!sameRequest) {
          return res.status(409).json({
            message:
              "This idempotency key has already been used for a different payment",
          });
        }

        const existingInstallment =
          existingPayment.installmentId
            ? await Installment.findById(
                existingPayment.installmentId
              )
            : null;

        return res.status(200).json({
          message: "Payment was already recorded",
          payment: existingPayment,
          installment: getInstallmentResponse(existingInstallment),
        });
      }

      const bill = await Billing.findById(billId);

      if (!bill) {
        return res.status(404).json({
          message: "Bill not found",
        });
      }

      // Load this bill's plan, if it has one.
      const planInstallments = await Installment.find({
        billId: bill._id,
      }).sort({ installmentNumber: 1 });

      const hasInstallmentPlan = planInstallments.length > 0;
      let installment = null;

      if (hasInstallmentPlan && !installmentId) {
        return res.status(400).json({
          message:
            "Select an installment before recording a payment for this bill",
        });
      }

      if (installmentId) {
        if (!mongoose.Types.ObjectId.isValid(installmentId)) {
          return res.status(400).json({
            message: "Invalid installment ID",
          });
        }

        installment = await Installment.findOne({
          _id: installmentId,
          billId: bill._id,
        });

        if (!installment) {
          return res.status(404).json({
            message: "Installment not found for this bill",
          });
        }

        if (
          Number(bill.total) <= INSTALLMENT_THRESHOLD &&
          !hasInstallmentPlan
        ) {
          return res.status(400).json({
            message:
              "This bill does not have an installment plan",
          });
        }

        const installmentRemaining = Math.max(
          0,
          Number(installment.amount) -
            Number(installment.amountPaid || 0)
        );

        if (installmentRemaining <= MONEY_TOLERANCE) {
          return res.status(400).json({
            message: "This installment is already fully paid",
          });
        }

        if (
          paymentAmount >
          installmentRemaining + MONEY_TOLERANCE
        ) {
          return res.status(400).json({
            message: `Payment exceeds this installment's remaining balance of ₹${installmentRemaining.toFixed(2)}`,
          });
        }
      }

      const balance = await getCurrentBillTotal(bill);

      if (balance.remaining <= MONEY_TOLERANCE) {
        return res.status(400).json({
          message: "This bill is already fully paid",
        });
      }

      if (
        paymentAmount >
        balance.remaining + MONEY_TOLERANCE
      ) {
        return res.status(400).json({
          message: `Payment exceeds the bill's outstanding balance of ₹${balance.remaining.toFixed(2)}`,
        });
      }

      // Create payment linked to the selected installment.
      const payment = await Payment.create({
        idempotencyKey,
        billId: bill._id,
        installmentId: installment ? installment._id : null,
        residentName: bill.residentName,
        amount: paymentAmount,
        paymentMethod,
        paymentDate: paymentDate || new Date(),
        transactionId,
        notes,
      });

      // Update the installment progress.
      if (installment) {
        installment.amountPaid = Math.min(
          Number(installment.amount),
          Number(installment.amountPaid || 0) + paymentAmount
        );

        installment.status =
          installment.amountPaid >=
          Number(installment.amount) - MONEY_TOLERANCE
            ? "Paid"
            : "Partially Paid";

        await installment.save();
      }

      // Recalculate the bill after recording the payment.
      const updatedBalance = await getCurrentBillTotal(bill);

      if (updatedBalance.remaining <= MONEY_TOLERANCE) {
        bill.paymentStatus = "Paid";
      } else if (updatedBalance.totalPaid > 0) {
        bill.paymentStatus = "Partially Paid";
      } else {
        bill.paymentStatus = "Pending";
      }

      bill.total = updatedBalance.currentTotal;
      bill.lateFee = calculateCurrentLateFee(
        bill,
        updatedBalance.totalPaid
      );

      await bill.save();

      // Send notifications and email without failing the payment
      // if a notification/email service is temporarily unavailable.
      try {
        const resident = await Resident.findById(bill.residentId);

        if (resident) {
          const user = await User.findOne({
            email: resident.email,
            role: "resident",
          });

          if (user) {
            try {
              await Notification.create({
                userId: user._id,
                message: `Your payment of ₹${paymentAmount.toFixed(2)} has been recorded successfully. Payment method: ${paymentMethod}.`,
                type: "General",
              });
            } catch (notificationError) {
              console.error(
                "Payment notification failed:",
                notificationError.message
              );
            }
          }

          if (resident.email) {
            try {
              await sendEmail({
                to: resident.email,
                subject:
                  "Hostel Management System - Payment Confirmation",
                text: `Hello ${resident.name},

Your payment has been recorded successfully.

Amount Paid: ₹${paymentAmount.toFixed(2)}
Payment Method: ${paymentMethod}
Payment Date: ${new Date(
                  paymentDate || Date.now()
                ).toLocaleDateString()}
${
  installment
    ? `Installment: ${installment.installmentNumber}\n`
    : ""
}
Thank you,
Hostel Management System`,
              });
            } catch (emailError) {
              console.error(
                "Payment email failed:",
                emailError.message
              );
            }
          }
        }
      } catch (residentError) {
        console.error(
          "Payment follow-up notification error:",
          residentError.message
        );
      }

      return res.status(201).json({
        message: "Payment recorded successfully",
        payment,
        installment: getInstallmentResponse(installment),
      });
    } catch (error) {
      if (error.code === 11000 && idempotencyKey) {
        try {
          const existingPayment = await Payment.findOne({
            idempotencyKey,
          });

          if (existingPayment) {
            const sameRequest =
              String(existingPayment.billId) ===
                String(req.body?.billId || "") &&
              String(existingPayment.installmentId || "") ===
                String(req.body?.installmentId || "") &&
              Number(existingPayment.amount) ===
                Number(req.body?.amount) &&
              existingPayment.paymentMethod ===
                req.body?.paymentMethod;

            if (!sameRequest) {
              return res.status(409).json({
                message:
                  "This idempotency key has already been used for a different payment",
              });
            }

            const existingInstallment =
              existingPayment.installmentId
                ? await Installment.findById(
                    existingPayment.installmentId
                  )
                : null;

            return res.status(200).json({
              message: "Payment was already recorded",
              payment: existingPayment,
              installment: getInstallmentResponse(
                existingInstallment
              ),
            });
          }
        } catch (lookupError) {
          console.error(
            "Duplicate payment lookup failed:",
            lookupError.message
          );
        }
      }

      console.error("Payment error:", error);

      return res.status(500).json({
        message: "Payment was not completed successfully",
      });
    }
  }
);

// POST /api/payments/mock-checkout
// Resident-only simulated payment. No real money is processed.
router.post("/mock-checkout", authMiddleware, async (req, res) => {
  const rawKey = req.body?.idempotencyKey;
  const idempotencyKey =
    typeof rawKey === "string" ? rawKey.trim() : "";

  try {
    const { billId, installmentId, amount, outcome } = req.body || {};

    if (req.user.role !== "resident") {
      return res.status(403).json({
        message: "Only residents can use mock checkout",
      });
    }

    if (!idempotencyKey || idempotencyKey.length > 100) {
      return res.status(400).json({
        message: "A valid idempotency key is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        message: "Invalid bill ID",
      });
    }

    if (!["success", "failure"].includes(outcome)) {
      return res.status(400).json({
        message: "Choose success or failure for the simulation",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    // Verify the logged-in resident's identity.
    const user = await User.findById(req.user.id);

    if (!user || !user.email) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    const resident = await Resident.findOne({
      email: user.email,
    });

    if (!resident) {
      return res.status(404).json({
        message: "Resident profile not found",
      });
    }

    // Verify that this bill belongs to this resident.
    const bill = await Billing.findOne({
      _id: billId,
      residentId: resident._id,
    });

    if (!bill) {
      return res.status(404).json({
        message: "Bill not found for this resident",
      });
    }

    // Check for an existing request.
    const existingPayment = await Payment.findOne({
      idempotencyKey,
    });

    if (existingPayment) {
      const sameRequest =
        String(existingPayment.billId) === String(billId) &&
        String(existingPayment.installmentId || "") ===
          String(installmentId || "") &&
        Number(existingPayment.amount) === paymentAmount &&
        existingPayment.paymentMethod === "Mock Payment" &&
        existingPayment.status ===
          (outcome === "success" ? "Success" : "Failed");

      if (!sameRequest) {
        return res.status(409).json({
          message: "This payment request was already used",
        });
      }

      return res.status(200).json({
        message: "This simulation was already processed",
        payment: existingPayment,
      });
    }

    // Check the bill's installment plan.
    const planInstallments = await Installment.find({
      billId: bill._id,
    }).sort({ installmentNumber: 1 });

    let installment = null;

    if (planInstallments.length > 0 && !installmentId) {
      return res.status(400).json({
        message: "Please select an installment",
      });
    }

    if (installmentId) {
      if (!mongoose.Types.ObjectId.isValid(installmentId)) {
        return res.status(400).json({
          message: "Invalid installment ID",
        });
      }

      installment = await Installment.findOne({
        _id: installmentId,
        billId: bill._id,
      });

      if (!installment) {
        return res.status(404).json({
          message: "Installment not found",
        });
      }

      const installmentRemaining = Math.max(
        0,
        Number(installment.amount) -
          Number(installment.amountPaid || 0)
      );

      if (
        installmentRemaining <= MONEY_TOLERANCE ||
        paymentAmount > installmentRemaining + MONEY_TOLERANCE
      ) {
        return res.status(400).json({
          message: "Invalid installment payment amount",
        });
      }
    }

    const balance = await getCurrentBillTotal(bill);

    if (
      balance.remaining <= MONEY_TOLERANCE ||
      paymentAmount > balance.remaining + MONEY_TOLERANCE
    ) {
      return res.status(400).json({
        message: "Invalid payment amount for this bill",
      });
    }

    // Record the simulated result.
    const payment = await Payment.create({
      idempotencyKey,
      billId: bill._id,
      installmentId: installment ? installment._id : null,
      residentName: bill.residentName,
      amount: paymentAmount,
      paymentMethod: "Mock Payment",
      paymentDate: new Date(),
      transactionId: `MOCK-${Date.now()}`,
      notes: "Demo simulation only. No real money processed.",
      status: outcome === "success" ? "Success" : "Failed",
    });

    // Only successful simulations update the bill.
    if (outcome === "success") {
      if (installment) {
        installment.amountPaid = Math.min(
          Number(installment.amount),
          Number(installment.amountPaid || 0) + paymentAmount
        );

        installment.status =
          installment.amountPaid >=
          Number(installment.amount) - MONEY_TOLERANCE
            ? "Paid"
            : "Partially Paid";

        await installment.save();
      }

      const updatedBalance = await getCurrentBillTotal(bill);

      bill.paymentStatus =
        updatedBalance.remaining <= MONEY_TOLERANCE
          ? "Paid"
          : "Partially Paid";

      bill.total = updatedBalance.currentTotal;
      bill.lateFee = calculateCurrentLateFee(
        bill,
        updatedBalance.totalPaid
      );

      await bill.save();
    }

    return res.status(201).json({
      message:
        outcome === "success"
          ? "Mock payment successful"
          : "Mock payment failed. Your bill remains unpaid.",
      payment,
      installment: getInstallmentResponse(installment),
    });
  } catch (error) {
    console.error("Mock checkout error:", error);

    return res.status(500).json({
      message: "Mock payment could not be processed",
    });
  }
});
module.exports = router;