const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      required: true,
    },

    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    idempotencyKey: {
      type: String,
      default: undefined,
    },

    residentName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer",  "Mock Payment"],
      required: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    transactionId: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    // Payment processing status
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Success",
    },

    // Online payment gateway details
    gatewayOrderId: {
      type: String,
      default: "",
    },

    gatewayPaymentId: {
      type: String,
      default: "",
    },

    gatewaySignature: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent duplicate gateway payment IDs
paymentSchema.index(
  { gatewayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { gatewayPaymentId: { $type: "string", $gt: "" } },
  }
);

// Prevent duplicate requests when an idempotency key is supplied.
paymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
