const mongoose = require("mongoose");
const billingSchema = new mongoose.Schema(
  {
    residentName: {
      type: String,
      required: true,
    },

    roomNumber: {
      type: String,
      required: true,
    },

    roomFee: {
      type: Number,
      required: true,
      min: 0,
    },

    utilityFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    additionalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid"],
      default: "Pending",
    },

    dueDate: {
    type: Date,
    required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Billing = mongoose.model("Billing", billingSchema);
module.exports = Billing;