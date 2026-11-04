const mongoose = require("mongoose");

const installmentSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      required: true,
      index: true,
    },

    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resident",
      required: true,
    },

    installmentNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Partially Paid", "Paid", "Overdue"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

installmentSchema.index(
  { billId: 1, installmentNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Installment", installmentSchema);
